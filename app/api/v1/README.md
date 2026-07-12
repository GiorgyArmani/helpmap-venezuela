# HelpMap public API — v1

Read-only API over our **verified** records, so other humanitarian apps can consume and
help centralize confirmed data. Reads the privacy-filtered `patients_public` view; never the
base table. Only `verified = true` rows are returned.

> **Privacy:** this is a BULK surface, handled more conservatively than the in-app one-at-a-time
> UI. Photos are excluded by default; minors are protected (no CI/photo); home origin (`procedencia`)
> and medical service (`servicio`) are never exposed. The **raw cédula is never emitted** — it is
> replaced by an opaque `person_hash` (see below). See `patients/route.ts` for the team-tunable
> switches (`INCLUDE_PHOTOS`, `EXCLUDE_DECEASED`). Widening any of these is a team decision (CLAUDE.md §2).

### `person_hash` — cross-app identity matching without exposing the cédula

Instead of the cédula, each documented adult carries an opaque `person_hash`: a peppered HMAC of
the national ID. Two apps that hold the **same secret pepper** derive the **same hash** for the same
person, so they can dedup/centralize confirmed records across systems — **without** either app
publishing (or being able to reconstruct) the raw identity.

**Threat model:** the goal is to stop a scraper from harvesting the **bulk** dataset (name + cédula +
location, thousands of rows) to resell or abuse it. Single-person lookup is *deliberately kept*: a
user who already knows a cédula can still search it via `q` (see below) to find their relative — the
hash protects the aggregate, not the one-at-a-time humanitarian search.

- **Contract:** `HMAC-SHA256(IDENTITY_PEPPER, bare_ascii_digits_of_cedula)`, hex, first 16 chars.
- `null` for minors, undocumented people, and whenever `IDENTITY_PEPPER` is unset (the feature is
  off → no hash, and never a weak unsalted digest).
- **Why HMAC + a secret pepper, not a plain hash:** a Venezuelan cédula is low-entropy (≤~31M
  values) — a bare `sha256(cedula)` is brute-forceable in milliseconds. The secret pepper (shared
  only with trusted partner apps, out-of-band) makes the digest irreversible to anyone without it.
- To match against us, a partner must use the identical normalization + the shared pepper. Ask the
  team for the pepper; it is never transmitted in a payload.

## `GET /api/v1/patients`

Query params (all optional):

| Param | Description |
|---|---|
| `state` | Filter by state enum (`distrito_capital`, `la_guaira`, `miranda`, `yaracuy`, `falcon`, `carabobo`, `aragua`). |
| `location_id` | Filter by center id (e.g. `hosp_luciani`). |
| `estatus` | `INGRESADO` \| `ALTA` \| `FALLECIDO`. |
| `q` | Free-text search across first names, surnames and CI. |
| `limit` | Page size (default 100, max 500). |
| `offset` | Pagination offset (default 0). |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "apellidos": "…",
      "nombres": "…",
      "person_hash": "a3f9c2b7e1d0486f",
      "is_minor": false,
      "edad": 34,
      "sexo": "M",
      "location_id": "hosp_luciani",
      "location_name": "Hospital Dr. Domingo Luciani",
      "location_type": "hospital",
      "municipality": "Sucre",
      "state": "distrito_capital",
      "lat": 10.49,
      "lng": -66.79,
      "estatus": "INGRESADO",
      "verified": true,
      "updated_at": "2026-06-29T12:00:00Z"
    }
  ],
  "count": 1234,
  "limit": 100,
  "offset": 0,
  "next": "/api/v1/patients?limit=100&offset=100",
  "generated_at": "2026-06-29T12:01:00Z"
}
```

- `count` is the total matching rows; page using `next` (or `offset`).
- `CORS` is open for `GET` (browser apps can fetch directly).
- `Cache-Control` allows ~60s shared caching; data syncs from source every ~5 min.

### Open, but rate-limited

Intentionally **open** (no API key) so it's trivial to consume and centralize. Guarded by a
per-IP rate limit (default **60 req/min**, `lib/rateLimit.ts`) so a scraper can't melt the
server. On `429` you get `Retry-After` + `X-RateLimit-*` headers. The limiter is in-memory —
fine for the single-container VPS deploy; move to a shared store (Upstash) if it ever runs on
serverless / multiple replicas.

## Terms (recommended, to finalize with the team)

Humanitarian / reunification use only. Attribute "HelpMap VE". Do **not** use the data to
re-identify, contact, profile, or target individuals, nor to publish casualty counts.

## Still pending
- Whether to expose photos / deceased in bulk (team switches `INCLUDE_PHOTOS` / `EXCLUDE_DECEASED`).
- Set `IDENTITY_PEPPER` (prod + share out-of-band with AcopioVE) to activate `person_hash` matching,
  and agree the normalization contract with partners.
- Finalize terms of use.

**Decided (do not "fix"):** `q` intentionally still matches the CI server-side so a user who knows a
cédula can find their relative (single-person lookup is a core humanitarian feature). The cédula is
no longer *returned* in bulk; `person_hash` defends the aggregate dataset against scraping/resale.
That single lookups stay possible is by design, not a leak.
