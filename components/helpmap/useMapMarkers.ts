"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

// The Leaflet map subsystem for HelpMap: map init + every marker/overlay effect + the map
// refs + the damage (USGS) heat layer. Extracted from HelpMap.tsx (§14 Phase 3) so the big
// component shrinks and HMR recompiles less. Effect bodies are VERBATIM (behavior preserved
// by construction); HelpMap passes reactive inputs + onMarkerRef and gets back the handles it
// still needs elsewhere (mapRef for zoom/flyTo, containerRef for the map div, mapReady, damage).
// ⚠️ Needs a browser smoke-test after any change here: pins update on filter change, clusters
// expand, "Daños" heat toggles, "mi ubicación" dot, and the draggable draft pin while editing.

import { useEffect, useRef, useState } from "react";
import { TYPE_META, type Location, type LocationType, type PatientPublic, type Refugio } from "./data";
import { TYPE_ICON_SVG } from "./icons";
import { loadLeaflet, loadLeafletHeat, loadLeafletCluster } from "./leaflet-loader";
import { fetchDamageData, SEED_DAMAGE, type DamageData } from "./usgsQuake";
import type { Draft, EditType } from "./types";

// Different types that cluster over the same metro area would otherwise stack on nearly the
// same pixel. We fan each type out in a fixed direction by a few px so all — and their count
// badges — stay visible. Order matches TYPE_META (hospital, shelter, morgue, donation, comedor,
// iniciativa). Positions sit on one arc, y = -18 + 14·(x/50)² — widened from 5 slots to 6 when
// civic initiatives were added, so the spread stays symmetric around the cluster's real point.
const CLUSTER_FAN: Record<LocationType, [number, number]> = {
  hospital: [-50, -4],
  shelter: [-30, -13],
  morgue: [-10, -17],
  donation_centre: [10, -17],
  comedor: [30, -13],
  iniciativa: [50, -4],
};

// Builds a per-type cluster badge: a location pin tinted with the type color, the type icon in
// white inside its head, and a small count bubble. Icon AND count are nested INSIDE the pin's
// own <svg> (one paint) so a neighbouring fanned-out pin can't paint over them.
function clusterPinHtml(type: LocationType, n: number): string {
  const color = TYPE_META[type].color;
  const [dx, dy] = CLUSTER_FAN[type];
  // Type icon re-rooted inside the pin svg, forced white (its stroke is currentColor).
  const icon = TYPE_ICON_SVG[type].replace(
    "<svg ",
    '<svg x="5.5" y="5" width="13" height="13" style="color:#fff" ',
  );
  const label = n > 99 ? "99+" : String(n);
  const badgeR = label.length > 2 ? 9 : label.length > 1 ? 8 : 6.5;
  const badgeFont = label.length > 2 ? 6.5 : 7.5;
  const badge =
    '<circle class="mkcl-badge-bg" cx="20" cy="4" r="' + badgeR + '"/>' +
    '<text class="mkcl-badge-text" x="20" y="4.5" font-size="' + badgeFont + '">' + label + "</text>";
  return (
    '<div class="mkcl" style="color:' + color + ";transform:translate(" + dx + "px," + dy + 'px)">' +
    '<svg class="mkcl-pin" viewBox="0 0 24 34" aria-hidden="true">' +
    '<path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22C24 5.37 18.63 0 12 0z" fill="currentColor" stroke="#fff" stroke-width="1.7"/>' +
    icon +
    badge +
    "</svg>" +
    "</div>"
  );
}

interface UseMapMarkersArgs {
  mapLabels: boolean;
  mapLocations: Location[];
  patients: PatientPublic[];
  tsMatch: (p: PatientPublic) => boolean;
  locationSel: string | null;
  focusId: string | null;
  refugioById: Record<string, Refugio>;
  editType: EditType;
  draft: Draft | null;
  setDraft: React.Dispatch<React.SetStateAction<Draft | null>>;
  pickingOnMap: boolean;
  showHeat: boolean;
  myLoc: { lat: number; lng: number; accuracy: number } | null;
  onMarkerRef: React.MutableRefObject<(id: string) => void>;
}

export interface MapMarkers {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mapRef: React.MutableRefObject<any>;
  markersRef: React.MutableRefObject<Record<string, any>>;
  clusterRef: React.MutableRefObject<Record<string, any> | null>;
  mapReady: boolean;
  damage: DamageData;
}

export function useMapMarkers(args: UseMapMarkersArgs): MapMarkers {
  const {
    mapLabels, mapLocations, patients, tsMatch, locationSel, focusId, refugioById,
    editType, draft, setDraft, pickingOnMap, showHeat, myLoc, onMarkerRef,
  } = args;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const clusterRef = useRef<Record<string, any> | null>(null);
  const tileLayerRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const quakeLayerRef = useRef<any>(null);
  const myLocMarkerRef = useRef<any>(null);
  const myLocCircleRef = useRef<any>(null);
  const draftMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [damage, setDamage] = useState<DamageData>(SEED_DAMAGE); // USGS-fed, seed fallback

  const mkIcon = (L: any, count: number | string, color: string, active: boolean, dim: boolean, type: LocationType) =>
    L.divIcon({
      className: "mkwrap",
      html:
        '<div class="mk' +
        (active ? " mk-on" : "") +
        (dim ? " mk-dim" : "") +
        '"><span class="mkico" style="color:' +
        color +
        '">' +
        TYPE_ICON_SVG[type] +
        '</span><span class="mkn mono">' +
        count +
        "</span></div>",
      iconSize: [48, 26],
      iconAnchor: [24, 26],
    });

  // ---- Map setup ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
          minZoom: 7,
          maxZoom: 17,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });
        // Zoom 9 frames the whole affected corridor (Yaracuy → Barlovento) so
        // the damage layer reads as a regional event, not just Caracas.
        map.setView([10.45, -67.2], 9, { animate: false });
        mapRef.current = map;

        const style = mapLabels !== false ? "light_all" : "light_nolabels";
        tileLayerRef.current = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/" + style + "/{z}/{x}/{y}{r}.png",
          { attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19 },
        ).addTo(map);

        map.attributionControl.setPrefix("");

        // Load the clustering plugin, then create the cluster group BEFORE marking the map
        // ready — so the marker effect always finds it. Non-fatal: if the plugin CDN fails,
        // clusterRef stays null and markers are added to the map directly (un-clustered).
        loadLeafletCluster()
          .catch(() => L)
          .then((Lc: any) => {
            if (cancelled || !mapRef.current) return;
            if (Lc?.markerClusterGroup) {
              // Build one cluster group per type so hospitals cluster only with hospitals,
              // refugios with refugios, etc. Each renders a type-tinted location pin.
              const groups: Record<string, any> = {};
              (Object.keys(TYPE_META) as LocationType[]).forEach((ty) => {
                const grp = Lc.markerClusterGroup({
                  maxClusterRadius: 80, // px: merge aggressively so a metro shows ~1 pin per type, not a pile
                  showCoverageOnHover: false, // no purple hull polygon — noisy on mobile
                  spiderfyOnMaxZoom: true, // spread markers sharing (nearly) identical coords
                  disableClusteringAtZoom: 16, // street level: always show every pin
                  zoomToBoundsOnClick: true, // tapping a cluster zooms into its pins
                  chunkedLoading: true,
                  iconCreateFunction: (cluster: any) =>
                    Lc.divIcon({
                      className: "mkwrap",
                      html: clusterPinHtml(ty, cluster.getChildCount()),
                      iconSize: [28, 37],
                      iconAnchor: [14, 37], // tip of the pin
                    }),
                });
                map.addLayer(grp);
                groups[ty] = grp;
              });
              clusterRef.current = groups;
            }
          })
          .finally(() => {
            if (cancelled) return;
            setMapReady(true);
            setTimeout(() => map.invalidateSize(), 220);
          });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        clusterRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create / remove / move markers when locations change. Each marker lives in its type's
  // cluster group (so dense areas collapse into one per-type badge); if the cluster plugin
  // failed to load, `groups` is null and pins are added to the map directly (un-clustered).
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;
    const groups = clusterRef.current;
    const markers = markersRef.current;
    const ids = new Set(mapLocations.map((l) => l.location_id));
    Object.keys(markers).forEach((id) => {
      if (!ids.has(id)) {
        const m = markers[id];
        (groups ? groups[m.locType] : map).removeLayer(m);
        delete markers[id];
      }
    });
    mapLocations.forEach((l) => {
      if (!markers[l.location_id]) {
        const m = L.marker([l.lat, l.lng], { icon: mkIcon(L, 0, TYPE_META[l.type].color, false, false, l.type) });
        m.locType = l.type; // remembered so we can remove it from the right per-type group
        // Hospitals get their name pinned beside the marker (always-on, not hover-only) —
        // they're the pin type people most need to identify at a glance among many pins.
        if (l.type === "hospital") {
          m.bindTooltip(l.canonical_name, {
            permanent: true,
            direction: "right",
            offset: [10, -13],
            className: "mklabel",
            opacity: 1,
          });
        }
        m.on("click", () => onMarkerRef.current(l.location_id));
        (groups ? groups[l.type] : map).addLayer(m);
        markers[l.location_id] = m;
      } else {
        markers[l.location_id].setLatLng([l.lat, l.lng]);
      }
    });
  }, [mapReady, mapLocations, onMarkerRef]);

  // Draggable draft pin for the center being placed. Shows whenever we're editing a
  // center and have coordinates (from geocode, paste, or a map tap). Dragging it updates
  // the lat/lng — the free way to fine-tune a location without any paid geocoder.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;
    const lat = parseFloat(draft?.lat || "");
    const lng = parseFloat(draft?.lng || "");
    const show = editType === "center" && isFinite(lat) && isFinite(lng);
    if (!show) {
      if (draftMarkerRef.current) {
        map.removeLayer(draftMarkerRef.current);
        draftMarkerRef.current = null;
      }
      return;
    }
    if (!draftMarkerRef.current) {
      const icon = L.divIcon({ className: "mkwrap", html: '<div class="draftpin"></div>', iconSize: [26, 26], iconAnchor: [13, 13] });
      const m = L.marker([lat, lng], { draggable: true, zIndexOffset: 2000, icon }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        setDraft((d) => ({ ...(d || {}), lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }));
      });
      draftMarkerRef.current = m;
    } else {
      draftMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [mapReady, editType, draft?.lat, draft?.lng, setDraft]);

  // "Ubicar tocando el mapa": while active, a tap on the map sets the draft coordinates.
  // The panel is hidden (CSS) and a floating banner guides the tap, so it works on mobile
  // where the overlay covers the whole map.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;
    const map = mapRef.current;
    if (!pickingOnMap || editType !== "center") return;
    const onClick = (e: any) => {
      const { lat, lng } = e.latlng;
      setDraft((d) => ({ ...(d || {}), lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    };
    map.on("click", onClick);
    const container = map.getContainer();
    container.style.cursor = "crosshair";
    return () => {
      map.off("click", onClick);
      container.style.cursor = "";
    };
  }, [mapReady, pickingOnMap, editType, setDraft]);

  // Update marker icons when filters/data change.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;
    const markers = markersRef.current;
    const L = window.L;
    mapLocations.forEach((l) => {
      const m = markers[l.location_id];
      if (!m) return;
      const all = patients.filter((p) => p.location_id === l.location_id);
      const vis = all.filter((p) => tsMatch(p));
      const active = locationSel === l.location_id || focusId === l.location_id;
      // A refugio (AcopioVE) is an info/needs point, not a patient tracker. With no
      // patients it must NOT dim or show a bare "0" (that reads as "nobody / closed");
      // show a heart glyph so it stays a live "help point". A center that ALSO carries
      // merged refugio needs keeps its patient count (it's a real center first).
      const isRefugio = !!refugioById[l.location_id];
      // Info points (no patient tracking: comedor, donation_centre) and refugios must NOT
      // dim or show a bare "0" (that reads as "closed / nobody"); they stay live "help points".
      const isInfoPoint = !TYPE_META[l.type].hasPatients || isRefugio;
      const dim = vis.length === 0 && !isInfoPoint;
      // Pin color reflects the location TYPE (hospital/shelter/comedor/morgue/acopio), not the
      // worst patient status — so the count badge reads as data, not as a death toll.
      const color = TYPE_META[l.type].color;
      const label = vis.length > 0 ? vis.length : isInfoPoint ? "&#9829;" : 0;
      m.setIcon(mkIcon(L, label, color, active, dim, l.type));
      m.setZIndexOffset(active ? 1000 : dim ? -100 : 0);
    });
  }, [mapReady, mapLocations, patients, tsMatch, locationSel, focusId, refugioById]);

  // "Mi ubicación" marker: a blue dot (+ pulse) at the visitor's own GPS position, plus a
  // translucent circle for the accuracy radius — the same "you are here" convention as
  // Google/Apple Maps. Not a location pin (not clickable, no sheet), purely orientation.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L || !myLoc) return;
    const L = window.L;
    const map = mapRef.current;
    const pos: [number, number] = [myLoc.lat, myLoc.lng];
    if (!myLocMarkerRef.current) {
      const icon = L.divIcon({
        className: "mkwrap",
        html: '<div class="meloc"><span class="meloc-pulse"></span><span class="meloc-dot"></span></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      myLocMarkerRef.current = L.marker(pos, { icon, zIndexOffset: 2000, interactive: false, keyboard: false }).addTo(map);
      myLocCircleRef.current = L.circle(pos, {
        radius: myLoc.accuracy,
        color: "#1a73e8",
        weight: 1,
        fillColor: "#1a73e8",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
    } else {
      myLocMarkerRef.current.setLatLng(pos);
      myLocCircleRef.current.setLatLng(pos);
      myLocCircleRef.current.setRadius(myLoc.accuracy);
    }
  }, [mapReady, myLoc]);

  // ---- Damage data: live from USGS FDSN, seed fallback (see usgsQuake.ts) ----
  useEffect(() => {
    const ac = new AbortController();
    fetchDamageData(ac.signal).then(setDamage).catch(() => {});
    return () => ac.abort();
  }, []);

  // ---- Damage heat + aftershocks overlay (CLAUDE.md urgency emphasis) ----
  // Lives in Leaflet's overlayPane (below markerPane), so center pins stay
  // tappable on top of the heat.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const clear = () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      if (quakeLayerRef.current) {
        map.removeLayer(quakeLayerRef.current);
        quakeLayerRef.current = null;
      }
    };
    if (!showHeat) {
      clear();
      return;
    }
    let cancelled = false;
    loadLeafletHeat()
      .then((L: any) => {
        if (cancelled || !mapRef.current || !L?.heatLayer) return;
        clear();
        heatRef.current = L.heatLayer(damage.points, {
          radius: 42,
          blur: 34,
          minOpacity: 0.22,
          max: 1.0,
          maxZoom: 12, // keep the area readable as you zoom in
          gradient: { 0.2: "#fde68a", 0.4: "#fbbf24", 0.6: "#f97316", 0.8: "#ef4444", 1.0: "#b91c1c" },
        }).addTo(map);
        // Aftershock epicentres as small red markers (USGS only).
        if (damage.aftershocks.length) {
          const grp = L.layerGroup();
          damage.aftershocks.forEach((a) => {
            L.circleMarker([a.lat, a.lng], {
              radius: Math.max(4, Math.min(13, a.mag * 1.7)),
              color: "#b91c1c",
              weight: 1.4,
              fillColor: "#ef4444",
              fillOpacity: 0.45,
            })
              .bindTooltip(`M${a.mag.toFixed(1)} · ${a.place}`, { direction: "top" })
              .addTo(grp);
          });
          grp.addTo(map);
          quakeLayerRef.current = grp;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mapReady, showHeat, damage]);

  return { containerRef, mapRef, markersRef, clusterRef, mapReady, damage };
}
