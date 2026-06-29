# HelpMap public API — v1

Read-only API over our **verified** records, so other humanitarian apps can consume and
help centralize confirmed data. Reads the privacy-filtered `patients_public` view; never the
base table. Only `verified = true` rows are returned.

> **Privacy:** this is a BULK surface, handled more conservatively than the in-app one-at-a-time
> UI. Photos are excluded by default; minors are protected (no CI/photo); home origin (`procedencia`)
> and medical service (`servicio`) are never exposed. See `patients/route.ts` for the team-tunable
> switches (`INCLUDE_PHOTOS`, `EXCLUDE_DECEASED`). Widening any of these is a team decision (CLAUDE.md §2).

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
      "ci_display": "V-12.345.678",
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
- Finalize terms of use.
