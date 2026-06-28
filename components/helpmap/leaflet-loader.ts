// Loads Leaflet 1.9.4 from CDN once (matching the original Reencuentro design,
// which pulled leaflet + CARTO basemaps from unpkg) and resolves with window.L.
// Avoids adding a build dependency and keeps the map identical to the design.

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
// leaflet.heat: tiny canvas heatmap plugin, augments window.L with L.heatLayer.
const LEAFLET_HEAT_JS = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L?: any;
  }
}

let loadPromise: Promise<unknown> | null = null;

export function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // Stylesheet
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // Script
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      if (window.L) resolve(window.L);
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadPromise;
}

let heatPromise: Promise<unknown> | null = null;

// Loads Leaflet first, then the leaflet.heat plugin. Resolves with window.L once
// L.heatLayer is available. Used for the earthquake damage heat overlay.
export function loadLeafletHeat(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  return loadLeaflet().then(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window.L as any)?.heatLayer) return window.L;
    if (heatPromise) return heatPromise;

    heatPromise = new Promise((resolve, reject) => {
      const done = () => resolve(window.L);
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_HEAT_JS}"]`);
      if (existing) {
        existing.addEventListener("load", done);
        existing.addEventListener("error", reject);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window.L as any)?.heatLayer) done();
        return;
      }
      const s = document.createElement("script");
      s.src = LEAFLET_HEAT_JS;
      s.async = true;
      s.onload = done;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return heatPromise;
  });
}
