import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ACOPIOVE_ATTRIBUTION,
  derivePlace,
  fetchAcopioCentros,
  mapCentro,
  type AcopioCentro,
  type AcopioTipo,
  type MappedLocation,
  type MappedRefugio,
} from "@/lib/acopiove";

// Pull importer: AcopioVE /centros?tipo=refugio  → upsert `locations`(type=shelter)
//                AcopioVE /centros?tipo=acopio&pais=Venezuela → `locations`(type=donation_centre)
// Both write their needs into the shared `refugios` companion table, keyed + de-duped by
// external_id (the AcopioVE UUID). FRESHEST-WINS by `updated_at`: a row is only
// overwritten when AcopioVE's data is newer than the copy we hold — so a HelpMap staff
// edit (which stamps a newer updated_at, see saveCenter) is never clobbered by a sync.
//
// Runs server-only with service_role (CLAUDE.md §12 exception, same class as volunteers)
// because a scheduled cron has no user session. Triggered by Vercel Cron (vercel.json).
// Protect it with CRON_SECRET so it isn't a public write trigger.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // unset (local/dev) → allow
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runSync() {
  const admin = createAdminClient();

  // Refugios (established, all countries) + acopios (Venezuela only, newer endpoint). The
  // acopio pull is isolated in a try/catch so a hiccup on the newer endpoint can never
  // break the proven refugio sync; each item carries its `tipo` so mapCentro produces the
  // right location type (shelter vs donation_centre) + id prefix.
  const refugios = await fetchAcopioCentros({ tipo: "refugio" });
  let acopios: AcopioCentro[] = [];
  let acopioError: string | null = null;
  try {
    acopios = await fetchAcopioCentros({ tipo: "acopio", pais: "Venezuela" });
  } catch (e) {
    acopioError = e instanceof Error ? e.message : "unknown";
  }
  const items: Array<{ it: AcopioCentro; tipo: AcopioTipo }> = [
    ...refugios.map((it) => ({ it, tipo: "refugio" as const })),
    ...acopios.map((it) => ({ it, tipo: "acopio" as const })),
  ];

  // Existing refugios keyed by external_id, plus every used location_id (to mint unique
  // ids for genuinely-new refugios without colliding).
  const { data: existing, error: exErr } = await admin
    .from("refugios")
    .select("location_id, external_id, updated_at");
  if (exErr) throw new Error("refugios_read: " + exErr.message);
  const byExt = new Map<string, { location_id: string; updated_at: string | null }>();
  const usedIds = new Set<string>();
  for (const r of existing ?? []) {
    if (r.external_id) byExt.set(r.external_id, { location_id: r.location_id, updated_at: r.updated_at });
    usedIds.add(r.location_id);
  }

  const locUpserts: MappedLocation[] = [];
  const refUpserts: MappedRefugio[] = [];
  // Centers whose location row actually changed (insert or fresh update) — mirrored to
  // n8n after the DB write so the intake LISTS dropdown + dedup alias/loc maps stay in
  // sync with AcopioVE (CLAUDE.md §13 feedback loop, same contract as /api/centers).
  const notify: Array<{ center: MappedLocation; action: "created" | "updated" }> = [];
  let inserted = 0,
    updated = 0,
    skipped = 0,
    outOfScope = 0; // acopios we couldn't place in a supported corridor state (§13)

  for (const { it, tipo } of items) {
    if (!it.id || typeof it.lat !== "number" || typeof it.lng !== "number") {
      skipped++;
      continue;
    }
    // `locations.state` is the `vzla_state` enum. Since the nationwide expansion it holds
    // all 24 states (db/states.sql), and derivePlace resolves ~all AcopioVE acopios to
    // one — but a handful with only an ambiguous bare town name (Libertad, Independencia…)
    // can't be placed. Skip those rather than feed the enum a bad value (which would 22P02
    // the whole batch); the count is reported so an admin can add them by hand.
    if (tipo === "acopio" && !derivePlace(it).confident) {
      outOfScope++;
      continue;
    }
    const ex = byExt.get(it.id);
    const src = it.updated_at ? Date.parse(it.updated_at) : 0;
    if (ex) {
      const cur = ex.updated_at ? Date.parse(ex.updated_at) : 0;
      if (src <= cur) {
        skipped++; // freshest-wins: our copy is same or newer (likely a local staff edit)
        continue;
      }
      const m = mapCentro(it, ex.location_id, tipo);
      locUpserts.push(m.location);
      refUpserts.push(m.refugio);
      notify.push({ center: m.location, action: "updated" });
      updated++;
    } else {
      const base = mapCentro(it, undefined, tipo).location.location_id;
      let id = base,
        n = 2;
      while (usedIds.has(id)) id = `${base}_${n++}`;
      usedIds.add(id);
      const m = mapCentro(it, id, tipo);
      locUpserts.push(m.location);
      refUpserts.push(m.refugio);
      notify.push({ center: m.location, action: "created" });
      inserted++;
    }
  }

  if (locUpserts.length) {
    // locations first (refugios FK-references it). aliases is intentionally omitted so a
    // sync never wipes staff-curated aliases on an existing row (relies on its DB default
    // for new inserts).
    const { error: e1 } = await admin.from("locations").upsert(locUpserts, { onConflict: "location_id" });
    if (e1) throw new Error("locations_upsert: " + e1.message);
    const { error: e2 } = await admin.from("refugios").upsert(refUpserts, { onConflict: "location_id" });
    if (e2) throw new Error("refugios_upsert: " + e2.message);
  }

  const notified = await notifyCenters(notify);

  return {
    fetched: items.length,
    refugios: refugios.length,
    acopios: acopios.length,
    acopioOutOfScope: outOfScope, // acopios dropped for being outside the 7 supported states
    acopioError, // non-null if the acopio pull failed but refugios still synced
    inserted,
    updated,
    skipped,
    notified,
  };
}

// Mirror the changed centers to the n8n centers webhook (LISTS dropdown + dedup alias/loc
// maps). Best-effort: a webhook failure NEVER fails the sync — the Supabase write already
// landed. Sent in small serial batches so a big first sync doesn't burst the workflow.
// Awaited (not fire-and-forget) so the requests complete before the serverless fn returns.
async function notifyCenters(
  notify: Array<{ center: MappedLocation; action: "created" | "updated" }>,
): Promise<number> {
  const webhook = process.env.N8N_CENTERS_WEBHOOK_URL;
  if (!webhook || !notify.length) return 0;

  const now = new Date().toISOString();
  const BATCH = 5;
  let ok = 0;
  for (let i = 0; i < notify.length; i += BATCH) {
    const slice = notify.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      slice.map(({ center, action }) =>
        fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "center_upsert",
            action, // created | updated (sync never deletes)
            center,
            updated_by: "acopiove_sync",
            received_at: now,
            source: "acopiove_sync",
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
        }),
      ),
    );
    ok += results.filter((r) => r.status === "fulfilled").length;
  }
  return ok;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    createAdminClient();
  } catch {
    return NextResponse.json({ error: "service_role_not_configured" }, { status: 503 });
  }
  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result, attribution: ACOPIOVE_ATTRIBUTION });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    const upstream = msg.startsWith("acopiove");
    return NextResponse.json({ error: upstream ? "acopiove_unreachable" : "sync_failed", detail: msg }, {
      status: upstream ? 502 : 500,
    });
  }
}

// Vercel Cron issues a GET; allow POST for manual triggering too.
export const GET = handle;
export const POST = handle;
