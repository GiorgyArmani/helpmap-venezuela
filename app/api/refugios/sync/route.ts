import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ACOPIOVE_ATTRIBUTION,
  fetchAcopioRefugios,
  mapCentro,
  type MappedLocation,
  type MappedRefugio,
} from "@/lib/acopiove";

// Pull importer: AcopioVE /centros?tipo=refugio → upsert `locations` + `refugios` by
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
  const items = await fetchAcopioRefugios();

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
  let inserted = 0,
    updated = 0,
    skipped = 0;

  for (const it of items) {
    if (!it.id || typeof it.lat !== "number" || typeof it.lng !== "number") {
      skipped++;
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
      const m = mapCentro(it, ex.location_id);
      locUpserts.push(m.location);
      refUpserts.push(m.refugio);
      updated++;
    } else {
      const base = mapCentro(it).location.location_id;
      let id = base,
        n = 2;
      while (usedIds.has(id)) id = `${base}_${n++}`;
      usedIds.add(id);
      const m = mapCentro(it, id);
      locUpserts.push(m.location);
      refUpserts.push(m.refugio);
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

  return { fetched: items.length, inserted, updated, skipped };
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
