@AGENTS.md
# CLAUDE.md — Mapa de Emergencia Sísmica (Imágenes Nacionales / Tropical Sadness Crew)

Context document for building the web app. Read this fully before writing code. The
data model, privacy rules, and architecture below are **locked decisions** — do not
redesign them. Ask before deviating.

---

## 1. What this is

A mobile-first web dashboard to help Venezuelans find loved ones admitted to hospitals
or sheltered after the June 2026 earthquake affecting **Caracas (Distrito Capital),
La Guaira, and Miranda**. People tap a location on a map, see who is there, search by
name/CI, and find who to contact. Built by a volunteer crew (Imágenes Nacionales /
Tropical Sadness) doing OSINT-style data aggregation.

Primary users are stressed people on phones, often on poor/intermittent connections,
reaching the app via links shared on **WhatsApp, Instagram, and Telegram**. Those three
apps are the main information channels in Venezuela. Design for that reality.

### The three product pillars
1. **Easy mobile UI** that explores the map by state → municipality → location, shows
   patients at a tapped location with search/filter, has an "upload info" form, and is
   trivially **shareable into WhatsApp/Instagram/Telegram** (link-preview cards matter).
2. **OSINT data flow** — data comes from a big aggregated DB plus field volunteers,
   doctors, nurses, CSV imports, and (later) SMS. People must be able to **re-share**
   individual records to spread reach.
3. **Admin/safety backend** — controlled add/edit/delete, protection against bad actors
   injecting false data.

---

## 2. Sensitivity — read before anything else

This is a database of **identified people during a disaster** (names, photos, cédula,
location, health status). It enables reunification but could also enable fraud,
extortion, or targeting. These rules are non-negotiable and several are already enforced
at the database layer:

- **Public vs. private fields.** The public API/app may ONLY show: apellidos, nombres,
  CI for adults (minors show the literal "MENOR"), age, sexo, location (name/type/
  municipality/state/coords), estatus, photo (adults + verified only), verified badge.
- **NEVER expose** `procedencia` (home neighborhood) or `servicio` (medical service/ward)
  to the public. They are admin-only. Home origin + name + photo = a targeting vector.
- **Minors:** never a CI (always "MENOR"), never a photo. Enforced by a DB trigger; do
  not try to display a minor photo even if a value somehow appears.
- **`FALLECIDO` (deceased) status is sensitive.** Only published once `verified = true`.
  Treat it with care in the UI (no alarmist styling; respectful).
- The app reads from a **public Postgres VIEW (`patients_public`)** that already strips
  the sensitive fields. Query that view, never the base `patients` table, from the client.

If a request would widen what's publicly visible, stop and confirm with the team.

---

## 3. Architecture (locked)

```
Google Sheets (3 files: INTAKE → CLEANUP → SOURCE OF TRUTH)
      │  n8n workflows (dedup, verification gate, sync)
      ▼
Supabase / Postgres  ── source of truth for the app
      │  (anon key, reads patients_public view only)
      ▼
Web app  ── this repo
```

- **Backend / DB:** Supabase (Postgres). Already live and seeded. The app uses the
  **anon key** and reads the `patients_public` view + `locations` table. Writes from the
  pipeline happen via n8n with the service_role key — NOT from this app. (The public
  upload form writes to Google Sheets INTAKE, not directly to the DB — see §7.)
- **Data freshness:** n8n upserts SOURCE → Supabase every 5 min. The app should also be
  resilient to stale/offline reads (see §6 offline).
- **Stack:** Next.js (React, App Router) for SSR — SSR is REQUIRED for the share
  link-preview cards (§5). Map via **Leaflet + OpenStreetMap** (no API key needed).
  Supabase JS client for data. Spanish-language UI throughout.
- **Hosting:** Dokploy on a Google VPS (containerized Next.js). A cPanel host exists as
  fallback. Domain being finalized.
- A minimal map UI mockup already exists (made in Claude Design) — match its spirit:
  clean, minimal, mobile-first.

---

## 4. Data model

### `locations` table (11 rows, seeded, stable)
`location_id` (text PK), `canonical_name`, `type` (`hospital|shelter|morgue|donation_centre`),
`municipality`, `state` (`distrito_capital|la_guaira|miranda`), `lat`, `lng`,
`contact_phone`, `contact_whatsapp`, `aliases[]`, `active`.

The 11 seeded locations (id → name → state):
- hosp_luciani → Hospital Dr. Domingo Luciani → distrito_capital
- shelter_los_cocos → Refugio Campo de Golf Playa Los Cocos → la_guaira (**type=shelter**)
- hosp_perez_carreno → Hospital Dr. Miguel Pérez Carreño → distrito_capital
- hosp_vargas_caracas → Hospital Vargas de Caracas → distrito_capital
- hosp_jm_vargas_guaira → Hospital Dr. José María Vargas (La Guaira) → la_guaira
- hosp_huc → Hospital Universitario de Caracas → distrito_capital
- hosp_catia → Hospital del Oeste Dr. José Gregorio Hernández → distrito_capital
- hosp_jm_de_los_rios → Hospital de Niños J.M. de los Ríos → distrito_capital
- hosp_baquero_gonzalez → Hospital Dr. Ricardo Baquero González (Periférico de Catia) → distrito_capital
- hosp_victorino_santaella → Hospital Victorino Santaella → miranda
- hosp_ciudad_caribia → Hospital Ciudad Caribia → la_guaira

NOTE: two distinct Vargas hospitals exist (Vargas de Caracas vs. JM Vargas La Guaira) —
never conflate them. `type` drives the map legend; `morgue` and `donation_centre` are
planned future types, design the legend to accommodate them.

### `patients_public` VIEW (what the app reads — already privacy-filtered)
`id` (uuid), `apellidos`, `nombres`, `ci_display` (CI for adults, "MENOR" for minors),
`is_minor` (bool), `edad` (int), `sexo` (`M|F|null`), `location_id`, `location_name`,
`location_type`, `municipality`, `state`, `lat`, `lng`, `estatus`
(`INGRESADO|ALTA|FALLECIDO`), `foto_url` (null unless verified adult), `verified` (bool),
`updated_at`.

The view already enforces: no procedencia, no servicio, minor photos nulled, unverified
photos nulled. Trust the view — don't re-implement these filters, but don't bypass them
either.

### Stable identity key
`person_key` = CI when present, else a hash of name+age+location. Used for upserts so a
status change updates the existing record instead of creating a duplicate pin. The app
generally keys off `id` (uuid) for routing; `person_key` is pipeline-internal.

---

## 5. Sharing (a core feature, not an afterthought)

Reach depends on people re-sharing records into WhatsApp/Instagram/Telegram.

- **Per-location and per-patient pages must have unique, shareable URLs** with proper
  Open Graph + Twitter Card meta tags (title, description, image) so pasting the link in
  WhatsApp/Telegram/IG auto-renders a preview card. This is the #1 reason the app is SSR.
- The OG image for a patient card should respect privacy: only an adult+verified photo
  may appear; minors/unverified use a neutral placeholder card. Never leak a minor photo
  via an OG image.
- Provide explicit "Compartir" actions: WhatsApp (`https://wa.me/?text=`), Telegram
  (`https://t.me/share/url?url=`), and copy-link. Instagram has no URL share intent — use
  copy-link / "share to story" guidance instead.
- Contact actions: when a location has `contact_whatsapp`/`contact_phone`, surface
  tap-to-WhatsApp / tap-to-call buttons.

---

## 6. Mobile + offline constraints (Venezuela connectivity)

- **Mobile-first, low-bandwidth.** Assume slow/flaky 3G and frequent disconnects.
- **Async cache / offline resilience:** the team specifically wants data cached so the
  page still shows the last-loaded data if the connection drops. Cache the locations list
  and recently viewed location/patient data (e.g. SWR/React Query with persistence, or a
  service worker / IndexedDB layer). Show a clear "datos posiblemente desactualizados"
  indicator with `updated_at` when serving cached data.
- Lazy-load patient lists per location; don't fetch all patients up front. Hundreds to
  thousands of records exist.
- Keep images light; lazy-load photos; placeholder first.

---

## 7. Upload form (public intake)

- The public "Subir información" form collects: foto (adults only), nombre, apellido,
  edad, CI (or "MENOR"), ubicación, estatus, and optional contact.
- **It does NOT write to Supabase directly.** It feeds the Google Sheets INTAKE file
  (stage 1, raw) — via an n8n webhook or the Sheets API — where it is later normalized,
  deduplicated, and human-verified before ever reaching the public DB. The app should
  treat submission as "received for review," not "published."
- Enforce the privacy rules client-side too: if minor, disable/clear CI (set "MENOR") and
  disable photo upload.
- Show clear copy that submissions are reviewed by the team + medical contacts before
  appearing.

---

## 8. Verification stages (how data flows; affects UI display)

Three stages exist in the pipeline:
1. **Intake (raw)** — never shown publicly.
2. **Cleanup (normalized, not yet verified)** — internal review surface.
3. **Source of truth (verified)** — only verified rows reach Supabase.

Every record the app sees is at least promoted to the DB. The `verified` boolean drives
the **green verified badge**. Verification is slow and manual, so expect a mix of
verified and not-yet-verified records; design the badge to be clearly present/absent, and
never imply unverified data is confirmed.

---

## 9. Admin backend (phase 2, plan for it)

- Gated, role-based (admin vs. verifier). Add/edit/delete locations and patients, with an
  **audit log** (who changed what, when) — trust matters in an emergency.
- Bad-actor resistance: the public form is review-gated (never direct to DB); admin
  actions require auth. Don't expose any write path to the public app.
- Admin views MAY show the sensitive fields (procedencia, servicio) since they operate on
  the base table with proper auth — but that is a separate, authenticated surface, not the
  public app.

---

## 10. Build order (suggested)

1. Locations map (Leaflet) reading `locations`; legend by `type`; filter by state →
   municipality.
2. Location detail: tap a pin → list patients at that location (search by name/CI, filter
   by estatus/age), reading `patients_public`.
3. Per-patient page + per-location page with SSR OG/Twitter meta + share actions.
4. Public upload form → INTAKE (via n8n webhook).
5. Offline/async caching layer + "stale data" indicator.
6. (Phase 2) Authenticated admin backend with audit log.

---

## 11. Conventions & guardrails

- **Language:** all user-facing text in Spanish (Venezuelan). Code/comments in English ok.
- **Never** query the base `patients` table from the client; use `patients_public`.
- **Never** render `procedencia` or `servicio` in the public app.
- **Never** show a photo for a minor or an unverified record (the view nulls these — keep
  it that way; don't add a fallback that reintroduces them).
- Keep secrets server-side. The client uses the Supabase **anon** key only. The
  service_role key must never appear in this app.
- Respectful, calm UI tone — people using this are frightened and looking for family.
- Don't add analytics/trackers that leak who is searching for whom. Searches are sensitive.

---

## 12. Environment

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (read-only via RLS + view)
- `N8N_UPLOAD_WEBHOOK_URL` — server-side; where the upload form posts (to INTAKE)
- service_role key is NOT used by this app.

When unsure about a privacy or data-model question, prefer the more restrictive option and
flag it for the team rather than guessing.

---

## 13. Adding locations / expanding scope (roadmap)

Locations are not ordinary data — they are the **join target for everything**. A patient's
`location_id` is a foreign key into `locations`; the map pins, the intake dropdown, and the
n8n dedup alias map all depend on it. Adding a location therefore touches **four places**,
and they must not drift out of sync (drift → orphaned patients with a `location_id` that has
no pin, or a flood of `UBICACION_NO_CANONICA` flags in intake).

### The four places to update when adding a hospital/shelter/etc.
1. **Supabase `locations` table** — INSERT the row (location_id, canonical_name, type, state,
   municipality, lat, lng, aliases[], contacts). Geocode lat/lng carefully and **verify the
   pin** — a wrong pin sends frightened families to the wrong place.
2. **Intake dropdown (Google Sheets LISTS tab)** — add the canonical name so volunteers can
   select it.
3. **n8n dedup maps** — add the raw aliases → canonical name (`ALIAS`) and canonical name →
   id (`LOC_ID`) so incoming messy strings resolve instead of flagging.
4. **(implicit) the map legend** — already handles all 4 types; no change needed unless a
   brand-new type appears.

### Phased approach (locations stay semi-manual on purpose)
Locations change rarely (tens over weeks, not hundreds/day) and each needs human curation
(canonical name, verified coordinates, type). A **basic admin backend doing curated
locations is the correct fit**, not a limitation. Do NOT build a high-volume location CRUD
early.

- **Phase 0 (now):** adding a location = 3 manual edits (DB insert + LISTS dropdown + n8n
  maps). Keep a short runbook so any of the 4 core members can do it. Fine for current pace.
- **Phase 1 (target): minimal gated admin form** — name, type, state, municipality, lat/lng,
  contacts → does the Supabase insert + writes an **audit-log row**. Does NOT auto-sync the
  Sheets dropdown or n8n maps; instead shows a reminder checklist of the manual steps. The
  admin backend's FIRST real feature should be this location form (locations are
  lower-volume, higher-stakes than patient edits).
- **Phase 2 (later, only if churn justifies):** make `locations` the single source and derive
  the rest. Intake dropdown pulls from the DB; the n8n dedup reads its alias map from the
  `locations.aliases[]` column instead of a hardcoded JS object. End state: add a location in
  one place, everything else follows.

### Why Phase 2 is cheap later (design already supports it)
`locations.aliases[]` already exists in the schema. The n8n dedup currently uses a hardcoded
`ALIAS`/`LOC_ID` object, but the same aliases live in the DB. Migration = change the dedup
Code node to fetch aliases from Supabase at the start of a run instead of using the inline
object. One node change makes locations fully DB-driven. Build the hardcoded version now;
the upgrade is a small, well-defined swap.

### Adding a whole NEW STATE (e.g. Yaracuy, Aragua/Maracay) — bigger than adding a location
Adding a hospital *within* an existing state (Distrito Capital / La Guaira / Miranda) is just
the four-places flow above. Adding a **new state** is a schema change, because `state` is a
Postgres ENUM (`vzla_state`), locked to 3 values on purpose (prevents typo fragmentation like
"Edo. Miranda"). You cannot insert a location in a new state until the enum accepts it.

Five-step flow for a new state:
1. **Alter the enum FIRST:** `ALTER TYPE vzla_state ADD VALUE 'yaracuy';` (and `'aragua'` for
   Maracay). Run as its own statement, before any location insert referencing it.
2–5. Then the normal four-places flow (DB insert, intake LISTS dropdown, n8n alias/loc maps,
   legend — legend already handles types, not states).

Three extra things a new state touches that a new-hospital-in-existing-state does not:
- **State filter UI:** the map's top-level state filter should read distinct states **from the
  locations data**, not hardcode 3 buttons — then new states appear automatically. Build it
  data-driven now; cheap then, painful to retrofit.
- **Map viewport:** default center/zoom is set for the Caracas/La Guaira/Miranda cluster.
  Yaracuy (~3h west) / Aragua (between) fall outside it. Selecting a distant state must
  re-center/zoom the map, or the user sees an empty Caracas view. Make the state filter drive
  the viewport.
- **Scope decision is deliberate, not automatic:** coverage from outer states is thin, and
  thin data on a map reads as "no one was affected here" — worse than not showing the state.
  Expanding to a new state should be a conscious "we now have enough useful data" call. The
  enum barrier helpfully forces this to be intentional rather than triggered by one stray row.

### Type-specific behavior the UI must respect (important as scope grows)
- **Shelters:** messier, vaguer names ("refugio de la escuela X"); expect more
  `UBICACION_NO_CANONICA` flags; budget for canonicalizing shelter names as they appear.
- **Morgues:** carry FALLECIDO sensitivity — apply the respectful-styling and verified-only
  rules doubly. A morgue pin must NOT become a casualty count people screenshot.
- **Donation centres:** the one type with **no patients** — informational pins only. The
  map/patient-list code MUST handle "a location with zero patient records" gracefully: show
  contact / what's-needed info, NOT an empty patient search. Do not assume every pin has a
  patient list.