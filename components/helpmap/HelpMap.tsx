"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ESTATUS_ORDER,
  SM,
  STATE_LABEL,
  T,
  TYPE_META,
  norm,
  slug,
  worst,
  type Estatus,
  type Lang,
  type Location,
  type LocationType,
  type PatientPublic,
  type Sexo,
  type VzlaState,
} from "./data";
import { createClient } from "@/utils/supabase/client";
import { enqueue, flushQueue, queueCount, type IntakeSubmission } from "./intakeQueue";
import {
  copyText,
  nativeShare,
  openShare,
  patientUrl,
  shareText,
  telegramUrl,
  whatsappUrl,
} from "./share";
import { loadLeaflet } from "./leaflet-loader";
import "./helpmap.css";

type View = null | "detail" | "share" | "report" | "admin";
type AdminTab = "centros" | "personas";
type EditType = null | "center" | "person";

const CACHE_KEY = "helpmap:data:v2";

interface Draft {
  // center
  canonical_name?: string;
  type?: LocationType;
  state?: VzlaState;
  municipality?: string;
  lat?: string;
  lng?: string;
  // person
  apellidos?: string;
  nombres?: string;
  ci?: string;
  edad?: string;
  sexo?: Sexo;
  location_id?: string;
  estatus?: Estatus;
}

interface AuthUser {
  email: string | null;
}

export interface HelpMapProps {
  accent?: string;
  mapLabels?: boolean;
  showReport?: boolean;
}

const initials = (p: PatientPublic) =>
  ((p.nombres[0] || "") + (p.apellidos[0] || "")).toUpperCase() || "··";

function Avatar({ p, cls }: { p: PatientPublic; cls: string }) {
  if (p.foto_url) {
    return (
      <div className={cls}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.foto_url} alt="" loading="lazy" />
      </div>
    );
  }
  return <div className={cls}>{initials(p)}</div>;
}

const ICON = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m14 6-6 6 6 6" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.4 13.4 7.2 4.2M15.6 6.4 8.4 10.6" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  chevR: (
    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  wifiOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l22 22M16.7 11.3A6 6 0 0 0 12 9M5 12.5a10 10 0 0 1 4-2.3M8.5 16.4a4 4 0 0 1 5 0M12 20h.01" />
    </svg>
  ),
  wa: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.5c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .1 0 .6-.2 1Z" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  ),
};

export default function HelpMap({ accent, mapLabels = true, showReport = true }: HelpMapProps) {
  const [lang, setLang] = useState<Lang>("es");
  const [view, setView] = useState<View>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Estatus>("all");
  const [stateF, setStateF] = useState<"all" | VzlaState>("all");
  const [locationSel, setLocationSel] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("centros");
  const [editType, setEditType] = useState<EditType>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [patients, setPatients] = useState<PatientPublic[]>([]);
  const [stale, setStale] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Auth
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Public intake form + offline queue
  const [rNom, setRNom] = useState("");
  const [rApe, setRApe] = useState("");
  const [rCi, setRCi] = useState("");
  const [rEdad, setREdad] = useState("");
  const [rMinor, setRMinor] = useState(false);
  const [rLoc, setRLoc] = useState("");
  const [rEstatus, setREstatus] = useState<Estatus>("INGRESADO");
  const [rContact, setRContact] = useState("");
  const [pending, setPending] = useState(() => (typeof window !== "undefined" ? queueCount() : 0));

  const t = T[lang];

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  const locById = useMemo(() => {
    const m: Record<string, Location> = {};
    locations.forEach((l) => (m[l.location_id] = l));
    return m;
  }, [locations]);

  // Data-driven list of states present in the loaded locations (CLAUDE.md §13).
  const statesAvailable = useMemo(() => {
    const set = new Set<VzlaState>();
    locations.forEach((l) => set.add(l.state));
    return Array.from(set).sort();
  }, [locations]);

  const tsMatch = useCallback(
    (p: PatientPublic) => {
      const q = norm(query.trim());
      const textOk = !q || norm(p.nombres + " " + p.apellidos + " " + p.ci_display).includes(q);
      const statusOk = status === "all" || p.estatus === status;
      const stateOk = stateF === "all" || p.state === stateF;
      return textOk && statusOk && stateOk;
    },
    [query, status, stateF],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  }, []);

  // ---- Auth session ------------------------------------------------------
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { email: data.session.user.email ?? null } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- Offline intake queue: flush on load and whenever connection returns --
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const r = await flushQueue();
      if (cancelled) return;
      setPending(queueCount());
      if (r.sent > 0) showToast(t.synced);
    };
    if (typeof navigator === "undefined" || navigator.onLine) sync();
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
    };
  }, [showToast, t.synced]);

  // ---- Data: cache-first, then revalidate from Supabase ------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let hadCache = false;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw) as { locations?: Location[]; patients?: PatientPublic[] };
          if (Array.isArray(c.locations)) {
            setLocations(c.locations);
            hadCache = c.locations.length > 0;
          }
          if (Array.isArray(c.patients)) setPatients(c.patients);
        }
      } catch {
        /* ignore */
      }
      try {
        const supabase = getSupabase();
        const [locRes, patRes] = await Promise.all([
          supabase.from("locations").select("*").eq("active", true),
          // Reads the privacy-filtered VIEW, never the base table (CLAUDE.md §2).
          supabase
            .from("patients_public")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(2000),
        ]);
        if (cancelled) return;
        if (locRes.error) throw locRes.error;
        if (patRes.error) throw patRes.error;
        const locs = (locRes.data ?? []) as Location[];
        const pats = (patRes.data ?? []) as PatientPublic[];
        setLocations(locs);
        setPatients(pats);
        setStale(false);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ locations: locs, patients: pats }));
        } catch {
          /* storage full — non-fatal */
        }
      } catch {
        // Offline / failed: keep showing cached data and flag it as possibly stale.
        if (!cancelled) setStale(hadCache);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Map setup ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        map.setView([10.5, -66.9], 10, { animate: false });
        mapRef.current = map;

        const style = mapLabels !== false ? "light_all" : "light_nolabels";
        tileLayerRef.current = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/" + style + "/{z}/{x}/{y}{r}.png",
          { attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19 },
        ).addTo(map);

        map.attributionControl.setPrefix("");
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 220);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMarker = useCallback(
    (id: string) => {
      // Tapping a center pin opens its list (CLAUDE.md UX request).
      const next = locationSel === id ? null : id;
      setLocationSel(next);
      setSheetOpen(true);
      if (next && mapRef.current) {
        const l = locById[id];
        if (l) mapRef.current.panTo([l.lat, l.lng], { animate: false });
      }
    },
    [locationSel, locById],
  );
  const onMarkerRef = useRef(onMarker);
  useEffect(() => {
    onMarkerRef.current = onMarker;
  }, [onMarker]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mkIcon = (L: any, count: number, color: string, active: boolean, dim: boolean) =>
    L.divIcon({
      className: "mkwrap",
      html:
        '<div class="mk' +
        (active ? " mk-on" : "") +
        (dim ? " mk-dim" : "") +
        '"><span class="mkdot" style="background:' +
        color +
        '"></span><span class="mkn mono">' +
        count +
        "</span></div>",
      iconSize: [42, 26],
      iconAnchor: [21, 26],
    });

  // Create / remove / move markers when locations change.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;
    const markers = markersRef.current;
    const ids = new Set(locations.map((l) => l.location_id));
    Object.keys(markers).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    });
    locations.forEach((l) => {
      if (!markers[l.location_id]) {
        const m = L.marker([l.lat, l.lng], { icon: mkIcon(L, 0, SM.ALTA.color, false, false) }).addTo(map);
        m.on("click", () => onMarkerRef.current(l.location_id));
        markers[l.location_id] = m;
      } else {
        markers[l.location_id].setLatLng([l.lat, l.lng]);
      }
    });
  }, [mapReady, locations]);

  // Update marker icons when filters/data change.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.L) return;
    const markers = markersRef.current;
    const L = window.L;
    locations.forEach((l) => {
      const m = markers[l.location_id];
      if (!m) return;
      const all = patients.filter((p) => p.location_id === l.location_id);
      const vis = all.filter((p) => tsMatch(p));
      const active = locationSel === l.location_id || focusId === l.location_id;
      const dim = vis.length === 0;
      const color = SM[worst(vis.length ? vis : all)].color;
      m.setIcon(mkIcon(L, vis.length, color, active, dim));
      m.setZIndexOffset(active ? 1000 : dim ? -100 : 0);
    });
  }, [mapReady, locations, patients, tsMatch, locationSel, focusId]);

  // ---- Derived list ------------------------------------------------------
  const list = useMemo(
    () => patients.filter((p) => tsMatch(p) && (!locationSel || p.location_id === locationSel)),
    [patients, tsMatch, locationSel],
  );

  const flyTo = (l: Location | undefined, zoom = 14) => {
    if (mapRef.current && l) mapRef.current.setView([l.lat, l.lng], zoom, { animate: false });
  };

  const openDetail = (p: PatientPublic) => {
    setSelId(p.id);
    setView("detail");
    setFocusId(p.location_id);
    setSheetOpen(false); // fold the list so the map (panned below) is visible
    flyTo(locById[p.location_id], 15);
  };

  const selP = patients.find((p) => p.id === selId) || null;
  const selLoc = selP ? locById[selP.location_id] : null;

  // Real sharing: native OS sheet if available, else the in-app share overlay.
  const shareCurrent = async () => {
    if (!selP) return;
    const url = patientUrl(selP.id);
    const text = shareText(selP.nombres + " " + selP.apellidos, SM[selP.estatus][lang], selP.location_name);
    const ok = await nativeShare({ title: selP.nombres + " " + selP.apellidos, text, url });
    if (!ok) setView("share");
  };
  const shareTo = async (target: "wa" | "tg" | "ig" | "copy") => {
    if (!selP) return;
    const url = patientUrl(selP.id);
    const text = shareText(selP.nombres + " " + selP.apellidos, SM[selP.estatus][lang], selP.location_name);
    if (target === "wa") openShare(whatsappUrl(url, text));
    else if (target === "tg") openShare(telegramUrl(url, text));
    else if (target === "ig") {
      const ok = await copyText(url);
      showToast(ok ? t.igCopied : t.copied);
    } else {
      const ok = await copyText(url);
      if (ok) showToast(t.copied);
    }
  };

  const centroidForState = (st: VzlaState): [number, number] | null => {
    const ls = locations.filter((l) => l.state === st);
    if (!ls.length) return null;
    const lat = ls.reduce((a, l) => a + l.lat, 0) / ls.length;
    const lng = ls.reduce((a, l) => a + l.lng, 0) / ls.length;
    return [lat, lng];
  };

  const onSelectState = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as "all" | VzlaState;
    const cur = locationSel ? locById[locationSel] : null;
    const keep = cur && (v === "all" || cur.state === v) ? locationSel : null;
    setStateF(v);
    setLocationSel(keep);
    setSheetOpen(true);
    if (v !== "all") {
      const c = centroidForState(v);
      if (mapRef.current && c) mapRef.current.setView(c, 11, { animate: false });
    }
  };
  const onSelectCenter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const id = v === "all" ? null : v;
    setLocationSel(id);
    setSheetOpen(true);
    if (id) flyTo(locById[id]);
  };
  const seeOnMap = () => {
    if (!selP) return;
    setView(null);
    setLocationSel(selP.location_id);
    setSheetOpen(false); // show the map, not the list
    flyTo(locById[selP.location_id]);
  };

  const resetReport = () => {
    setRNom("");
    setRApe("");
    setRCi("");
    setREdad("");
    setRMinor(false);
    setRLoc("");
    setREstatus("INGRESADO");
    setRContact("");
  };

  // Submit goes to the offline queue first, then we try to flush it to n8n.
  // It never writes to the DB — it's "received for review" (CLAUDE.md §7).
  const submitReport = async () => {
    if ((!rNom.trim() && !rApe.trim()) || !rLoc) {
      showToast(t.reqNameLoc);
      return;
    }
    const edadNum = rEdad ? parseInt(rEdad) : null;
    const isMinor = rMinor || (edadNum != null && edadNum < 18);
    const loc = locById[rLoc];
    const sub: IntakeSubmission = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "i_" + Date.now(),
      createdAt: new Date().toISOString(),
      apellidos: rApe.trim(),
      nombres: rNom.trim(),
      ci: isMinor ? "MENOR" : rCi.trim() || "—",
      is_minor: isMinor,
      edad: edadNum,
      sexo: null,
      location_id: rLoc,
      location_name: loc?.canonical_name ?? "",
      estatus: rEstatus,
      contacto: rContact.trim() || null,
      lang,
      source: "web",
    };
    enqueue(sub);
    resetReport();
    setView(null);
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    if (online) {
      const r = await flushQueue();
      setPending(queueCount());
      showToast(r.sent > 0 ? t.sent : t.queuedOffline);
    } else {
      setPending(queueCount());
      showToast(t.queuedOffline);
    }
  };

  // ---- Admin / draft -----------------------------------------------------
  const setD =
    (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value;
      setDraft((d) => ({ ...(d || {}), [k]: val }));
    };
  const setDV = (k: keyof Draft, v: Draft[keyof Draft]) => () =>
    setDraft((d) => ({ ...(d || {}), [k]: v }));
  const clearEdit = () => {
    setEditType(null);
    setEditId(null);
    setDraft(null);
  };

  const editCenter = (l: Location) => {
    setEditType("center");
    setEditId(l.location_id);
    setDraft({
      canonical_name: l.canonical_name,
      type: l.type,
      state: l.state,
      municipality: l.municipality ?? "",
      lat: String(l.lat),
      lng: String(l.lng),
    });
  };
  const newCenter = () => {
    setEditType("center");
    setEditId(null);
    setDraft({ canonical_name: "", type: "hospital", state: "distrito_capital", municipality: "", lat: "", lng: "" });
  };
  const saveCenter = () => {
    const d = draft || {};
    const lat = parseFloat(d.lat || "");
    const lng = parseFloat(d.lng || "");
    const obj: Location = {
      location_id: editId || "loc_" + Date.now(),
      canonical_name: d.canonical_name || "Centro sin nombre",
      type: d.type || "hospital",
      municipality: d.municipality || null,
      state: d.state || "distrito_capital",
      lat: isFinite(lat) ? lat : 10.5,
      lng: isFinite(lng) ? lng : -66.9,
      contact_phone: editId ? locById[editId]?.contact_phone ?? null : null,
      contact_whatsapp: editId ? locById[editId]?.contact_whatsapp ?? null : null,
      active: true,
    };
    setLocations((ls) => (editId ? ls.map((l) => (l.location_id === obj.location_id ? obj : l)) : [...ls, obj]));
    clearEdit();
    showToast(t.savedC);
  };
  const deleteCenter = (id: string) => {
    setLocations((ls) => ls.filter((l) => l.location_id !== id));
    setPatients((ps) => ps.filter((p) => p.location_id !== id));
    setLocationSel((cur) => (cur === id ? null : cur));
    clearEdit();
    showToast(t.deleted);
  };

  const editPerson = (p: PatientPublic) => {
    setEditType("person");
    setEditId(p.id);
    setDraft({
      apellidos: p.apellidos,
      nombres: p.nombres,
      ci: p.is_minor ? "" : p.ci_display,
      edad: p.edad != null ? String(p.edad) : "",
      sexo: p.sexo ?? "F",
      location_id: p.location_id,
      estatus: p.estatus,
    });
  };
  const newPerson = () => {
    setEditType("person");
    setEditId(null);
    setDraft({
      apellidos: "",
      nombres: "",
      ci: "",
      edad: "",
      sexo: "F",
      location_id: locations[0]?.location_id ?? "",
      estatus: "INGRESADO",
    });
  };
  const savePerson = () => {
    const d = draft || {};
    const loc = locById[d.location_id || ""] || locations[0];
    if (!loc) {
      showToast(t.deleted);
      return;
    }
    const edad = d.edad ? parseInt(d.edad) : null;
    const isMinor = edad != null && edad < 18;
    const prev = editId ? patients.find((x) => x.id === editId) : undefined;
    const obj: PatientPublic = {
      id: editId || "p_" + Date.now(),
      apellidos: d.apellidos || "",
      nombres: d.nombres || "",
      ci_display: isMinor ? "MENOR" : d.ci || "—",
      is_minor: isMinor,
      edad,
      sexo: (d.sexo as Sexo) || null,
      location_id: loc.location_id,
      location_name: loc.canonical_name,
      location_type: loc.type,
      municipality: loc.municipality,
      state: loc.state,
      lat: loc.lat,
      lng: loc.lng,
      estatus: (d.estatus as Estatus) || "INGRESADO",
      foto_url: isMinor ? null : prev?.foto_url ?? null,
      verified: prev?.verified ?? false,
      updated_at: new Date().toISOString(),
    };
    setPatients((ps) => (editId ? ps.map((p) => (p.id === obj.id ? obj : p)) : [obj, ...ps]));
    clearEdit();
    showToast(t.savedP);
  };
  const deletePerson = (id: string) => {
    setPatients((ps) => ps.filter((p) => p.id !== id));
    clearEdit();
    showToast(t.deleted);
  };

  // ---- Auth handlers -----------------------------------------------------
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginErr("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPass,
      });
      if (error) setLoginErr(t.loginError);
      else setLoginPass("");
    } catch {
      setLoginErr(t.loginError);
    } finally {
      setLoginBusy(false);
    }
  };
  const signOut = async () => {
    await getSupabase().auth.signOut();
    clearEdit();
  };

  // ---- Derived view bits -------------------------------------------------
  const centerFilterOpts = locations.filter((l) => stateF === "all" || l.state === stateF);
  const statusOpts: { v: Estatus; label: string }[] = ESTATUS_ORDER.map((k) => ({ v: k, label: SM[k][lang] }));
  const canDelete = !!(editType && editId);

  const chips: { key: "all" | Estatus; label: string; dotCls: string }[] = [
    { key: "all", label: t.all, dotCls: "" },
    { key: "INGRESADO", label: SM.INGRESADO[lang], dotCls: "cdot-adm" },
    { key: "ALTA", label: SM.ALTA[lang], dotCls: "cdot-ok" },
    { key: "FALLECIDO", label: SM.FALLECIDO[lang], dotCls: "cdot-dec" },
  ];

  const rootStyle = accent ? ({ ["--accent"]: accent } as React.CSSProperties) : undefined;

  const selStateLoc = locationSel ? locById[locationSel] : null;
  const showDonationInfo =
    !!selStateLoc && (selStateLoc.type === "donation_centre" || (list.length === 0 && !query && status === "all"));

  return (
    <div className="app" style={rootStyle}>
      <div className="map" ref={containerRef}></div>

      <div className="topbar">
        <div className="hrow">
          <div className="brand">
            <span className="logo"></span>
            <div className="bcol">
              <span className="bname">{t.appName}</span>
              <span className="btag">{t.tagline}</span>
            </div>
          </div>
          <div className="hright">
            {/* Admin entry is hidden from the public UI; it only appears once a
                Supabase session exists (sign in via the local /signup page). */}
            {user && (
              <button
                className="gear"
                onClick={() => {
                  setView("admin");
                  setAdminTab("centros");
                  clearEdit();
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                  <circle cx="9" cy="6" r="2.2" fill="#fff" />
                  <circle cx="15" cy="12" r="2.2" fill="#fff" />
                  <circle cx="8" cy="18" r="2.2" fill="#fff" />
                </svg>
              </button>
            )}
            <div className="lang">
              <button className={"lg " + (lang === "es" ? "lg-on" : "")} onClick={() => setLang("es")}>
                ES
              </button>
              <button className={"lg " + (lang === "en" ? "lg-on" : "")} onClick={() => setLang("en")}>
                EN
              </button>
            </div>
          </div>
        </div>

        <div className="searchbar">
          <svg className="si" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            className="sinput"
            placeholder={t.search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSheetOpen(true);
            }}
          />
          {!!query && (
            <button className="sx" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="frow2">
          <div className="fdrop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V8l5-4 5 4M19 21V11l-4-3M9 21v-4h2v4" />
            </svg>
            <select value={stateF} onChange={onSelectState}>
              <option value="all">{t.allStates}</option>
              {statesAvailable.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="fdrop">
            {ICON.pin}
            <select value={locationSel || "all"} onChange={onSelectCenter}>
              <option value="all">{t.allCenters}</option>
              {centerFilterOpts.map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.canonical_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.key}
              className={"chip " + (status === c.key ? "chip-on" : "")}
              onClick={() => {
                setStatus(c.key);
                setSheetOpen(true);
              }}
            >
              {c.key !== "all" && <span className={"cdot " + c.dotCls}></span>}
              {c.label}
            </button>
          ))}
        </div>

        {stale && (
          <div className="stale">
            {ICON.wifiOff}
            {t.staleData}
          </div>
        )}
      </div>

      {(showReport ?? true) && !view && (
        <button className="fab" onClick={() => setView("report")}>
          {ICON.plus}
          {t.report}
        </button>
      )}

      <div className={"sheet " + (sheetOpen ? "sheet-open" : "")}>
        <button className="handle" onClick={() => setSheetOpen((s) => !s)}>
          <span className="hbar"></span>
          <div className="hrow2">
            <span className="hcount">
              <b>{list.length}</b> {t.people}
            </span>
            <span className="f1"></span>
            {!!locationSel && (
              <span className="hctx">
                <span>{locById[locationSel]?.canonical_name ?? ""}</span>
                <i
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocationSel(null);
                  }}
                >
                  ✕
                </i>
              </span>
            )}
            <svg
              className={"hchev " + (sheetOpen ? "hchev-up" : "")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>
        <div className="list">
          {list.map((p) => (
            <button key={p.id} className={"card " + SM[p.estatus].cls} onClick={() => openDetail(p)}>
              <Avatar p={p} cls="av" />
              <div className="cmid">
                <span className="cname">
                  {p.nombres + " " + p.apellidos}
                  {p.verified && <span className="vchk"> {ICON.check}</span>}
                </span>
                <span className="cmeta">
                  {[p.edad != null ? p.edad + " " + t.yrs : null, p.sexo].filter(Boolean).join(" · ")}
                </span>
                <span className="cloc">
                  {ICON.pin}
                  {p.location_name}
                </span>
              </div>
              <div className="cend">
                <span className="badge">
                  <span className="dot"></span>
                  {SM[p.estatus][lang]}
                </span>
                {ICON.chevR}
              </div>
            </button>
          ))}
          {list.length === 0 && !showDonationInfo && <div className="empty">{t.noResults}</div>}
          {list.length === 0 && showDonationInfo && selStateLoc && (
            <div className="locinfo">
              <div className="empty">
                {selStateLoc.type === "donation_centre" ? t.donationInfo : t.noPatientsHere}
              </div>
              {(selStateLoc.contact_whatsapp || selStateLoc.contact_phone) && (
                <div className="dactions">
                  {selStateLoc.contact_whatsapp && (
                    <a
                      className="btnp"
                      href={`https://wa.me/${selStateLoc.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {ICON.wa}
                      {t.whatsapp}
                    </a>
                  )}
                  {selStateLoc.contact_phone && (
                    <a className="btng" href={`tel:${selStateLoc.contact_phone}`}>
                      {ICON.phone}
                      {t.call}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Detail overlay ---- */}
      {view === "detail" && selP && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView(null)}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.detailTitle}</span>
            <button className="oicon" onClick={shareCurrent}>
              {ICON.share}
            </button>
          </div>
          <div className="ovbody">
            <div className={"dhero " + SM[selP.estatus].cls}>
              <Avatar p={selP} cls="dav" />
              <span className="dname">{selP.nombres + " " + selP.apellidos}</span>
              <span className="badge">
                <span className="dot"></span>
                {SM[selP.estatus][lang]}
              </span>
              {selP.verified && (
                <span className="vchk">
                  {ICON.check}
                  {t.verifiedYes}
                </span>
              )}
            </div>
            <div className="drows">
              {[
                { label: t.ci, value: selP.ci_display, mono: "mono" },
                { label: t.edad, value: selP.edad != null ? selP.edad + " " + t.yrs : "—", mono: "" },
                { label: t.sexo, value: selP.sexo === "F" ? t.female : selP.sexo === "M" ? t.male : "—", mono: "" },
                { label: t.ubic, value: selP.location_name, mono: "" },
                { label: t.type, value: TYPE_META[selP.location_type][lang], mono: "" },
                { label: t.municipality, value: selP.municipality ?? "—", mono: "" },
                { label: t.state, value: STATE_LABEL[selP.state], mono: "" },
                { label: t.verified, value: selP.verified ? t.verifiedYes : t.verifiedNo, mono: "" },
              ].map((r, i) => (
                <div className="drow" key={i}>
                  <span className="dlabel">{r.label}</span>
                  <span className={"dval " + r.mono}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="dupdated">
              {t.updatedAgo + " " + new Date(selP.updated_at).toLocaleString(lang === "es" ? "es-VE" : "en-US")}
            </div>
            <div className="dactions">
              <button className="btnp" onClick={shareCurrent}>
                {ICON.share}
                {t.share}
              </button>
              <button className="btng" onClick={seeOnMap}>
                {ICON.pin}
                {t.seeMap}
              </button>
              {selLoc?.contact_whatsapp && (
                <a
                  className="btng"
                  href={`https://wa.me/${selLoc.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ICON.wa}
                  {t.whatsapp}
                </a>
              )}
              {selLoc?.contact_phone && (
                <a className="btng" href={`tel:${selLoc.contact_phone}`}>
                  {ICON.phone}
                  {t.call}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Share overlay ---- */}
      {view === "share" && selP && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView("detail")}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.shareTitle}</span>
          </div>
          <div className="ovbody">
            <p className="sdesc">{t.shareDesc}</p>
            <div className="chat">
              <div className="bubble">
                <div className={"ogcard " + SM[selP.estatus].cls}>
                  <div className="ogimg">
                    {selP.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selP.foto_url} alt="" />
                    ) : (
                      initials(selP)
                    )}
                  </div>
                  <div className="ogtxt">
                    <span className="ogk">{t.cardKicker + " · HELPMAP"}</span>
                    <span className="ogname">{selP.nombres + " " + selP.apellidos}</span>
                    <span className="ogmeta">
                      <span className="dot"></span>
                      {SM[selP.estatus][lang] + " · " + selP.location_name}
                    </span>
                    <span className="ogurl">{"helpmap.ve/p/" + slug(selP.nombres + " " + selP.apellidos)}</span>
                  </div>
                </div>
                <span className="blink">{"helpmap.ve/p/" + slug(selP.nombres + " " + selP.apellidos)}</span>
                <span className="btime">12:48 ✓✓</span>
              </div>
            </div>
            <div className="targets">
              <button className="tgt" onClick={() => shareTo("wa")}>
                <span className="ti ti-wa">WA</span>WhatsApp
              </button>
              <button className="tgt" onClick={() => shareTo("tg")}>
                <span className="ti ti-tg">TG</span>Telegram
              </button>
              <button className="tgt" onClick={() => shareTo("ig")}>
                <span className="ti ti-ig">IG</span>Instagram
              </button>
              <button className="tgt" onClick={() => shareTo("copy")}>
                <span className="ti ti-cp">↗</span>
                {t.copyLink}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Report overlay (public intake; submits for review, not to DB) ---- */}
      {view === "report" && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView(null)}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.reportTitle}</span>
          </div>
          <div className="ovbody">
            <div className="form">
              {pending > 0 && (
                <div className="stale">
                  {ICON.wifiOff}
                  {pending} {t.pendingSync}
                </div>
              )}
              <div className="fld">
                <span className="flabel">{t.f_ape}</span>
                <input className="finput" placeholder={t.f_ape} value={rApe} onChange={(e) => setRApe(e.target.value)} />
              </div>
              <div className="fld">
                <span className="flabel">{t.f_nom}</span>
                <input className="finput" placeholder={t.f_nom} value={rNom} onChange={(e) => setRNom(e.target.value)} />
              </div>
              <div className="fld">
                <span className="flabel">{t.f_minor}</span>
                <div className="seg">
                  <button className={"segb " + (!rMinor ? "segb-on" : "")} onClick={() => setRMinor(false)}>
                    {t.no}
                  </button>
                  <button className={"segb " + (rMinor ? "segb-on" : "")} onClick={() => setRMinor(true)}>
                    {t.yes}
                  </button>
                </div>
              </div>
              <div className="frow">
                <div className="fld">
                  <span className="flabel">{t.f_ci}</span>
                  <input
                    className="finput mono"
                    placeholder="V-00.000.000"
                    value={rMinor ? "MENOR" : rCi}
                    onChange={(e) => setRCi(e.target.value)}
                    disabled={rMinor}
                  />
                </div>
                <div className="fld">
                  <span className="flabel">{t.f_edad}</span>
                  <input className="finput" placeholder="00" inputMode="numeric" value={rEdad} onChange={(e) => setREdad(e.target.value)} />
                </div>
              </div>
              <div className="fld">
                <span className="flabel">{t.f_ubic}</span>
                <select className="fselect" value={rLoc} onChange={(e) => setRLoc(e.target.value)}>
                  <option value="">{t.selectHosp}</option>
                  {locations.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.canonical_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <span className="flabel">{t.f_status}</span>
                <select className="fselect" value={rEstatus} onChange={(e) => setREstatus(e.target.value as Estatus)}>
                  {statusOpts.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <span className="flabel">{t.f_contact}</span>
                <input className="finput" placeholder="+58…" value={rContact} onChange={(e) => setRContact(e.target.value)} />
              </div>
              {!rMinor && (
                <div className="fld">
                  <span className="flabel">{t.f_photo}</span>
                  <div className="upload">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 16V4M8 8l4-4 4 4" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                    {t.f_photoHint}
                  </div>
                </div>
              )}
              <div className="note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
                {t.note}
              </div>
              <button className="btnp" onClick={submitReport}>
                {t.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Admin overlay (Supabase Auth protected) ---- */}
      {view === "admin" && (
        <div className="overlay">
          <div className="ovhead">
            <button
              className="oicon"
              onClick={() => {
                setView(null);
                clearEdit();
              }}
            >
              {ICON.back}
            </button>
            <span className="ohtitle">{t.adminTitle}</span>
            {user && (
              <button className="signout" onClick={signOut}>
                {t.signOut}
              </button>
            )}
          </div>

          {!user ? (
            <div className="loginwrap">
              <form className="form" onSubmit={signIn}>
                <div className="fld">
                  <span className="flabel">{t.email}</span>
                  <input
                    className="finput"
                    type="email"
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@helpmap.ve"
                  />
                </div>
                <div className="fld">
                  <span className="flabel">{t.password}</span>
                  <input
                    className="finput"
                    type="password"
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {loginErr && <span className="lerr">{loginErr}</span>}
                <button className="btnp" type="submit" disabled={loginBusy}>
                  {loginBusy ? "…" : t.signIn}
                </button>
              </form>
              <div className="loginhint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                {t.loginHint}
              </div>
            </div>
          ) : (
            <>
              {!editType && (
                <div className="admtabs">
                  <button
                    className={"atab " + (adminTab === "centros" ? "atab-on" : "")}
                    onClick={() => {
                      setAdminTab("centros");
                      clearEdit();
                    }}
                  >
                    {t.tabCenters}
                  </button>
                  <button
                    className={"atab " + (adminTab === "personas" ? "atab-on" : "")}
                    onClick={() => {
                      setAdminTab("personas");
                      clearEdit();
                    }}
                  >
                    {t.tabPeople}
                  </button>
                </div>
              )}
              <div className="ovbody">
                <div className="note" style={{ marginBottom: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                  {t.adminLocalNote}
                </div>

                {adminTab === "centros" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newCenter}>
                      {ICON.plus}
                      {t.addCenter}
                    </button>
                    {locations.map((l) => (
                      <div className="arow" key={l.location_id}>
                        <div className="ai">
                          <div className="aname">{l.canonical_name}</div>
                          <div className="asub">
                            {STATE_LABEL[l.state] + " · " + (l.municipality ?? "—") + " · " + TYPE_META[l.type][lang]}
                          </div>
                        </div>
                        <div className="aacts">
                          <span className="acount">
                            {patients.filter((p) => p.location_id === l.location_id).length + " " + t.records}
                          </span>
                          <button className="amini" onClick={() => editCenter(l)}>
                            {ICON.edit}
                          </button>
                          <button className="amini del" onClick={() => deleteCenter(l.location_id)}>
                            {ICON.trash}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "personas" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newPerson}>
                      {ICON.plus}
                      {t.addPerson}
                    </button>
                    {patients.map((p) => (
                      <div className={"arow " + SM[p.estatus].cls} key={p.id}>
                        <div className="ai">
                          <div className="aname">{p.nombres + " " + p.apellidos}</div>
                          <div className="asub">{p.location_name}</div>
                        </div>
                        <div className="aacts">
                          <span className="abadge">{SM[p.estatus][lang]}</span>
                          <button className="amini" onClick={() => editPerson(p)}>
                            {ICON.edit}
                          </button>
                          <button className="amini del" onClick={() => deletePerson(p.id)}>
                            {ICON.trash}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {editType === "center" && (
                  <div className="form">
                    <div className="fld">
                      <span className="flabel">{t.f_name}</span>
                      <input className="finput" value={draft?.canonical_name || ""} onChange={setD("canonical_name")} placeholder={t.f_name} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.type}</span>
                      <select className="fselect" value={draft?.type || "hospital"} onChange={setD("type")}>
                        {(Object.keys(TYPE_META) as LocationType[]).map((k) => (
                          <option key={k} value={k}>
                            {TYPE_META[k][lang]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_city}</span>
                      <select className="fselect" value={draft?.state || "distrito_capital"} onChange={setD("state")}>
                        {(Object.keys(STATE_LABEL) as VzlaState[]).map((s) => (
                          <option key={s} value={s}>
                            {STATE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_parish}</span>
                      <input className="finput" value={draft?.municipality || ""} onChange={setD("municipality")} placeholder={t.f_parish} />
                    </div>
                    <div className="frow">
                      <div className="fld">
                        <span className="flabel">{t.f_lat}</span>
                        <input className="finput mono" value={draft?.lat || ""} onChange={setD("lat")} placeholder="10.50" inputMode="decimal" />
                      </div>
                      <div className="fld">
                        <span className="flabel">{t.f_lng}</span>
                        <input className="finput mono" value={draft?.lng || ""} onChange={setD("lng")} placeholder="-66.90" inputMode="decimal" />
                      </div>
                    </div>
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={saveCenter}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deleteCenter(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}

                {editType === "person" && (
                  <div className="form">
                    <div className="fld">
                      <span className="flabel">{t.f_ape}</span>
                      <input className="finput" value={draft?.apellidos || ""} onChange={setD("apellidos")} placeholder={t.f_ape} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_nom}</span>
                      <input className="finput" value={draft?.nombres || ""} onChange={setD("nombres")} placeholder={t.f_nom} />
                    </div>
                    <div className="frow">
                      <div className="fld">
                        <span className="flabel">{t.f_ci}</span>
                        <input className="finput mono" value={draft?.ci || ""} onChange={setD("ci")} placeholder="V-00.000.000" />
                      </div>
                      <div className="fld">
                        <span className="flabel">{t.f_edad}</span>
                        <input className="finput" value={draft?.edad || ""} onChange={setD("edad")} placeholder="00" inputMode="numeric" />
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_sexo}</span>
                      <div className="seg">
                        <button className={"segb " + (draft?.sexo === "F" ? "segb-on" : "")} onClick={setDV("sexo", "F")}>
                          {t.female}
                        </button>
                        <button className={"segb " + (draft?.sexo === "M" ? "segb-on" : "")} onClick={setDV("sexo", "M")}>
                          {t.male}
                        </button>
                      </div>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_center}</span>
                      <select className="fselect" value={draft?.location_id || ""} onChange={setD("location_id")}>
                        {locations.map((l) => (
                          <option key={l.location_id} value={l.location_id}>
                            {l.canonical_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_status}</span>
                      <select className="fselect" value={draft?.estatus || "INGRESADO"} onChange={setD("estatus")}>
                        {statusOpts.map((s) => (
                          <option key={s.v} value={s.v}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={savePerson}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deletePerson(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!!toast && <div className="toast">{toast}</div>}
    </div>
  );
}
