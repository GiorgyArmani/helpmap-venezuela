// AcopioVE API client + mapping (server-usable; no server-only deps so it can be
// imported by any route). AcopioVE (acopiove.org) is the upstream source of truth for
// refugios; HelpMap syncs them in (pull) and can suggest updates back (push).
//
// Live contract (https://api.acopiove.org/v1, verified July 2026):
//   GET  /centros?tipo=refugio&format=json&limit&offset&updatedSince  → { data:[…], total, limit, offset, meta }
//   POST /submissions   → moderated suggestion ("contribución de terceros"), 201/400/429
// No auth; CORS *; data is CC-BY-4.0 → attribution REQUIRED wherever it's shown.

export const ACOPIOVE_API = process.env.ACOPIOVE_API_URL || "https://api.acopiove.org/v1";
export const ACOPIOVE_ATTRIBUTION = "Datos: AcopioVE (acopiove.org), CC-BY-4.0";
export const ACOPIOVE_SOURCE_NAME = "HelpMap VE"; // sent as `source` on submissions (their attribution)

// A centro as returned by GET /centros (tipo=refugio).
export interface AcopioCentro {
  id: string;
  name: string;
  tipo: string;
  estado: string | null;
  address: string | null;
  ciudad: string | null;
  pais: string | null;
  lat: number;
  lng: number;
  recibe: string[] | null;
  necesita_ahora: string | null;
  horario: string | null;
  contacto: string | null;
  responsable: string | null;
  fuente: string | null;
  updated_at: string | null;
}

export interface MappedLocation {
  location_id: string;
  canonical_name: string;
  type: "shelter";
  municipality: string | null;
  state: string;
  lat: number;
  lng: number;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  active: boolean;
}
export interface MappedRefugio {
  location_id: string;
  recibe: string[];
  necesita: string | null;
  horario: string | null;
  responsable: string | null;
  fuente: string | null;
  address: string | null;
  external_id: string;
  es_animal: boolean;
  updated_at: string; // = AcopioVE's updated_at, so freshest-wins compares apples to apples
}

// ---- place/phone derivation (mirrors scripts/gen-refugios.mjs; best-effort) ----------
const DIA = /[̀-ͯ]/g;
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(DIA, "");
export const refSlug = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

// Only Libertador is Distrito Capital; Chacao/Baruta/Sucre/El Hatillo are Miranda.
const CARACAS_MUN: Array<[string, string, string[]]> = [
  ["Chacao", "miranda", ["chacao", "altamira", "la castellana", "los palos grandes", "el rosal", "bello campo", "chacaito"]],
  ["Baruta", "miranda", ["baruta", "las mercedes", "el cafetal", "la trinidad", "chuao", "santa fe"]],
  ["Sucre", "miranda", ["petare", "mesuca", "la urbina", "polisucre", "policia municipal de sucre", "los dos caminos", "boleita", "macaracuay"]],
  ["El Hatillo", "miranda", ["el hatillo"]],
];
const CITY_STATE: Record<string, string> = {
  guacara: "carabobo", mariara: "carabobo", naguanagua: "carabobo",
  "san diego": "carabobo", "puerto cabello": "carabobo", valencia: "carabobo",
  "la victoria": "aragua", maracay: "aragua",
  tucacas: "falcon", moron: "falcon", coro: "falcon",
  "san felipe": "yaracuy", "la guaira": "la_guaira", vargas: "la_guaira",
};

export function derivePlace(it: AcopioCentro): { state: string; municipality: string | null } {
  const c = norm(it.ciudad || "");
  for (const k in CITY_STATE) if (c.includes(k)) return { state: CITY_STATE[k], municipality: it.ciudad };
  const hay = norm(`${it.address || ""} ${it.name} ${it.ciudad || ""}`);
  for (const [mun, st, toks] of CARACAS_MUN)
    if (toks.some((tk) => hay.includes(tk))) return { state: st, municipality: mun };
  if (c.includes("caracas")) return { state: "distrito_capital", municipality: "Libertador" };
  return { state: "distrito_capital", municipality: null };
}

export function derivePhones(contacto: string | null): { phone: string | null; wa: string | null } {
  if (!contacto) return { phone: null, wa: null };
  const digits = String(contacto).replace(/[^\d]/g, "");
  if (digits.length < 7) return { phone: null, wa: null };
  let d = digits;
  if (d.startsWith("58")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  const wa = /^4\d{9}$/.test(d) ? "58" + d : null;
  return { phone: contacto.trim(), wa };
}

// Map one AcopioVE centro to our {location, refugio} rows. Reuse `existingLocId` for a
// record we already hold (matched by external_id) so we never orphan its FK / re-key it.
export function mapCentro(it: AcopioCentro, existingLocId?: string): { location: MappedLocation; refugio: MappedRefugio } {
  const { state, municipality } = derivePlace(it);
  const { phone, wa } = derivePhones(it.contacto);
  const location_id = existingLocId || "ref_" + refSlug(it.name).replace(/^animales_/, "anim_").slice(0, 44);
  return {
    location: {
      location_id,
      canonical_name: it.name,
      type: "shelter",
      municipality,
      state,
      lat: it.lat,
      lng: it.lng,
      contact_phone: phone,
      contact_whatsapp: wa,
      active: true,
    },
    refugio: {
      location_id,
      recibe: it.recibe ?? [],
      necesita: it.necesita_ahora,
      horario: it.horario,
      responsable: it.responsable,
      fuente: it.fuente,
      address: it.address,
      external_id: it.id,
      es_animal: /^\s*\[animales\]/i.test(it.name),
      updated_at: it.updated_at || new Date().toISOString(),
    },
  };
}

// Fetch ALL refugios from AcopioVE (paginated). `updatedSince` (ISO) fetches only rows
// changed since then — pass the last successful sync time for an incremental pull.
export async function fetchAcopioRefugios(opts?: { updatedSince?: string; signal?: AbortSignal }): Promise<AcopioCentro[]> {
  const all: AcopioCentro[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const u = new URL(ACOPIOVE_API + "/centros");
    u.searchParams.set("tipo", "refugio");
    u.searchParams.set("format", "json");
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("offset", String(offset));
    if (opts?.updatedSince) u.searchParams.set("updatedSince", opts.updatedSince);
    const res = await fetch(u.toString(), { signal: opts?.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`acopiove /centros ${res.status}`);
    const j = (await res.json()) as { data?: AcopioCentro[]; total?: number };
    const rows = j.data ?? [];
    all.push(...rows);
    const total = typeof j.total === "number" ? j.total : all.length;
    if (rows.length < limit || all.length >= total) break;
  }
  return all;
}
