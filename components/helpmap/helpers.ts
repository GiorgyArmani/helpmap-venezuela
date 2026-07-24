// Pure helpers for the HelpMap UI: relative time, Nominatim address → our enums, and
// avatar initials. No React, no side effects — safe to import anywhere.

import { AYUDA_ORDER, ESTADO_META, norm, type AyudaKey, type Lang, type Refugio, type RefugioEstado, type VzlaState } from "./data";
import type { PersonLike } from "./types";

// Operating status of a help point, narrowed to what the UI can render. Anything we
// don't recognize (or a row from before db/refugios_estado.sql) is UNKNOWN → no badge.
// Deliberately never falls back to "abierto": claiming a closed point is open is the
// error that sends a family to a shut door.
export function estadoOf(r?: Refugio | null): RefugioEstado | null {
  const v = r?.estado;
  return v && v in ESTADO_META ? (v as RefugioEstado) : null;
}

// A refugio/acopio the app should still present as active help. `cerrado` is excluded
// from the "N puntos necesitan ayuda" bar and list — a closed point doesn't need
// donations, and listing it there wastes a trip.
export const isOpenPoint = (r?: Refugio | null) => estadoOf(r) !== "cerrado";

// How stale the record is, in days (null when we have no timestamp at all). Drives the
// "confirma antes de ir" hint — AcopioVE shows the same thing ("Actualizado hace 28 días")
// because in an emergency the AGE of the data is part of the data.
export function refugioAgeDays(r?: Refugio | null): number | null {
  const iso = r?.updated_at || r?.last_confirmed_at;
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

// Beyond this the card asks the user to phone ahead before travelling.
export const REFUGIO_STALE_DAYS = 10;

// `refugios.ayuda` is a free text[] in Postgres (so a new way to help never needs a
// migration). Narrow it to the keys the UI can actually render, in AYUDA_ORDER — an
// unrecognized value is dropped rather than painted as a blank chip.
export function ayudaKeys(ayuda?: string[] | null): AyudaKey[] {
  if (!ayuda?.length) return [];
  return AYUDA_ORDER.filter((k) => ayuda.includes(k));
}

// Compact relative time ("hace 5 min"). App-runtime only (Date is fine here).
export function timeAgo(iso: string, lang: Lang): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const m = Math.floor(s / 60),
    h = Math.floor(m / 60),
    d = Math.floor(h / 24);
  if (lang === "es") {
    if (s < 60) return "hace un momento";
    if (m < 60) return `hace ${m} min`;
    if (h < 24) return `hace ${h} h`;
    return `hace ${d} d`;
  }
  if (lang === "pt") {
    if (s < 60) return "agora mesmo";
    if (m < 60) return `há ${m} min`;
    if (h < 24) return `há ${h} h`;
    return `há ${d} d`;
  }
  if (s < 60) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// BCP-47 locale for Date#toLocaleString/toLocaleDateString, per app Lang.
export function localeOf(lang: Lang): string {
  if (lang === "es") return "es-VE";
  if (lang === "pt") return "pt-BR";
  return "en-US";
}

// Map a Nominatim address (or the display label as fallback) to one of our VzlaState
// enum values. Only returns a value when it matches a state we support — otherwise null,
// so we never set an invalid enum on the draft. Handles common variants: "Estado/Edo."
// prefixes, "Vargas" (old name of La Guaira), "Capital District".
const STATE_FROM_LABEL: Array<[VzlaState, string[]]> = [
  ["distrito_capital", ["distrito capital", "capital district", "dtto capital"]],
  ["la_guaira", ["la guaira", "vargas"]],
  ["miranda", ["miranda"]],
  ["yaracuy", ["yaracuy"]],
  ["falcon", ["falcon"]],
  ["carabobo", ["carabobo"]],
  ["aragua", ["aragua"]],
];

export function veStateFromAddress(address?: Record<string, string>, label?: string): VzlaState | null {
  const candidates = [
    address?.state,
    address?.state_district,
    address?.region,
    // last resort: scan the display label, which usually contains "Estado X".
    label,
  ]
    .filter(Boolean)
    .map((s) => norm(s as string).replace(/^(estado|edo\.?)\s+/, ""));
  for (const c of candidates) {
    for (const [enumVal, needles] of STATE_FROM_LABEL) {
      if (needles.some((n) => c.includes(n))) return enumVal;
    }
  }
  return null;
}

// Pick the best "municipio" from a Nominatim address and strip the "Municipio " prefix
// so we store just the name (e.g. "Municipio San Felipe" → "San Felipe").
export function municipalityFromAddress(address?: Record<string, string>): string | null {
  if (!address) return null;
  const raw = address.municipality || address.county || address.city_district || address.city || "";
  const cleaned = raw.replace(/^(municipio|mcpio\.?|mun\.?)\s+/i, "").trim();
  return cleaned || null;
}

export const initials = (p: PersonLike) =>
  ((p.nombres[0] || "") + (p.apellidos[0] || "")).toUpperCase() || "··";

// Extract lat/lng from pasted text: bare "lat, lng" OR a Google/Apple Maps URL.
// This is the reliable escape hatch when Nominatim can't find an address that DOES
// exist in Google Maps — the admin copies the pin's coordinates or the map link and
// pastes it here. Returns null if nothing coordinate-like is present.
// Venezuela sanity bounds: lat ~0.6..15.9 (allow 0..17), lng ~-73..-59 (allow -74..-58).
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  const t = decodeURIComponent(text.trim());
  const ok = (lat: number, lng: number) =>
    isFinite(lat) && isFinite(lng) && lat >= 0 && lat <= 17 && lng >= -74 && lng <= -58
      ? { lat, lng }
      : null;

  // Google Maps URL forms, most specific first:
  //   .../@10.123,-66.456,17z   ·   !3d10.123!4d-66.456   ·   ?q=10.123,-66.456 / ?ll= / ?daddr=
  const patterns = [
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, // /@lat,lng
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // !3dlat!4dlng
    /[?&](?:q|ll|daddr|destination|center)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, // ?q=lat,lng
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const hit = ok(parseFloat(m[1]), parseFloat(m[2]));
      if (hit) return hit;
    }
  }
  // Bare "lat, lng" or "lat lng" (require decimals so we don't grab street numbers).
  const bare = t.match(/^\s*(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/);
  if (bare) return ok(parseFloat(bare[1]), parseFloat(bare[2]));
  return null;
}
