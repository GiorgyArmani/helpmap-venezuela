// AcopioVE API client + mapping (server-usable; no server-only deps so it can be
// imported by any route). AcopioVE (acopiove.org) is the upstream source of truth for
// refugios; HelpMap syncs them in (pull) and can suggest updates back (push).
//
// Live contract (https://api.acopiove.org/v1, verified July 2026):
//   GET  /centros?tipo=refugio|acopio&pais=Venezuela&format=json&limit&offset&updatedSince
//        → { data:[…], total, limit, offset, meta }
//   POST /submissions   → moderated suggestion ("contribución de terceros"), 201/400/429
// No auth; CORS *; data is CC-BY-4.0 → attribution REQUIRED wherever it's shown.
//
// We pull BOTH tipos: refugio → a `shelter` location, acopio → a `donation_centre`
// location. Both reuse the `refugios` companion needs table (recibe/necesita) — an acopio
// has the same "what it receives / needs now" shape, so no separate table is needed.

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

// AcopioVE centro tipo → the HelpMap location type it maps to.
export type AcopioTipo = "refugio" | "acopio";

// Operating status, AcopioVE's vocabulary (their /submissions schema enumerates
// abierto|lleno|cerrado; the live /centros feed returns "abierto"/"cerrado" today).
// NULL = unknown — never default an unverified centro to "abierto": telling someone a
// closed point is open is the failure that actually hurts.
export type RefugioEstado = "abierto" | "lleno" | "cerrado";

export function normalizeEstado(raw: string | null | undefined): RefugioEstado | null {
  const v = norm(String(raw ?? "")).trim();
  if (!v) return null;
  if (/^(abierto|activo|open|active|operativo)/.test(v)) return "abierto";
  if (/^(lleno|full|completo|sin cupo)/.test(v)) return "lleno";
  if (/^(cerrado|closed|inactivo|clausurado)/.test(v)) return "cerrado";
  return null; // unrecognized → unknown, not a guess
}

export interface MappedLocation {
  location_id: string;
  canonical_name: string;
  type: "shelter" | "donation_centre";
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
  estado: RefugioEstado | null; // abierto | lleno | cerrado (null = upstream didn't say)
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
// Known city/town → state (checked against `ciudad` first, most reliable). Covers the
// state capitals + major towns across all 24 Venezuelan states so nationwide acopios
// resolve even when the address omits the state. Ambiguous bare names (Libertad,
// Independencia, San Antonio, Delicias…) are intentionally omitted — they exist in many
// states, so the sync skips them for an admin to place rather than guessing wrong.
const CITY_STATE: Record<string, string> = {
  // corridor
  guacara: "carabobo", mariara: "carabobo", naguanagua: "carabobo", "san diego": "carabobo",
  "puerto cabello": "carabobo", valencia: "carabobo", guigue: "carabobo", bejuma: "carabobo", tocuyito: "carabobo",
  "la victoria": "aragua", maracay: "aragua", cagua: "aragua", turmero: "aragua", "la encrucijada": "aragua",
  "el limon": "aragua", "villa de cura": "aragua", "palo negro": "aragua",
  tucacas: "falcon", moron: "falcon", coro: "falcon", "punto fijo": "falcon", churuguara: "falcon",
  "san felipe": "yaracuy", yaritagua: "yaracuy", chivacoa: "yaracuy", nirgua: "yaracuy", cocorote: "yaracuy",
  "la guaira": "la_guaira", maiquetia: "la_guaira", "catia la mar": "la_guaira", macuto: "la_guaira", vargas: "la_guaira",
  // Miranda (incl. Tuy valley + Altos Mirandinos — corridor-adjacent)
  "los teques": "miranda", "santa teresa del tuy": "miranda", "ocumare del tuy": "miranda",
  charallave: "miranda", "san pedro de los altos": "miranda", cua: "miranda", guarenas: "miranda", guatire: "miranda",
  // nationwide
  maracaibo: "zulia", cabimas: "zulia", "ciudad ojeda": "zulia", "san francisco": "zulia",
  machiques: "zulia", "santa barbara del zulia": "zulia", "la concepcion": "zulia",
  barquisimeto: "lara", carora: "lara", "el tocuyo": "lara", quibor: "lara", cabudare: "lara", duaca: "lara",
  maturin: "monagas", "punta de mata": "monagas", caripito: "monagas",
  cumana: "sucre", carupano: "sucre", cariaco: "sucre", guiria: "sucre",
  barcelona: "anzoategui", "puerto la cruz": "anzoategui", lecheria: "anzoategui", "el tigre": "anzoategui",
  anaco: "anzoategui", cantaura: "anzoategui", pariaguan: "anzoategui", clarines: "anzoategui",
  "ciudad bolivar": "bolivar", "ciudad guayana": "bolivar", "puerto ordaz": "bolivar", "san felix": "bolivar",
  upata: "bolivar", "caicara del orinoco": "bolivar", tumeremo: "bolivar",
  "san cristobal": "tachira", tariba: "tachira", "san antonio del tachira": "tachira", rubio: "tachira",
  "la fria": "tachira", "san juan de colon": "tachira", "la tendida": "tachira", "el cobre": "tachira", capacho: "tachira",
  merida: "merida", "el vigia": "merida", ejido: "merida", tovar: "merida", mucuchies: "merida",
  porlamar: "nueva_esparta", "la asuncion": "nueva_esparta", pampatar: "nueva_esparta",
  margarita: "nueva_esparta", "juan griego": "nueva_esparta",
  tucupita: "delta_amacuro", "puerto ayacucho": "amazonas",
  valera: "trujillo", trujillo: "trujillo", bocono: "trujillo", pampanito: "trujillo", pampan: "trujillo",
  "san carlos": "cojedes", tinaquillo: "cojedes", "el baul": "cojedes",
  calabozo: "guarico", "valle de la pascua": "guarico", "san juan de los morros": "guarico", zaraza: "guarico",
  "altagracia de orituco": "guarico", tucupido: "guarico", guayabal: "guarico", cabruta: "guarico",
  "el sombrero": "guarico", "san jose de tiznados": "guarico", chaguaramas: "guarico",
  guanare: "portuguesa", acarigua: "portuguesa", araure: "portuguesa", biscucuy: "portuguesa",
  guanarito: "portuguesa", "villa bruzual": "portuguesa", ospino: "portuguesa", turen: "portuguesa",
  "agua blanca": "portuguesa", papelon: "portuguesa", chabasquen: "portuguesa", piritu: "portuguesa",
  boconoito: "portuguesa", "san rafael de onoto": "portuguesa",
  barinas: "barinas", barinitas: "barinas", socopo: "barinas", "santa barbara de barinas": "barinas",
  sabaneta: "barinas", "el canton": "barinas",
  "san fernando de apure": "apure", guasdualito: "apure", biruaca: "apure", achaguas: "apure",
};

// Explicit Venezuelan state name appearing in an address/ciudad string (fallback for the
// long tail — the API has no `state` field, only ciudad/address, and addresses usually end
// with the real state, e.g. "…, Cagua, Aragua"). Scanned only over address+ciudad (NOT the
// name) so facility names like "Av. Francisco de Miranda" or "Hospital Vargas" can't spoof
// a state; and only AFTER the Caracas + CITY_STATE checks so ambiguous tokens (miranda,
// sucre, bolivar, vargas) don't misfire on corridor rows. Multi-word states first.
const STATE_TOKENS: Array<[string, string]> = [
  ["distrito capital", "distrito_capital"],
  ["nueva esparta", "nueva_esparta"],
  ["delta amacuro", "delta_amacuro"],
  ["amacuro", "delta_amacuro"],
  ["la guaira", "la_guaira"],
  ["margarita", "nueva_esparta"],
  ["amazonas", "amazonas"],
  ["anzoategui", "anzoategui"],
  ["apure", "apure"],
  ["barinas", "barinas"],
  ["cojedes", "cojedes"],
  ["guarico", "guarico"],
  ["lara", "lara"],
  ["merida", "merida"],
  ["monagas", "monagas"],
  ["portuguesa", "portuguesa"],
  ["tachira", "tachira"],
  ["trujillo", "trujillo"],
  ["zulia", "zulia"],
  ["yaracuy", "yaracuy"],
  ["falcon", "falcon"],
  ["carabobo", "carabobo"],
  ["aragua", "aragua"],
  ["bolivar", "bolivar"],
  ["miranda", "miranda"],
  ["sucre", "sucre"],
  ["vargas", "la_guaira"],
];

// `confident` is true only when we positively resolved one of the 7 supported corridor
// states (a value the `vzla_state` enum accepts). It is false on the final fallback — the
// caller MUST NOT insert such a row's state blindly (the acopio sync skips it) since
// AcopioVE data is nationwide but our enum is corridor-locked (CLAUDE.md §13).
export function derivePlace(
  it: AcopioCentro,
): { state: string; municipality: string | null; confident: boolean } {
  const c = norm(it.ciudad || "");
  for (const k in CITY_STATE) if (c.includes(k)) return { state: CITY_STATE[k], municipality: it.ciudad, confident: true };
  const hay = norm(`${it.address || ""} ${it.name} ${it.ciudad || ""}`);
  for (const [mun, st, toks] of CARACAS_MUN)
    if (toks.some((tk) => hay.includes(tk))) return { state: st, municipality: mun, confident: true };
  if (c.includes("caracas")) return { state: "distrito_capital", municipality: "Libertador", confident: true };
  const place = norm(`${it.address || ""} ${it.ciudad || ""}`);
  for (const [tok, st] of STATE_TOKENS) if (place.includes(tok)) return { state: st, municipality: it.ciudad || null, confident: true };
  return { state: "distrito_capital", municipality: it.ciudad || null, confident: false };
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

// Map one AcopioVE centro to our {location, refugio} rows. `tipo` drives the location
// type (refugio → shelter, acopio → donation_centre) and the id prefix so the two never
// collide. Reuse `existingLocId` for a record we already hold (matched by external_id) so
// we never orphan its FK / re-key it.
export function mapCentro(
  it: AcopioCentro,
  existingLocId?: string,
  tipo: AcopioTipo = "refugio",
): { location: MappedLocation; refugio: MappedRefugio } {
  const { state, municipality } = derivePlace(it);
  const { phone, wa } = derivePhones(it.contacto);
  const isAcopio = tipo === "acopio";
  const prefix = isAcopio ? "aco_" : "ref_";
  const location_id =
    existingLocId || prefix + refSlug(it.name).replace(/^animales_/, "anim_").slice(0, 44);
  return {
    location: {
      location_id,
      canonical_name: it.name,
      type: isAcopio ? "donation_centre" : "shelter",
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
      es_animal: !isAcopio && /^\s*\[animales\]/i.test(it.name),
      estado: normalizeEstado(it.estado),
      updated_at: it.updated_at || new Date().toISOString(),
    },
  };
}

// Fetch ALL centros of one `tipo` from AcopioVE (paginated). `pais` scopes the pull to a
// country (e.g. "Venezuela" for acopios). `updatedSince` (ISO) fetches only rows changed
// since then — pass the last successful sync time for an incremental pull.
export async function fetchAcopioCentros(opts: {
  tipo: AcopioTipo;
  pais?: string;
  updatedSince?: string;
  signal?: AbortSignal;
}): Promise<AcopioCentro[]> {
  const all: AcopioCentro[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const u = new URL(ACOPIOVE_API + "/centros");
    u.searchParams.set("tipo", opts.tipo);
    if (opts.pais) u.searchParams.set("pais", opts.pais);
    u.searchParams.set("format", "json");
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("offset", String(offset));
    if (opts.updatedSince) u.searchParams.set("updatedSince", opts.updatedSince);
    const res = await fetch(u.toString(), { signal: opts.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`acopiove /centros ${res.status}`);
    const j = (await res.json()) as { data?: AcopioCentro[]; total?: number };
    const rows = j.data ?? [];
    all.push(...rows);
    const total = typeof j.total === "number" ? j.total : all.length;
    if (rows.length < limit || all.length >= total) break;
  }
  return all;
}

// Back-compat thin wrapper: the original refugio-only pull.
export function fetchAcopioRefugios(opts?: { updatedSince?: string; signal?: AbortSignal }): Promise<AcopioCentro[]> {
  return fetchAcopioCentros({ tipo: "refugio", ...opts });
}
