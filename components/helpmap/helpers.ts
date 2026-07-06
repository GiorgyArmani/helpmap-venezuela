// Pure helpers for the HelpMap UI: relative time, Nominatim address → our enums, and
// avatar initials. No React, no side effects — safe to import anywhere.

import { norm, type VzlaState } from "./data";
import type { PersonLike } from "./types";

// Compact relative time ("hace 5 min"). App-runtime only (Date is fine here).
export function timeAgo(iso: string, lang: "es" | "en"): string {
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
  if (s < 60) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
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
