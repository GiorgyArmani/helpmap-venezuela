import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { protectMinor, STATE_LABEL, type PatientPublic } from "@/components/helpmap/data";
import { clientIp, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";

// Public, READ-ONLY API for VERIFIED records — so other humanitarian apps can consume
// and centralize our confirmed lists. It reads the privacy-filtered `patients_public`
// VIEW (never the base table) and returns ONLY verified rows (CLAUDE.md §2/§8).
//
// PRIVACY (this is a BULK surface — handle with more care than the one-at-a-time app UI):
//   • Only `verified = true` rows. Never procedencia/servicio (the view already strips them).
//   • Photos are EXCLUDED from the API payload by default — a bulk feed of faces is a
//     re-identification/abuse vector. Flip INCLUDE_PHOTOS only if the team decides to.
//   • Minors are re-protected server-side (protectMinor) on top of the view (defense in depth).
//   • FALLECIDO rows are included (already public in-app when verified) but flagged here so the
//     team can revisit — a casualty-count export is sensitive (§13). Set EXCLUDE_DECEASED to drop.
//   • The raw cédula is NEVER emitted in bulk. `ci_display` is dropped and replaced by an opaque
//     `person_hash` (HMAC — see personHash below) so partner apps can dedup/match the same person
//     across systems WITHOUT anyone reconstructing the identity. Set IDENTITY_PEPPER to enable it.
//
// Versioned (/api/v1) so the contract is stable for consumers. CORS-open GET. CDN-cacheable.
// Open (no API key) but per-IP rate-limited (lib/rateLimit) so a scraper can't melt the server;
// the cache headers below add CDN absorption for repeated identical queries.

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // query params drive the response; don't statically cache at build

// --- Team-tunable privacy switches (see header) ---
const INCLUDE_PHOTOS = false;
const EXCLUDE_DECEASED = false;

// Shared secret ("pepper") for the cross-app identity hash. Coordinated OUT-OF-BAND with
// trusted partner apps (e.g. AcopioVE) and set only server-side — never in the client
// bundle, never in a payload. A Venezuelan cédula is low-entropy (≤~31M values), so a bare
// hash is brute-forceable in milliseconds; HMAC with a secret pepper makes the digest
// irreversible to anyone without it, while two apps holding the SAME pepper derive an
// identical hash for the same person → they can match/dedup without exchanging raw cédulas.
const IDENTITY_PEPPER = process.env.IDENTITY_PEPPER || "";

// Opaque, stable, cross-app person key. Normalization contract (must match partners):
// bare ASCII digits of the cédula → HMAC-SHA256(pepper) → first 16 hex chars (64 bits,
// collision-safe at this scale). Returns null for minors, undocumented people, or when the
// pepper is unset — so we NEVER emit a weak/unsalted digest or leak a raw digit.
function personHash(ciDisplay: string | null, isMinor: boolean): string | null {
  if (!IDENTITY_PEPPER || isMinor) return null;
  const digits = (ciDisplay || "").replace(/\D/g, "");
  if (digits.length < 5) return null; // "MENOR" / "sin documento" / "—" / junk → no identity
  return createHmac("sha256", IDENTITY_PEPPER).update(digits).digest("hex").slice(0, 16);
}

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;
// Per-IP budget so a scraper can't melt the server. CDN caching (below) absorbs repeated
// identical queries, so this only really bites uncached/varied request floods.
const RATE_LIMIT = 60; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const VALID_ESTATUS = new Set(["INGRESADO", "ALTA", "FALLECIDO"]);
// `state` is a Postgres enum — an unknown value makes the query ERROR (502) instead of
// returning empty, so validate against the known states and ignore anything else.
const VALID_STATES = new Set(Object.keys(STATE_LABEL));

// Explicit column contract — never `select("*")`, so the public shape can't drift.
const COLUMNS = [
  "id",
  "apellidos",
  "nombres",
  "ci_display",
  "is_minor",
  "edad",
  "sexo",
  "location_id",
  "location_name",
  "location_type",
  "municipality",
  "state",
  "lat",
  "lng",
  "estatus",
  "verified",
  "updated_at",
].join(",");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  // Rate limit per client IP before doing any work (CLAUDE.md §11 — open but guarded).
  const rl = rateLimit(`v1:patients:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { ...CORS, ...rateLimitHeaders(rl), "Retry-After": String(rl.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const p = url.searchParams;

  // Pagination
  const limit = Math.min(Math.max(parseInt(p.get("limit") || "") || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(p.get("offset") || "") || 0, 0);

  // Filters
  const stateRaw = p.get("state")?.trim() || null;
  const state = stateRaw && VALID_STATES.has(stateRaw) ? stateRaw : null;
  const locationId = p.get("location_id")?.trim() || null;
  const estatusRaw = p.get("estatus")?.trim().toUpperCase() || null;
  const estatus = estatusRaw && VALID_ESTATUS.has(estatusRaw) ? estatusRaw : null;
  // Free-text search across name + CI. Sanitize to letters/digits/space to keep the
  // PostgREST `or` filter injection-safe.
  const q = (p.get("q") || "").replace(/[^\p{L}\p{N}\s]/gu, "").trim().slice(0, 60);

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    let query = supabase
      .from("patients_public")
      .select(COLUMNS, { count: "exact" })
      .eq("verified", true) // ONLY verified rows reach this API (§8)
      .order("updated_at", { ascending: false });

    if (EXCLUDE_DECEASED) query = query.neq("estatus", "FALLECIDO");
    if (state) query = query.eq("state", state);
    if (locationId) query = query.eq("location_id", locationId);
    if (estatus) query = query.eq("estatus", estatus);
    if (q) query = query.or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%,ci_display.ilike.%${q}%`);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: "query_failed" }, { status: 502, headers: CORS });
    }

    // Defense in depth: re-protect minors, replace the raw cédula with an opaque cross-app
    // person_hash (never emit ci_display in bulk), then drop the photo unless enabled.
    const rows = ((data ?? []) as unknown as PatientPublic[]).map((r) => {
      const safe = protectMinor(r);
      const { foto_url, ci_display, ...rest } = safe;
      const out = { ...rest, person_hash: personHash(ci_display, safe.is_minor) };
      return INCLUDE_PHOTOS ? { ...out, foto_url } : out;
    });

    const total = count ?? rows.length;
    const nextOffset = offset + rows.length;
    const next = nextOffset < total ? `${url.pathname}?${withOffset(p, nextOffset)}` : null;

    return NextResponse.json(
      {
        data: rows,
        count: total,
        limit,
        offset,
        next,
        generated_at: new Date().toISOString(),
      },
      {
        headers: {
          ...CORS,
          ...rateLimitHeaders(rl),
          // CDN/shared-cache for 60s, serve-stale while revalidating — data syncs ~5 min.
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: CORS });
  }
}

// Rebuild the query string with a new offset, preserving the caller's filters.
function withOffset(params: URLSearchParams, offset: number): string {
  const next = new URLSearchParams(params);
  next.set("offset", String(offset));
  return next.toString();
}
