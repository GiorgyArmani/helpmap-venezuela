// Loads Leaflet 1.9.4 from CDN once (matching the original Reencuentro design,
// which pulled leaflet + CARTO basemaps from unpkg) and resolves with window.L.
// Avoids adding a build dependency and keeps the map identical to the design.

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
// leaflet.heat: tiny canvas heatmap plugin, augments window.L with L.heatLayer.
const LEAFLET_HEAT_JS = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
// leaflet.markercluster: groups nearby pins into a single badge when zoomed out, so a
// dense metro area (Caracas) reads as one tappable cluster instead of a pile of markers.
// Augments window.L with L.markerClusterGroup. We only need MarkerCluster.css (the
// clustering/spiderfy animations); the default cluster skin is replaced by our own.
const LEAFLET_CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const LEAFLET_CLUSTER_JS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";

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

let clusterPromise: Promise<unknown> | null = null;

// Loads Leaflet first, then the markercluster plugin. Resolves with window.L once
// L.markerClusterGroup is available. Best-effort: the caller should still check for
// L.markerClusterGroup and fall back to un-clustered markers if the plugin CDN fails.
export function loadLeafletCluster(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  return loadLeaflet().then(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window.L as any)?.markerClusterGroup) return window.L;
    if (clusterPromise) return clusterPromise;

    clusterPromise = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[href="${LEAFLET_CLUSTER_CSS}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = LEAFLET_CLUSTER_CSS;
        document.head.appendChild(link);
      }
      const done = () => resolve(window.L);
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_CLUSTER_JS}"]`);
      if (existing) {
        existing.addEventListener("load", done);
        existing.addEventListener("error", reject);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window.L as any)?.markerClusterGroup) done();
        return;
      }
      const s = document.createElement("script");
      s.src = LEAFLET_CLUSTER_JS;
      s.async = true;
      s.onload = done;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return clusterPromise;
  });
}
