// Live seismic data for the damage layer, pulled from the USGS FDSN event API.
// Docs: https://earthquake.usgs.gov/fdsnws/event/1/
//
// We query events (the mainshock + aftershocks) inside a bounding box over the
// affected central-coast region and turn them into:
//   • heat points (intensity weighted by magnitude) for the "felt intensity" overlay
//   • aftershock markers ("Réplicas · N · USGS")
//
// USGS sends CORS headers, so this runs fine from the client. If the API returns
// nothing (e.g. the event isn't indexed yet) or fails (offline), we fall back to
// the curated seed footprint in damage.ts so the layer always renders.

import type { DamagePoint } from "./damage";
import { DAMAGE_ZONES } from "./damage";

export interface Aftershock {
  id: string;
  lat: number;
  lng: number;
  mag: number;
  place: string;
  time: number | null;
}

export interface DamageData {
  points: DamagePoint[];
  aftershocks: Aftershock[];
  source: "usgs" | "seed";
  updatedAt: number | null;
}

const FDSN = "https://earthquake.usgs.gov/fdsnws/event/1/query";
// Bounding box over the affected corridor (Yaracuy → Barlovento, incl. coast).
const REGION = { minlat: 9.0, maxlat: 11.8, minlon: -69.6, maxlon: -65.4 };
// Mainshock date (CLAUDE.md: June 2026 quake). Window starts here.
const START = "2026-06-24";

// Map magnitude → 0..1 heat intensity (~M3.5 ≈ 0.2, ~M7 ≈ 1.0).
function magToIntensity(mag: number): number {
  return Math.max(0.2, Math.min(1, (mag - 3.5) / 3.5));
}

export const SEED_DAMAGE: DamageData = {
  points: DAMAGE_ZONES,
  aftershocks: [],
  source: "seed",
  updatedAt: null,
};

export async function fetchDamageData(signal?: AbortSignal): Promise<DamageData> {
  try {
    const params = new URLSearchParams({
      format: "geojson",
      starttime: START,
      minmagnitude: "4",
      orderby: "magnitude",
      minlatitude: String(REGION.minlat),
      maxlatitude: String(REGION.maxlat),
      minlongitude: String(REGION.minlon),
      maxlongitude: String(REGION.maxlon),
      limit: "250",
    });
    const res = await fetch(`${FDSN}?${params.toString()}`, { signal });
    if (!res.ok) throw new Error("usgs " + res.status);
    const gj = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feats: any[] = Array.isArray(gj?.features) ? gj.features : [];

    const aftershocks: Aftershock[] = feats
      .map((f) => ({
        id: String(f.id),
        lat: Number(f.geometry?.coordinates?.[1]),
        lng: Number(f.geometry?.coordinates?.[0]),
        mag: Number(f.properties?.mag ?? 0),
        place: String(f.properties?.place ?? ""),
        time: f.properties?.time ?? null,
      }))
      .filter((a) => isFinite(a.lat) && isFinite(a.lng));

    if (!aftershocks.length) return SEED_DAMAGE;

    // Heat = the curated affected-AREA footprint (extent) PLUS the USGS epicentres
    // as focal hotspots — so the layer conveys the whole felt region, not just
    // the focal points. Aftershocks are also returned separately as markers.
    const focal: DamagePoint[] = aftershocks.map((a) => [a.lat, a.lng, magToIntensity(a.mag)]);
    const points: DamagePoint[] = [...DAMAGE_ZONES, ...focal];
    const updatedAt = aftershocks.reduce((m, a) => Math.max(m, a.time ?? 0), 0) || null;
    return { points, aftershocks, source: "usgs", updatedAt };
  } catch {
    return SEED_DAMAGE;
  }
}
