// Earthquake damage-intensity points for the heat overlay (June 24 2026 quake).
// Format: [lat, lng, intensity 0..1] — the shape leaflet.heat expects. Higher
// intensity = heavier reported damage.
//
// Coverage spans the WHOLE affected corridor along the central coast, west→east:
// Yaracuy (San Felipe) · Carabobo (Morón, Puerto Cabello, Valencia) · Aragua
// (Maracay) · Distrito Capital · La Guaira · Miranda (to Barlovento). Heaviest
// damage clusters along the coast near the offshore epicentre.
//
// ⚠️ SEED / ILLUSTRATIVE data. Replace with the crew's verified damage assessment
// before relying on it — ideally move it to a Supabase `damage_zones` table and
// fetch it like locations/patients, so the heat layer becomes DB-driven (the same
// upgrade path described for locations in CLAUDE.md §13). Do NOT present it as an
// authoritative casualty/damage count.

export type DamagePoint = [number, number, number];

export const DAMAGE_ZONES: DamagePoint[] = [
  // ---- Offshore epicentre anchors (central coast) ----
  [10.78, -68.02, 1.0],
  [10.72, -67.7, 0.92],
  [10.7, -66.95, 0.95],

  // ---- Yaracuy (western edge: San Felipe area) ----
  [10.34, -68.74, 0.45], // San Felipe
  [10.34, -68.71, 0.42], // Cocorote
  [10.43, -68.9, 0.32], // Aroa / Marín
  [10.16, -68.89, 0.3], // Chivacoa
  [10.15, -68.56, 0.3], // Nirgua

  // ---- Carabobo coast (heavy: Morón / Puerto Cabello) ----
  [10.49, -68.19, 0.85], // Morón
  [10.47, -68.01, 0.95], // Puerto Cabello
  [10.45, -67.93, 0.72], // Borburata
  [10.46, -67.85, 0.58], // Patanemo
  // Carabobo inland (Valencia metro)
  [10.24, -68.01, 0.6], // Naguanagua
  [10.17, -68.0, 0.62], // Valencia
  [10.18, -67.92, 0.5], // Los Guayos
  [10.23, -67.88, 0.6], // Guacara
  [10.27, -67.8, 0.52], // San Joaquín
  [10.27, -67.69, 0.55], // Mariara

  // ---- Aragua ----
  [10.46, -67.75, 0.72], // Ocumare de la Costa (coast)
  [10.49, -67.61, 0.7], // Choroní / Chuao (coast)
  [10.3, -67.63, 0.55], // El Limón
  [10.25, -67.6, 0.6], // Maracay
  [10.23, -67.47, 0.5], // Turmero
  [10.19, -67.46, 0.45], // Cagua
  [10.23, -67.33, 0.5], // La Victoria
  [10.04, -67.49, 0.38], // Villa de Cura

  // ---- La Guaira (heavy coastal corridor) ----
  [10.601, -66.931, 1.0],
  [10.595, -66.94, 0.92],
  [10.598, -66.965, 0.95],
  [10.589, -66.998, 0.9],
  [10.604, -67.012, 0.85], // Catia La Mar
  [10.61, -66.86, 0.8], // Macuto
  [10.62, -66.78, 0.6],

  // ---- Caracas–La Guaira highway corridor ----
  [10.57, -66.94, 0.75],
  [10.55, -66.95, 0.7],

  // ---- Distrito Capital / Caracas ----
  [10.512, -66.92, 0.65], // Catia
  [10.506, -66.94, 0.8],
  [10.498, -66.915, 0.75], // Centro
  [10.49, -66.903, 0.7],
  [10.5, -66.87, 0.6],
  [10.48, -66.88, 0.6],
  [10.49, -66.83, 0.55], // toward Petare
  [10.467, -66.86, 0.45], // Baruta / El Hatillo
  [10.44, -66.85, 0.4],

  // ---- Miranda — Altos Mirandinos / Valles del Tuy (south) ----
  [10.345, -67.04, 0.5], // Los Teques
  [10.36, -67.02, 0.45],
  [10.33, -67.06, 0.4],
  [10.24, -66.86, 0.4], // Charallave
  [10.16, -66.88, 0.32], // Cúa

  // ---- Miranda — east (Guarenas → Barlovento) ----
  [10.47, -66.61, 0.6], // Guarenas
  [10.475, -66.54, 0.55], // Guatire
  [10.48, -66.46, 0.4], // Araira
  [10.28, -66.34, 0.35], // Caucagua
  [10.48, -66.1, 0.35], // Higuerote

  // ---- Extent halo: low-intensity filler so the felt area reads as ONE
  // continuous affected region (the "extent"), not isolated hotspots. ----
  // Coastal / offshore band (intensity radiates out to sea along the coast)
  [10.9, -68.4, 0.25],
  [10.85, -67.9, 0.3],
  [10.8, -67.4, 0.28],
  [10.78, -66.9, 0.3],
  [10.8, -66.4, 0.24],
  [10.74, -66.0, 0.22],
  // Inland mid band (Yaracuy → Miranda corridor)
  [10.35, -69.0, 0.2],
  [10.3, -68.5, 0.24],
  [10.38, -68.2, 0.28],
  [10.4, -67.9, 0.3],
  [10.4, -67.5, 0.3],
  [10.42, -67.1, 0.3],
  [10.4, -66.7, 0.3],
  [10.42, -66.3, 0.24],
  [10.4, -66.0, 0.2],
  // Southern edge (lighter, tapering inland)
  [10.05, -68.6, 0.18],
  [10.05, -68.0, 0.2],
  [10.0, -67.5, 0.2],
  [10.0, -67.0, 0.18],
  [10.05, -66.6, 0.18],
  [10.12, -66.2, 0.16],
  // Western edge (Yaracuy / Lara border, light)
  [10.2, -69.2, 0.18],
  [10.5, -69.0, 0.2],
];
