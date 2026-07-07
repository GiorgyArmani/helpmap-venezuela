"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ESTATUS_ORDER,
  SM,
  STATE_LABEL,
  T,
  TYPE_META,
  norm,
  protectMinor,
  protectMinorRescatado,
  type Donation,
  type Estatus,
  type Lang,
  type Location,
  type LocationType,
  type PatientPublic,
  type Refugio,
  type Rescatado,
  type RescatadoPublic,
  type Sexo,
  type VolunteerRequest,
  type VzlaState,
} from "./data";
import { createClient } from "@/utils/supabase/client";
import { flushQueue, queueCount } from "./intakeQueue";
import { compressImage, LIST_OPTS } from "./uploadPhoto";
import {
  copyText,
  nativeShare,
  mapsDirectionsUrl,
  openShare,
  patientUrl,
  shareStoryImage,
  shareText,
  telegramUrl,
  whatsappUrl,
} from "./share";
import { loadLeaflet, loadLeafletHeat } from "./leaflet-loader";
import { fetchDamageData, SEED_DAMAGE, type DamageData } from "./usgsQuake";
import Tour from "./Tour";
import "./helpmap.css";

import { ICON } from "./icons";
import { Avatar } from "./Avatar";
import { RescuedView } from "./RescuedView";
import { RefugiosView } from "./RefugiosView";
import { ShareView } from "./ShareView";
import { DonateView } from "./DonateView";
import { DetailView } from "./DetailView";
import { ReportMissingView } from "./ReportMissingView";
import { ContactView } from "./ContactView";
import { ContributeView } from "./ContributeView";
import { VolunteerView } from "./VolunteerView";
import { ReportView } from "./ReportView";
import { timeAgo, veStateFromAddress, municipalityFromAddress } from "./helpers";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  VOL_PROFILES,
  AUDIT_LABEL,
  CACHE_KEY,
  TOUR_KEY,
  STAFF_TOUR_KEY,
} from "./constants";
import type {
  View,
  AdminTab,
  AuditEntry,
  MissingReport,
  EditType,
  Draft,
  AuthUser,
  HelpMapProps,
} from "./types";

export default function HelpMap({ accent, mapLabels = true, showReport = true }: HelpMapProps) {
  const [lang, setLang] = useState<Lang>("es");
  const [view, setView] = useState<View>(null);
  const [volAutoForm, setVolAutoForm] = useState(false); // deep-link (?ayuda=1) opens the signup form directly
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Estatus>("all");
  const [stateF, setStateF] = useState<"all" | VzlaState>("all");
  const [locationSel, setLocationSel] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [adminTab, setAdminTab] = useState<AdminTab>("centros");
  const [admQ, setAdmQ] = useState(""); // in-panel search filter for the list tabs
  const [editType, setEditType] = useState<EditType>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoResults, setGeoResults] = useState<
    Array<{ lat: number; lng: number; label: string; address?: Record<string, string> }>
  >([]);

  const [locations, setLocations] = useState<Location[]>([]);
  const [patients, setPatients] = useState<PatientPublic[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [rescatados, setRescatados] = useState<RescatadoPublic[]>([]); // rescued, not yet transferred (no map pin)
  const [refugios, setRefugios] = useState<Refugio[]>([]); // shelter needs/donations info (companion to shelter locations)
  const [rescAdmin, setRescAdmin] = useState<Rescatado[]>([]); // staff-only full base rows for the admin tab
  const [stale, setStale] = useState(false);
  const [maintenance, setMaintenance] = useState(false); // site-wide maintenance banner (admin toggle, app_settings)
  const [maintBusy, setMaintBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showHeat, setShowHeat] = useState(false); // damage heat overlay off by default (user toggles "Daños")
  const [damage, setDamage] = useState<DamageData>(SEED_DAMAGE); // USGS-fed, seed fallback

  // Auth
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // true only if the user has an admin role row
  const [isVolunteer, setIsVolunteer] = useState(false); // admin OR volunteer (staff)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Volunteer management (admin) + list upload (staff)
  const [volunteers, setVolunteers] = useState<{ user_id: string; email: string }[]>([]);
  const [volReqs, setVolReqs] = useState<VolunteerRequest[]>([]); // pending applications (admin)
  const [reports, setReports] = useState<MissingReport[]>([]); // pending missing-person reports (staff)
  const [volEmail, setVolEmail] = useState("");
  const [volPass, setVolPass] = useState("");
  const [volBusy, setVolBusy] = useState(false);

  // Public volunteer signup (in the "Súmate al voluntariado" panel)
  const [listBusy, setListBusy] = useState(false);
  const [listNote, setListNote] = useState("");
  const [listLoc, setListLoc] = useState("");
  const [listDate, setListDate] = useState(""); // date the list corresponds to (yyyy-mm-dd), optional
  // In-app result banner after a lists upload (a toast fades / can be missed on 3G).
  const [listResult, setListResult] = useState<{ kind: "ok" | "partial" | "error"; msg: string } | null>(null);
  const [listProgress, setListProgress] = useState<{ done: number; total: number } | null>(null);

  // Public "write to us" form (in-app email + image attachments)
  // Contribution-photo publish confirmation (in-app modal, not window.confirm): holds
  // the pending contribution id when approving a photo onto an already-verified record.
  const [pubConfirm, setPubConfirm] = useState<string | null>(null);
  // Why the user is writing: drives the email subject + form copy. The contact form
  // is only reached from the volunteer / donations CTAs (no generic contact entry).
  const [contactKind, setContactKind] = useState<"volunteer" | "donation" | "contact">("contact");

  // Public "Aportar foto / info" on an existing record (→ contributions moderation
  // queue, NOT the intake funnel — intake is for people not yet in the system).
  // Staff review queue (admin/volunteer)
  const [contribs, setContribs] = useState<
    { id: string; patient_id: string; patient_name: string; foto_url: string | null; descripcion: string | null; contacto: string | null }[]
  >([]);
  // Activity feed ("Novedades") — recent changes from the DB audit_log.
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  // Public intake form + offline queue
  // FAB "+" menu (Reportar desaparecido / Aportar datos).
  const [fabOpen, setFabOpen] = useState(false);
  // Report-a-missing-person form (the public "Reportar" flow → /api/reports).
  const [pending, setPending] = useState(() => (typeof window !== "undefined" ? queueCount() : 0));
  const [tourOpen, setTourOpen] = useState(false);
  const [staffTourOpen, setStaffTourOpen] = useState(false);

  const t = T[lang];
  // Upper bound for the "fecha del dato" pickers — data can't be from the future.
  const todayISO = new Date().toISOString().slice(0, 10);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quakeLayerRef = useRef<any>(null); // aftershock markers (USGS)
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

  // Shelter needs/donations info, keyed by the shared location_id.
  const refugioById = useMemo(() => {
    const m: Record<string, Refugio> = {};
    refugios.forEach((r) => (m[r.location_id] = r));
    return m;
  }, [refugios]);

  // Reconcile refugios against existing "real" centers. AcopioVE lists some hospitals as
  // refuges, so a refugio can land on top of a hospital already in `locations` → two
  // stacked pins (the bug). If a refugio sits within ~130m of a NON-refugio location, it's
  // "shadowed": we drop its own pin + dropdown entry and surface its needs on that center.
  const { shadowedRefugios, needsForCenter } = useMemo(() => {
    const shadowed = new Set<string>();
    const needs: Record<string, Refugio> = {};
    const refLocs = locations.filter((l) => refugioById[l.location_id]);
    const realLocs = locations.filter((l) => !refugioById[l.location_id]);
    const M_PER_DEG = 111320;
    for (const rl of refLocs) {
      let best: { id: string; d: number } | null = null;
      for (const cl of realLocs) {
        const dLat = (rl.lat - cl.lat) * M_PER_DEG;
        const dLng = (rl.lng - cl.lng) * M_PER_DEG * Math.cos((rl.lat * Math.PI) / 180);
        const d = Math.hypot(dLat, dLng);
        if (d <= 130 && (!best || d < best.d)) best = { id: cl.location_id, d };
      }
      if (best) {
        shadowed.add(rl.location_id);
        // If several refugios map to the same center, keep the nearest one's needs.
        const prev = needs[best.id];
        if (!prev) needs[best.id] = refugioById[rl.location_id];
      }
    }
    return { shadowedRefugios: shadowed, needsForCenter: needs };
  }, [locations, refugioById]);

  // Locations that get a map pin — shadowed refugios are merged onto their coincident
  // center, so they don't stack a duplicate pin.
  const mapLocations = useMemo(
    () => locations.filter((l) => !shadowedRefugios.has(l.location_id)),
    [locations, shadowedRefugios],
  );

  // Refugio needs list (the "cómo colaborar" surface). Join each refugio to its location
  // for name/place/coords/contacts, honor the current state filter, and rank the ones
  // that reported needs first so the most actionable rise to the top.
  const refugioNeeds = useMemo(() => {
    const score = (r: Refugio) => (r.necesita ? 2 : 0) + (r.recibe.length ? 1 : 0);
    return refugios
      .map((r) => ({ r, loc: locById[r.location_id] }))
      .filter(
        (x): x is { r: Refugio; loc: Location } =>
          !!x.loc &&
          (stateF === "all" || x.loc.state === stateF) &&
          (!!x.r.necesita || x.r.recibe.length > 0), // only actionable rows → matches the bar
      )
      .sort((a, b) => score(b.r) - score(a.r) || a.loc.canonical_name.localeCompare(b.loc.canonical_name));
  }, [refugios, locById, stateF]);
  const needyCount = refugioNeeds.length;

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
    // Resolve the admin role from the `admin_users` table. Real enforcement is
    // RLS (is_admin()); this only decides whether to show the admin UI.
    const resolveRole = async (uid: string | undefined) => {
      if (!uid) {
        setIsAdmin(false);
        setIsVolunteer(false);
        return;
      }
      const { data } = await supabase.from("admin_users").select("role").eq("user_id", uid).maybeSingle();
      const role = data?.role;
      setIsAdmin(role === "admin");
      setIsVolunteer(role === "admin" || role === "volunteer");
    };
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? { email: data.session.user.email ?? null } : null);
      resolveRole(data.session?.user?.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
      resolveRole(session?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- First-run app tour (shown once; reopenable from the header "?") -------
  // Reads localStorage, which doesn't exist during SSR, so this must run in an
  // effect (not a lazy initializer). The one-time setState is intentional.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't pop the first-run tour over the /inicio "ayudar" deep-link.
    const wantsAyuda = new URLSearchParams(window.location.search).get("ayuda") === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!wantsAyuda && !localStorage.getItem(TOUR_KEY)) setTourOpen(true);
  }, []);

  // Deep-link from the /inicio QR gate: `?ayuda=1` opens the "ayudar" (registration)
  // panel directly, then strips the param so a refresh/share doesn't re-trigger it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("ayuda") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVolAutoForm(true); // skip the intro panel → open the form directly
    setView("volunteer");
    params.delete("ayuda");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
  }, []);
  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* storage unavailable — non-fatal */
    }
  };

  // ---- Staff onboarding tour (shown once per session; reopenable from the panel) --
  // Fires once a staff session is resolved, once per BROWSER SESSION (sessionStorage):
  // shown when they start using the app, never repeated that session; reappears on a
  // fresh session so volunteers get up to date again next time they sit down.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((isAdmin || isVolunteer) && !tourOpen && !sessionStorage.getItem(STAFF_TOUR_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStaffTourOpen(true);
    }
  }, [isAdmin, isVolunteer, tourOpen]);
  const closeStaffTour = () => {
    setStaffTourOpen(false);
    try {
      sessionStorage.setItem(STAFF_TOUR_KEY, "1");
    } catch {
      /* storage unavailable — non-fatal */
    }
  };
  const openStaffTour = () => setStaffTourOpen(true); // manual reopen from the panel

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
          const c = JSON.parse(raw) as {
            locations?: Location[];
            patients?: PatientPublic[];
            donations?: Donation[];
            rescatados?: RescatadoPublic[];
            refugios?: Refugio[];
          };
          if (Array.isArray(c.locations)) {
            setLocations(c.locations);
            hadCache = c.locations.length > 0;
          }
          // Re-enforce minor protection on cached data — a stale/poisoned cache
          // must never reintroduce a minor photo/CI (CLAUDE.md §2).
          if (Array.isArray(c.patients)) setPatients(c.patients.map(protectMinor));
          if (Array.isArray(c.donations)) setDonations(c.donations);
          if (Array.isArray(c.rescatados)) setRescatados(c.rescatados.map(protectMinorRescatado));
          if (Array.isArray(c.refugios)) setRefugios(c.refugios);
        }
      } catch {
        /* ignore */
      }
      try {
        const supabase = getSupabase();
        // PostgREST caps a single response at db-max-rows (default 1000), so `.limit()`
        // alone silently truncates once we pass ~1000 records (the "1000 personas" bug).
        // Page through with .range() until a short page comes back to fetch them all.
        const fetchAll = async (
          table: string,
          orderCol: string,
        ): Promise<{ data: any[] | null; error: any }> => {
          const PAGE = 1000;
          const all: any[] = [];
          for (let from = 0; ; from += PAGE) {
            const { data, error } = await supabase
              .from(table)
              .select("*")
              .order(orderCol, { ascending: false })
              .range(from, from + PAGE - 1);
            if (error) return { data: null, error };
            const rows = data ?? [];
            all.push(...rows);
            if (rows.length < PAGE) break; // last page
          }
          return { data: all, error: null };
        };
        const [locRes, patRes, donRes, setRes, rescRes, refRes] = await Promise.all([
          supabase.from("locations").select("*").eq("active", true),
          // Reads the privacy-filtered VIEW, never the base table (CLAUDE.md §2).
          fetchAll("patients_public", "updated_at"),
          supabase.from("donations").select("*").eq("active", true).order("sort", { ascending: true }),
          // Maintenance flag — non-critical; tolerate the table not existing yet.
          supabase.from("app_settings").select("maintenance").eq("id", 1).maybeSingle(),
          // Rescued (not-yet-transferred) people — privacy-filtered VIEW, non-critical.
          fetchAll("rescatados_public", "created_at"),
          // Shelter needs/donations info — non-critical; tolerate the table not existing yet.
          supabase.from("refugios").select("*"),
        ]);
        if (cancelled) return;
        if (locRes.error) throw locRes.error;
        if (patRes.error) throw patRes.error;
        // Maintenance banner: best-effort, never blocks the load.
        if (!setRes.error && setRes.data) setMaintenance(!!setRes.data.maintenance);
        // Donations are non-critical: if the table/policies aren't there yet, don't
        // blow up the whole load — keep whatever we have (cache/seed).
        const dons = donRes.error ? null : ((donRes.data ?? []) as Donation[]);
        // Rescatados are non-critical too (table may not exist yet). Minor-protected.
        const resc = rescRes.error ? null : ((rescRes.data ?? []) as RescatadoPublic[]).map(protectMinorRescatado);
        // Refugios are non-critical (table may not exist yet); no privacy filter needed.
        const refs = refRes.error ? null : ((refRes.data ?? []) as Refugio[]);
        const locs = (locRes.data ?? []) as Location[];
        // Defense in depth: enforce minor protection on every record from the
        // view before it touches state or the cache (CLAUDE.md §2).
        const pats = ((patRes.data ?? []) as PatientPublic[]).map(protectMinor);
        setLocations(locs);
        setPatients(pats);
        if (dons) setDonations(dons);
        if (resc) setRescatados(resc);
        if (refs) setRefugios(refs);
        setStale(false);
        try {
          const cached = JSON.stringify({ locations: locs, patients: pats, donations: dons ?? donations, rescatados: resc ?? rescatados, refugios: refs ?? refugios });
          localStorage.setItem(CACHE_KEY, cached);
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
  const mkIcon = (L: any, count: number | string, color: string, active: boolean, dim: boolean) =>
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
    const ids = new Set(mapLocations.map((l) => l.location_id));
    Object.keys(markers).forEach((id) => {
      if (!ids.has(id)) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    });
    mapLocations.forEach((l) => {
      if (!markers[l.location_id]) {
        const m = L.marker([l.lat, l.lng], { icon: mkIcon(L, 0, TYPE_META[l.type].color, false, false) }).addTo(map);
        m.on("click", () => onMarkerRef.current(l.location_id));
        markers[l.location_id] = m;
      } else {
        markers[l.location_id].setLatLng([l.lat, l.lng]);
      }
    });
  }, [mapReady, mapLocations]);

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
      const dim = vis.length === 0 && !isRefugio;
      // Pin color reflects the location TYPE (hospital/shelter/morgue/acopio), not the
      // worst patient status — so the count badge reads as data, not as a death toll.
      const color = TYPE_META[l.type].color;
      const label = vis.length === 0 && isRefugio ? "&#9829;" : vis.length;
      m.setIcon(mkIcon(L, label, color, active, dim));
      m.setZIndexOffset(active ? 1000 : dim ? -100 : 0);
    });
  }, [mapReady, mapLocations, patients, tsMatch, locationSel, focusId, refugioById]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // ---- Contribute photo/info to THIS record (public → moderation queue) -------
  // Form state lives in ContributeView; opening just switches the view (fresh on mount).
  const openContribute = () => setView("contribute");
  const loadContributions = useCallback(async () => {
    try {
      const res = await fetch("/api/contributions");
      if (!res.ok) return;
      const j = await res.json();
      setContribs(Array.isArray(j.contributions) ? j.contributions : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  // Staff-only: pending missing-person reports (the public "Reportar" queue). GET is
  // staff-gated; tolerates the table not existing yet (pre db/missing_reports.sql).
  const loadReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const j = await res.json();
      setReports(Array.isArray(j.reports) ? j.reports : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  const reviewReport = async (id: string, action: "reviewed" | "closed") => {
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        showToast(t.reportUpdated);
        setReports((r) => r.filter((x) => x.id !== id));
      } else {
        showToast(t.saveError);
      }
    } catch {
      /* non-fatal */
    }
  };
  // Staff-only: the activity feed. RLS gates audit_log to is_staff(); tolerates the
  // table not existing yet (pre-migration) so nothing breaks before db/audit_log.sql.
  const loadAudit = useCallback(async () => {
    try {
      const { data, error } = await getSupabase()
        .from("audit_log")
        .select("id, created_at, actor_email, actor_role, action, entity_type, entity_id, summary")
        .order("created_at", { ascending: false })
        .limit(120);
      if (!error && data) setAudit(data as AuditEntry[]);
    } catch {
      /* offline / table absent — non-fatal */
    }
  }, []);
  // Staff-only: load the FULL rescatados base rows (admin fields included) for the
  // admin tab. RLS gates this to is_staff(); anon never reaches the base table.
  const loadRescAdmin = useCallback(async () => {
    try {
      const { data, error } = await getSupabase()
        .from("rescatados")
        .select("*")
        .eq("promoted", false)
        .order("created_at", { ascending: false });
      if (!error && data) setRescAdmin(data as Rescatado[]);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  const reviewContribution = async (id: string, action: "approve" | "reject") => {
    // Corroboration gate: an aporte must be checked before it goes public. If the
    // target record is ALREADY verified, approving a photo publishes it INSTANTLY
    // (the §8 "double lock" only holds while the record is unverified), so we force
    // a deliberate confirm that the photo is real and not junk. Photos always need
    // this human check; text-only aportes don't publish a face, so they pass through.
    // We read `verified` LIVE from the DB (patients_public) rather than local state —
    // the patient may be filtered out / stale in cache, and skipping the confirm on a
    // record that is actually verified in DB would publish a face without the check.
    if (action === "approve") {
      const c = contribs.find((x) => x.id === id);
      if (c?.foto_url) {
        let verified = false;
        try {
          const { data } = await getSupabase()
            .from("patients_public")
            .select("verified")
            .eq("id", c.patient_id)
            .maybeSingle();
          verified = !!data?.verified;
        } catch {
          // If we can't confirm live (offline), fall back to local state — and if that's
          // also unknown, err toward asking (treat as verified) so we never skip the check.
          const pat = patients.find((p) => p.id === c.patient_id);
          verified = pat ? !!pat.verified : true;
        }
        // Instead of the native window.confirm (jarring browser chrome, poor on
        // mobile), open an in-app modal and defer the actual publish to its confirm.
        if (verified) {
          setPubConfirm(id);
          return;
        }
      }
    }
    await doReviewContribution(id, action);
  };

  // Performs the actual approve/reject network call. Split out so the corroboration
  // modal (pubConfirm) can call it after the user confirms, without re-running the gate.
  const doReviewContribution = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/contributions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        showToast(action === "approve" ? t.contribApproved : t.contribRejected);
        setContribs((c) => c.filter((x) => x.id !== id));
      } else {
        // Surface the real reason (stage/message from the endpoint) so a failed
        // approval is diagnosable in the field instead of a generic "error".
        const info = await res.json().catch(() => null as { error?: string; stage?: string; message?: string } | null);
        const detail = info ? [info.error, info.stage, info.message].filter(Boolean).join(" · ") : "";
        showToast(detail ? `${t.saveError}: ${detail}` : t.saveError);
      }
    } catch {
      /* non-fatal */
    }
  };

  // Sharing: on phones/tablets use the native OS share sheet (lets them pick
  // WhatsApp/IG directly); on desktop show the in-app share menu instead — the
  // Windows/macOS "Share link" dialog is awkward and hides our preview card +
  // WhatsApp/Telegram/IG/copy actions.
  const shareCurrent = async () => {
    if (!selP) return;
    const url = patientUrl(selP.id);
    const text =
      shareText(selP.nombres + " " + selP.apellidos, SM[selP.estatus][lang], selP.location_name) +
      "\n" +
      t.shareDisclosure;
    const touchDevice =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 0);
    if (touchDevice) {
      const ok = await nativeShare({ title: selP.nombres + " " + selP.apellidos, text, url });
      if (ok) return;
    }
    setView("share");
  };
  const shareTo = async (target: "wa" | "tg" | "ig" | "copy") => {
    if (!selP) return;
    const url = patientUrl(selP.id);
    const text =
      shareText(selP.nombres + " " + selP.apellidos, SM[selP.estatus][lang], selP.location_name) +
      "\n" +
      t.shareDisclosure;
    if (target === "wa") openShare(whatsappUrl(url, text));
    else if (target === "tg") openShare(telegramUrl(url, text));
    else if (target === "ig") {
      showToast(t.storyBuilding);
      const r = await shareStoryImage(selP.id, selP.nombres + " " + selP.apellidos);
      if (r === "shared") showToast(t.storyShared);
      else if (r === "downloaded") showToast(t.storyDownloaded);
      else showToast(t.storyError);
    } else {
      const ok = await copyText(url);
      if (ok) showToast(t.copied);
    }
  };

  // Share a shelter's NEED into WhatsApp/native share — the core "promptear a colaborar"
  // action so a specific need reaches people who can act on it (CLAUDE.md §5, focus:
  // visibilizar necesidades). Links to the map location so anyone can go help.
  const shareRefugio = async (loc: Location, r: Refugio) => {
    const needs = r.necesita?.trim() || (r.recibe.length ? r.recibe.join(", ") : "");
    const where = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(", ");
    const url = mapsDirectionsUrl(loc.lat, loc.lng);
    const text =
      `🆘 ${loc.canonical_name}${where ? " · " + where : ""} necesita ayuda` +
      (needs ? `:\n${needs}` : "") +
      `\n${t.refShareTag}`;
    const touch =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 0);
    if (touch) {
      const ok = await nativeShare({ title: loc.canonical_name, text, url });
      if (ok) return;
    }
    openShare(whatsappUrl(url, text));
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


  // ---- Report a missing person (public "Reportar" flow → /api/reports) ----
  // NOT the intake funnel: this is a lead/request the team works from the admin
  // "Reportes" tab (+ an email). Never published on the map (CLAUDE.md §14).
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
    setGeoQuery("");
    setGeoResults([]);
  };

  // Switch admin tab: clear the in-panel search (but NOT on edit/cancel — clearEdit
  // leaves admQ alone — so staff keep their filter while iterating within a tab).
  const switchTab = (tab: AdminTab) => {
    setAdminTab(tab);
    setAdmQ("");
    clearEdit();
  };

  const editCenter = (l: Location) => {
    setEditType("center");
    setEditId(l.location_id);
    setGeoQuery("");
    setGeoResults([]);
    const r = refugioById[l.location_id];
    setDraft({
      canonical_name: l.canonical_name,
      type: l.type,
      state: l.state,
      municipality: l.municipality ?? "",
      lat: String(l.lat),
      lng: String(l.lng),
      // refugio companion info (if any) → editable form fields
      ref_recibe: r ? r.recibe.join(", ") : "",
      ref_necesita: r?.necesita ?? "",
      ref_horario: r?.horario ?? "",
      ref_responsable: r?.responsable ?? "",
      ref_address: r?.address ?? "",
      ref_animal: r?.es_animal ?? false,
    });
  };
  const newCenter = () => {
    setEditType("center");
    setEditId(null);
    setGeoQuery("");
    setGeoResults([]);
    setDraft({ canonical_name: "", type: "hospital", state: "distrito_capital", municipality: "", lat: "", lng: "", ref_recibe: "", ref_necesita: "", ref_horario: "", ref_responsable: "", ref_address: "", ref_animal: false });
  };

  // Geocode by NAME or address via OpenStreetMap Nominatim (free, no key — same
  // tile provider we already use). In Venezuela addresses are vague, so searching
  // by the center's name (e.g. "Hospital Plácido Rodríguez Rivero") works best —
  // Nominatim indexes POIs by name. Returns several candidates so the admin PICKS
  // the right one and then VERIFIES the pin (CLAUDE.md §13). Falls back to the
  // typed center name if the search box is empty.
  const geocodeAddress = async () => {
    const term = geoQuery.trim() || draft?.canonical_name?.trim() || "";
    if (!term) return;
    const muni = draft?.municipality?.trim() || "";
    const stateName = draft?.state ? STATE_LABEL[draft.state] : "";
    // Try the most specific query first, then progressively drop the location
    // bias. Nominatim matches POI names fairly strictly: extra tokens that aren't
    // in the OSM name (a municipality, "Venezuela") can drop an otherwise-good
    // match to zero, so we stop at the first query that returns any hit and fall
    // back to the bare name. countrycodes=ve already scopes to Venezuela, so we
    // never append the country. Space-joined (commas trigger stricter parsing).
    const queries = [
      [term, muni, stateName],
      [term, stateName],
      [term],
    ]
      .map((p) => p.filter(Boolean).join(" "))
      .filter((q, i, arr) => q && arr.indexOf(q) === i);
    setGeoBusy(true);
    setGeoResults([]);
    try {
      let hits: Array<{ lat: number; lng: number; label: string; address?: Record<string, string> }> = [];
      for (const q of queries) {
        // addressdetails=1 → structured address so picking a result can also fill the
        // state + municipality fields (not just lat/lng + name).
        const url =
          "https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ve&addressdetails=1&q=" +
          encodeURIComponent(q);
        const res = await fetch(url, { headers: { "Accept-Language": lang } });
        const data = (await res.json()) as Array<{
          lat: string;
          lon: string;
          display_name: string;
          address?: Record<string, string>;
        }>;
        hits = (data || [])
          .map((h) => ({ lat: parseFloat(h.lat), lng: parseFloat(h.lon), label: h.display_name, address: h.address }))
          .filter((h) => isFinite(h.lat) && isFinite(h.lng));
        if (hits.length) break;
      }
      if (!hits.length) {
        showToast(t.geoNotFound);
        return;
      }
      // One clear match → apply it. Several → let the admin choose.
      if (hits.length === 1) {
        pickGeoResult(hits[0]);
      } else {
        setGeoResults(hits);
      }
    } catch {
      showToast(t.geoNotFound);
    } finally {
      setGeoBusy(false);
    }
  };
  const pickGeoResult = (r: { lat: number; lng: number; label: string; address?: Record<string, string> }) => {
    // Nominatim's display_name leads with the POI name (e.g. "IVSS Hospital Dr.
    // Plácido Rodríguez Rivero, La Mosca, San Felipe, …"); use that first segment to
    // auto-fill the center name. addressdetails also lets us fill state + municipality.
    const picked = r.label.split(",")[0].trim();
    const muni = municipalityFromAddress(r.address);
    const st = veStateFromAddress(r.address, r.label);
    setDraft((d) => ({
      ...(d || {}),
      lat: r.lat.toFixed(6),
      lng: r.lng.toFixed(6),
      canonical_name: picked || d?.canonical_name || "",
      ...(muni ? { municipality: muni } : {}),
      ...(st ? { state: st } : {}),
    }));
    setGeoResults([]);
    mapRef.current?.setView([r.lat, r.lng], 16, { animate: true });
    showToast(t.geoFound);
  };
  // Mirror a center change to the n8n workflow so it keeps its intake LISTS dropdown
  // + dedup alias/loc maps in sync (CLAUDE.md §13 feedback loop). Best-effort: the
  // Supabase write already succeeded; this never blocks the UI.
  const notifyCenter = (action: "created" | "updated" | "deleted", center: Partial<Location>) => {
    fetch("/api/centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, center }),
    }).catch(() => {
      /* offline / not configured — non-fatal */
    });
  };

  // Suggest a shelter's updated needs back to AcopioVE (POST /submissions via our server
  // route). Best-effort + server-gated (ACOPIOVE_PUSH_ENABLED) so nothing goes to a third
  // party until the team enables it. It's a moderated suggestion, not an instant write.
  const pushRefugioToAcopio = (loc: Location, r: Refugio) => {
    fetch("/api/refugios/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        external_id: r.external_id,
        name: loc.canonical_name,
        address: r.address,
        ciudad: loc.municipality,
        lat: loc.lat,
        lng: loc.lng,
        recibe: r.recibe,
        necesita_ahora: r.necesita,
        horario: r.horario,
        contacto: loc.contact_whatsapp || loc.contact_phone,
        responsable: r.responsable,
        fuente: r.fuente,
      }),
    }).catch(() => {
      /* disabled / offline — non-fatal */
    });
  };

  // Admin writes go to the BASE tables via the authenticated session (CLAUDE.md
  // §9). RLS must grant the authenticated role write access (see runbook).
  const saveCenter = async () => {
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
    const { error } = await getSupabase().from("locations").upsert({
      location_id: obj.location_id,
      canonical_name: obj.canonical_name,
      type: obj.type,
      municipality: obj.municipality,
      state: obj.state,
      lat: obj.lat,
      lng: obj.lng,
      contact_phone: obj.contact_phone,
      contact_whatsapp: obj.contact_whatsapp,
      active: obj.active,
    });
    if (error) {
      showToast(t.saveError);
      return;
    }
    setLocations((ls) => (editId ? ls.map((l) => (l.location_id === obj.location_id ? obj : l)) : [...ls, obj]));
    // Shelter needs (recibe/necesita/…) live in the companion `refugios` table. Upsert
    // it whenever the center is a shelter so staff can keep each refugio's differing
    // needs current (CLAUDE.md §14, AcopioVE). Non-fatal: the center already saved.
    if (obj.type === "shelter") {
      const existing = refugioById[obj.location_id];
      const recibe = (d.ref_recibe || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const refRow: Refugio = {
        location_id: obj.location_id,
        recibe,
        necesita: d.ref_necesita?.trim() || null,
        horario: d.ref_horario?.trim() || null,
        responsable: d.ref_responsable?.trim() || null,
        fuente: existing?.fuente ?? null,
        address: d.ref_address?.trim() || null,
        external_id: existing?.external_id ?? null,
        es_animal: !!d.ref_animal,
        last_confirmed_at: existing?.last_confirmed_at ?? null,
        // Stamp the local edit time: this is what freshest-wins compares against, so a
        // staff edit here is never clobbered by the next AcopioVE sync (updated_at is
        // app-managed — db/refugios.sql has no touch trigger).
        updated_at: new Date().toISOString(),
      };
      const { error: refErr } = await getSupabase().from("refugios").upsert(refRow);
      if (!refErr) {
        setRefugios((rs) =>
          rs.some((r) => r.location_id === refRow.location_id)
            ? rs.map((r) => (r.location_id === refRow.location_id ? refRow : r))
            : [...rs, refRow],
        );
        // Offer this update back to AcopioVE as a moderated suggestion (best-effort;
        // no-ops unless the team enabled ACOPIOVE_PUSH_ENABLED). Both apps improve each
        // other — whoever has the fresher data suggests it upstream (CLAUDE.md §14).
        pushRefugioToAcopio(obj, refRow);
      }
    }
    notifyCenter(editId ? "updated" : "created", obj);
    clearEdit();
    showToast(t.savedC);
  };
  const deleteCenter = async (id: string) => {
    const center = locById[id];
    // Hard delete. If people still reference this center the FK blocks it, so we
    // surface that instead of silently wiping patient records.
    const { error } = await getSupabase().from("locations").delete().eq("location_id", id);
    if (error) {
      showToast(t.delBlocked);
      return;
    }
    setLocations((ls) => ls.filter((l) => l.location_id !== id));
    setPatients((ps) => ps.filter((p) => p.location_id !== id));
    setRefugios((rs) => rs.filter((r) => r.location_id !== id)); // DB cascades; mirror locally
    setLocationSel((cur) => (cur === id ? null : cur));
    notifyCenter("deleted", center ?? { location_id: id });
    clearEdit();
    showToast(t.deleted);
  };

  // ---- Donations (community orgs in the "Donar" panel) -------------------
  const newDonation = () => {
    setEditType("donation");
    setEditId(null);
    setDraft({ don_name: "", don_desc: "", don_social: "", don_url: "", don_info: "" });
  };
  const editDonation = (d: Donation) => {
    setEditType("donation");
    setEditId(d.id);
    setDraft({
      don_name: d.name,
      don_desc: d.description ?? "",
      don_social: d.social_url ?? "",
      don_url: d.donate_url ?? "",
      don_info: d.donate_info ?? "",
    });
  };
  const saveDonation = async () => {
    const d = draft || {};
    const name = (d.don_name || "").trim();
    if (!name) {
      showToast(t.contactError);
      return;
    }
    const clean = (s?: string) => {
      const v = (s || "").trim();
      return v ? v : null;
    };
    const row = {
      name,
      description: clean(d.don_desc),
      social_url: clean(d.don_social),
      donate_url: clean(d.don_url),
      donate_info: clean(d.don_info),
      active: true,
      updated_at: new Date().toISOString(),
    };
    const supabase = getSupabase();
    const res = editId
      ? await supabase.from("donations").update(row).eq("id", editId).select("*").single()
      : await supabase.from("donations").insert(row).select("*").single();
    if (res.error || !res.data) {
      showToast(t.saveError);
      return;
    }
    const saved = res.data as Donation;
    setDonations((ds) => {
      const next = editId ? ds.map((x) => (x.id === saved.id ? saved : x)) : [...ds, saved];
      return next.sort((a, b) => a.sort - b.sort);
    });
    clearEdit();
    showToast(t.savedDon);
  };
  const deleteDonation = async (id: string) => {
    const { error } = await getSupabase().from("donations").delete().eq("id", id);
    if (error) {
      showToast(t.saveError);
      return;
    }
    setDonations((ds) => ds.filter((x) => x.id !== id));
    clearEdit();
    showToast(t.deleted);
  };

  // Flip the site-wide maintenance banner. Admin-only (UI-gated here, RLS-gated in
  // db/app_settings.sql). Optimistic: revert the local flag if the write fails.
  const toggleMaintenance = async () => {
    if (maintBusy) return;
    const next = !maintenance;
    setMaintBusy(true);
    setMaintenance(next);
    const { data, error } = await getSupabase()
      .from("app_settings")
      .update({ maintenance: next, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("maintenance");
    setMaintBusy(false);
    // RLS can silently block an update (0 rows, no error) — treat that as a failure too.
    if (error || !data || data.length === 0) {
      // Surface the real cause: missing table → run db/app_settings.sql; 0 rows → RLS/admin.
      console.error("[maintenance] toggle failed:", error ?? "0 rows updated (table missing or not admin)");
      setMaintenance(!next); // revert
      showToast(t.saveError);
      return;
    }
    showToast(next ? t.maintOn : t.maintOff);
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
      verified: p.verified,
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
  const savePerson = async () => {
    const d = draft || {};
    const loc = locById[d.location_id || ""] || locations[0];
    if (!loc) {
      showToast(t.reqNameLoc);
      return;
    }
    const edad = d.edad ? parseInt(d.edad) : null;
    const isMinor = edad != null && edad < 18;
    const prev = editId ? patients.find((x) => x.id === editId) : undefined;
    const ci = isMinor ? null : d.ci?.trim() || null;

    // Base-table columns only. The minor-privacy DB trigger enforces the photo/CI
    // rules; the public view derives ci_display, location_name, etc.
    const baseRow = {
      apellidos: d.apellidos || "",
      nombres: d.nombres || "",
      ci,
      is_minor: isMinor,
      edad,
      sexo: (d.sexo as Sexo) || null,
      location_id: loc.location_id,
      estatus: (d.estatus as Estatus) || "INGRESADO",
      // The publish gate (§8). Editable by all staff now (admin OR volunteer) — trusted
      // contributors whose access is revocable; their work publishes without waiting.
      verified: !!d.verified,
    };

    const supabase = getSupabase();
    let newId = editId;
    if (editId) {
      const { error } = await supabase.from("patients").update(baseRow).eq("id", editId);
      if (error) {
        showToast(t.saveError);
        return;
      }
    } else {
      const person_key = ci || "admin_" + (crypto.randomUUID?.() ?? String(Date.now()));
      const { data, error } = await supabase
        .from("patients")
        .insert({ ...baseRow, person_key })
        .select("id")
        .single();
      if (error || !data) {
        showToast(t.saveError);
        return;
      }
      newId = data.id as string;
    }

    const obj: PatientPublic = {
      id: newId || "p_" + Date.now(),
      apellidos: baseRow.apellidos,
      nombres: baseRow.nombres,
      ci_display: isMinor ? "MENOR" : ci || "—",
      is_minor: isMinor,
      edad,
      sexo: baseRow.sexo,
      location_id: loc.location_id,
      location_name: loc.canonical_name,
      location_type: loc.type,
      municipality: loc.municipality,
      state: loc.state,
      lat: loc.lat,
      lng: loc.lng,
      estatus: baseRow.estatus,
      foto_url: isMinor ? null : prev?.foto_url ?? null,
      verified: baseRow.verified,
      updated_at: new Date().toISOString(),
    };
    setPatients((ps) => (editId ? ps.map((p) => (p.id === obj.id ? obj : p)) : [obj, ...ps]));
    clearEdit();
    showToast(t.savedP);
  };
  const deletePerson = async (id: string) => {
    const { error } = await getSupabase().from("patients").delete().eq("id", id);
    if (error) {
      showToast(t.saveError);
      return;
    }
    setPatients((ps) => ps.filter((p) => p.id !== id));
    clearEdit();
    showToast(t.deleted);
  };

  // ---- Rescatados (field rescued reports) --------------------------------
  // Derive the privacy-filtered public shape from a base row (mirrors the
  // rescatados_public view: ci_display, photo only for verified adults).
  const toRescPublic = (r: Rescatado): RescatadoPublic => ({
    id: r.id,
    apellidos: r.apellidos,
    nombres: r.nombres,
    ci_display: r.is_minor ? "MENOR" : r.ci || "—",
    is_minor: r.is_minor,
    edad: r.edad,
    sexo: r.sexo,
    foto_url: r.verified && !r.is_minor ? r.foto_url : null,
    verified: r.verified,
    created_at: r.created_at,
    updated_at: r.updated_at,
  });

  const newRescatado = () => {
    setEditType("rescatado");
    setEditId(null);
    setDraft({ is_minor: false, verified: false });
  };
  const editRescatado = (r: Rescatado) => {
    setEditType("rescatado");
    setEditId(r.id);
    setDraft({
      apellidos: r.apellidos,
      nombres: r.nombres,
      ci: r.ci || "",
      edad: r.edad != null ? String(r.edad) : "",
      sexo: r.sexo || undefined,
      is_minor: r.is_minor,
      contacto: r.contacto || "",
      rescue_site: r.rescue_site || "",
      notas: r.notas || "",
      verified: r.verified,
    });
  };
  const saveRescatado = async () => {
    const d = draft || {};
    const ape = (d.apellidos || "").trim();
    const nom = (d.nombres || "").trim();
    if (!ape && !nom) {
      showToast(t.rescuedReqName);
      return;
    }
    const edad = d.edad ? parseInt(d.edad) : null;
    const isMinor = !!d.is_minor || (edad != null && edad < 18);
    const clean = (s?: string) => {
      const v = (s || "").trim();
      return v ? v : null;
    };
    // Minor: never a CI (the DB trigger also enforces this — defense in depth, §2).
    const row = {
      apellidos: ape,
      nombres: nom,
      ci: isMinor ? null : d.ci?.trim() || null,
      is_minor: isMinor,
      edad,
      sexo: (d.sexo as Sexo) || null,
      contacto: clean(d.contacto),
      rescue_site: clean(d.rescue_site),
      notas: clean(d.notas),
      verified: !!d.verified,
      updated_at: new Date().toISOString(),
    };
    const supabase = getSupabase();
    const res = editId
      ? await supabase.from("rescatados").update(row).eq("id", editId).select("*").single()
      : await supabase.from("rescatados").insert(row).select("*").single();
    if (res.error || !res.data) {
      showToast(t.saveError);
      return;
    }
    const saved = res.data as Rescatado;
    setRescAdmin((rs) => (editId ? rs.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...rs]));
    const pub = toRescPublic(saved);
    setRescatados((rs) => (editId ? rs.map((x) => (x.id === pub.id ? pub : x)) : [pub, ...rs]));
    clearEdit();
    showToast(t.savedRescued);
  };
  const deleteRescatado = async (id: string) => {
    const { error } = await getSupabase().from("rescatados").delete().eq("id", id);
    if (error) {
      showToast(t.saveError);
      return;
    }
    setRescAdmin((rs) => rs.filter((x) => x.id !== id));
    setRescatados((rs) => rs.filter((x) => x.id !== id));
    clearEdit();
    showToast(t.rescuedDeleted);
  };
  // Promote a rescatado → a real patient (now we know the center + clinical status).
  // Pre-fills the transfer form from the rescatado's known data.
  const startPromote = (r: Rescatado) => {
    setEditType("promote");
    setEditId(r.id);
    setDraft({
      apellidos: r.apellidos,
      nombres: r.nombres,
      ci: r.ci || "",
      edad: r.edad != null ? String(r.edad) : "",
      sexo: r.sexo || undefined,
      is_minor: r.is_minor,
      location_id: locations[0]?.location_id,
      estatus: "INGRESADO",
      verified: r.verified,
    });
  };
  const savePromotion = async () => {
    const d = draft || {};
    const loc = locById[d.location_id || ""] || locations[0];
    if (!loc) {
      showToast(t.reqNameLoc);
      return;
    }
    const src = editId ? rescAdmin.find((x) => x.id === editId) : undefined;
    const edad = d.edad ? parseInt(d.edad) : src?.edad ?? null;
    const isMinor = !!d.is_minor || (edad != null && edad < 18);
    const ci = isMinor ? null : d.ci?.trim() || null;
    const baseRow = {
      apellidos: d.apellidos || "",
      nombres: d.nombres || "",
      ci,
      is_minor: isMinor,
      edad,
      sexo: (d.sexo as Sexo) || null,
      location_id: loc.location_id,
      estatus: (d.estatus as Estatus) || "INGRESADO",
      verified: !!d.verified,
    };
    const supabase = getSupabase();
    const person_key = ci || "resc_" + (editId ?? Date.now());
    const { data, error } = await supabase.from("patients").insert({ ...baseRow, person_key }).select("id").single();
    if (error || !data) {
      showToast(t.saveError);
      return;
    }
    const newId = data.id as string;
    // Mark the rescatado promoted so it leaves the rescued lists (carries the link).
    if (editId) {
      await supabase
        .from("rescatados")
        .update({ promoted: true, patient_id: newId, updated_at: new Date().toISOString() })
        .eq("id", editId);
    }
    setRescatados((rs) => rs.filter((x) => x.id !== editId));
    setRescAdmin((rs) => rs.filter((x) => x.id !== editId));
    const obj: PatientPublic = {
      id: newId,
      apellidos: baseRow.apellidos,
      nombres: baseRow.nombres,
      ci_display: isMinor ? "MENOR" : ci || "—",
      is_minor: isMinor,
      edad,
      sexo: baseRow.sexo,
      location_id: loc.location_id,
      location_name: loc.canonical_name,
      location_type: loc.type,
      municipality: loc.municipality,
      state: loc.state,
      lat: loc.lat,
      lng: loc.lng,
      estatus: baseRow.estatus,
      // Carry the photo only if it was verified+adult; otherwise the view nulls it anyway.
      foto_url: isMinor ? null : src?.verified ? src.foto_url : null,
      verified: baseRow.verified,
      updated_at: new Date().toISOString(),
    };
    setPatients((ps) => [obj, ...ps]);
    clearEdit();
    showToast(t.promoted);
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

  // ---- Volunteer management (admin-only, via server API) -----------------
  const loadVolunteers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/volunteers");
      if (!res.ok) return;
      const j = await res.json();
      setVolunteers(Array.isArray(j.volunteers) ? j.volunteers : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  const genPass = () =>
    setVolPass(Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + "9!");
  const createVolunteer = async () => {
    if (!volEmail.trim() || volPass.length < 6) {
      showToast(t.volCreateErr);
      return;
    }
    setVolBusy(true);
    try {
      const res = await fetch("/api/admin/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: volEmail.trim(), password: volPass }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(j.emailed ? t.volCreated : t.volCreatedNoMail);
        setVolEmail("");
        setVolPass("");
        loadVolunteers();
      } else {
        showToast(t.volCreateErr);
      }
    } catch {
      showToast(t.volCreateErr);
    } finally {
      setVolBusy(false);
    }
  };
  const revokeVolunteer = async (user_id: string) => {
    try {
      const res = await fetch("/api/admin/volunteers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });
      if (res.ok) {
        showToast(t.volRevoked);
        setVolunteers((v) => v.filter((x) => x.user_id !== user_id));
      }
    } catch {
      /* non-fatal */
    }
  };
  // Admin: pending volunteer applications + approve/reject.
  const loadVolRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/volunteers?requests=1");
      if (!res.ok) return;
      const j = await res.json();
      setVolReqs(Array.isArray(j.requests) ? j.requests : []);
    } catch {
      /* offline / non-fatal */
    }
  }, []);
  // Preload the "needs attention" counts as soon as a staff session resolves, so the
  // gear badge is accurate before the panel is even opened. Admin also gets the pending
  // volunteer applications; volunteers only see the aportes count.
  useEffect(() => {
    if (!(isAdmin || isVolunteer)) return;
    loadContributions();
    loadReports();
    loadAudit();
    if (isAdmin) loadVolRequests();
  }, [isAdmin, isVolunteer, loadContributions, loadReports, loadAudit, loadVolRequests]);
  // Light auto-refresh (no realtime backend yet — CLAUDE.md §"Novedades" pending). While a
  // staff session is active we re-pull the cheap "needs attention" counts every 60s so the
  // gear badge stays live even before the panel is opened; the heavier 120-row audit feed is
  // only re-pulled while the admin panel is actually open. Skipped when the tab is hidden to
  // save the flaky-3G data budget (§6); a fresh pull also runs on becoming visible again.
  useEffect(() => {
    if (!(isAdmin || isVolunteer)) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadContributions();
      loadReports();
      if (isAdmin) loadVolRequests();
      if (view === "admin") loadAudit();
    };
    const id = window.setInterval(tick, 60_000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAdmin, isVolunteer, view, loadContributions, loadReports, loadVolRequests, loadAudit]);
  const reviewVolRequest = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/admin/volunteers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        showToast(action === "approve" ? t.volApproved : t.volRejected);
        setVolReqs((r) => r.filter((x) => x.id !== id));
        if (action === "approve") loadVolunteers();
      } else {
        showToast(t.volCreateErr);
      }
    } catch {
      showToast(t.volCreateErr);
    }
  };

  // ---- List photo upload (staff): forward to n8n via /api/lists ----------
  const onPickList = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // A single center usually arrives as MANY photos (multiple pages / handwritten
    // lists). Send each selected image as its own patient_list_photo to n8n — same
    // location_id + note — so each page is OCR'd independently (n8n contract unchanged).
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same files
    if (files.length === 0) return;
    const note = listNote.trim() || null;
    const loc = listLoc || null;
    const dataDate = listDate || null;
    setListResult(null);
    setListProgress({ done: 0, total: files.length });
    setListBusy(true);
    let ok = 0;
    try {
      for (const file of files) {
        try {
          const b64 = await compressImage(file, LIST_OPTS); // higher-res for OCR legibility
          const res = await fetch("/api/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_b64: b64,
              filename: file.name,
              note,
              location_id: loc,
              data_date: dataDate,
            }),
          });
          if (res.ok) ok++;
        } catch {
          /* keep going — report a partial result at the end */
        }
        setListProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
      if (ok === files.length) {
        const msg = files.length === 1 ? t.listSent : t.listSentN.replace("{n}", String(ok));
        setListResult({ kind: "ok", msg });
        showToast(msg);
        setListNote("");
        setListDate("");
      } else if (ok > 0) {
        const msg = t.listSentPartial.replace("{ok}", String(ok)).replace("{total}", String(files.length));
        setListResult({ kind: "partial", msg });
        showToast(msg);
      } else {
        setListResult({ kind: "error", msg: t.listError });
        showToast(t.listError);
      }
    } finally {
      setListBusy(false);
      setListProgress(null);
    }
  };

  // ---- Volunteer / donation email (in-app, via nodemailer) ---------------
  // Opens the "Escríbenos" form. The form state lives in ContactView; we only remember
  // which `kind` opened it (passed as a prop, sent to /api/contact for the subject tag).
  const openContact = (kind: "volunteer" | "donation" | "contact") => {
    setContactKind(kind);
    setView("contact");
  };

  // ---- Derived view bits -------------------------------------------------
  // Center dropdown. The team's "centros" INCLUDE the AcopioVE refugios, so they must be
  // selectable here too — but grouped by TYPE (Hospitales / Refugios / …) so 48+ entries
  // read as an organized list, not a flat blur. Excludes shadowed refugios (merged onto a
  // hospital → no pin of their own, selecting one would fly nowhere). Honors the state filter.
  const centerFilterGroups = useMemo(() => {
    const inState = mapLocations.filter((l) => stateF === "all" || l.state === stateF);
    const order: LocationType[] = ["hospital", "shelter", "morgue", "donation_centre"];
    return order
      .map((type) => ({
        type,
        items: inState
          .filter((l) => l.type === type)
          .sort((a, b) => a.canonical_name.localeCompare(b.canonical_name)),
      }))
      .filter((g) => g.items.length > 0);
  }, [mapLocations, stateF]);
  const statusOpts: { v: Estatus; label: string }[] = ESTATUS_ORDER.map((k) => ({ v: k, label: SM[k][lang] }));
  const canDelete = !!(editType && editId) && isAdmin; // volunteers can't delete

  // In-panel search (admin list tabs). admHit tests any record's searchable text.
  const admNorm = norm(admQ.trim());
  const admHit = (s: string) => !admNorm || norm(s).includes(admNorm);
  const admSearchBar = (
    <div className="admsearch">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </svg>
      <input
        className="admsearch-i"
        placeholder={t.admSearchPh}
        value={admQ}
        onChange={(e) => setAdmQ(e.target.value)}
      />
      {admQ && (
        <button type="button" className="admsearch-x" onClick={() => setAdmQ("")} aria-label="✕">
          ✕
        </button>
      )}
    </div>
  );

  const chips: { key: "all" | Estatus; label: string; dotCls: string }[] = [
    { key: "all", label: t.all, dotCls: "" },
    { key: "INGRESADO", label: SM.INGRESADO[lang], dotCls: "cdot-adm" },
    { key: "ALTA", label: SM.ALTA[lang], dotCls: "cdot-ok" },
    // FALLECIDO is shown (the team needs this data). Kept respectful per CLAUDE.md §2:
    // muted styling (cdot-dec); only verified records are ever published.
    { key: "FALLECIDO", label: SM.FALLECIDO[lang], dotCls: "cdot-dec" },
  ];

  const rootStyle = accent ? ({ ["--accent"]: accent } as React.CSSProperties) : undefined;

  const selStateLoc = locationSel ? locById[locationSel] : null;
  // A selected center's needs card: its own refugio row, or a refugio merged onto it
  // (a coincident AcopioVE hospital-refuge that we shadowed to avoid a duplicate pin).
  const selRefugio = locationSel ? refugioById[locationSel] ?? needsForCenter[locationSel] ?? null : null;
  const showDonationInfo =
    !!selStateLoc && (selStateLoc.type === "donation_centre" || (list.length === 0 && !query && status === "all"));

  return (
    <div className="app" style={rootStyle}>
      <div className="map" ref={containerRef}></div>

      <div className="topbar">
        {maintenance && (
          <div className="maint-banner" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6-1.4-1.4 2.6-2.6Z" />
            </svg>
            <span>{t.maintBanner}</span>
          </div>
        )}
        <div className="hrow">
          <a
            className="brand"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={`Síguenos en Instagram @${INSTAGRAM_HANDLE} · by tropicalsadness x imagenesnacionales`}
          >
            <span className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ico.png" alt="HelpMap VE" />
            </span>
            <div className="bcol">
              <span className="bname">{t.appName}</span>
              <span className="btag">@{INSTAGRAM_HANDLE}</span>
            </div>
          </a>
          <div className="hright">
            {/* Staff entry (admin or volunteer); hidden from the public UI. It only
                appears once a Supabase session with a staff role exists. */}
            {(isAdmin || isVolunteer) && (
              <button
                className="gear gear-badged"
                onClick={() => {
                  setView("admin");
                  switchTab("novedades"); // land on the activity feed
                  loadContributions(); // pending aportes drive the count badges + in-card review
                  loadAudit();
                  if (isAdmin) loadVolRequests();
                }}
                aria-label={t.tabNews}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                  <circle cx="9" cy="6" r="2.2" fill="#fff" />
                  <circle cx="15" cy="12" r="2.2" fill="#fff" />
                  <circle cx="8" cy="18" r="2.2" fill="#fff" />
                </svg>
                {contribs.length + volReqs.length + reports.length > 0 && (
                  <span className="gear-badge">{contribs.length + volReqs.length + reports.length}</span>
                )}
              </button>
            )}
            <button className="gear" onClick={() => openContact("contact")} aria-label={t.contact}>
              {ICON.mail}
            </button>
            <button className="gear" onClick={() => setView("volunteer")} aria-label={t.volunteer}>
              {ICON.volunteer}
            </button>
            <button className="donate-btn" onClick={() => setView("donate")} aria-label={lang === "es" ? "Donar" : "Donate"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
              </svg>
              <span className="donate-label">{t.donate}</span>
            </button>
            <button className="gear" onClick={() => setTourOpen(true)} aria-label={lang === "es" ? "Cómo funciona" : "How it works"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" />
                <path d="M12 17.5h.01" />
              </svg>
            </button>
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
              {centerFilterGroups.map((g) => (
                <optgroup key={g.type} label={TYPE_META[g.type][lang]}>
                  {g.items.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.canonical_name}
                    </option>
                  ))}
                </optgroup>
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

      {!view && (
        <div className="zoomctl">
          <button className="zbtn" onClick={() => mapRef.current?.zoomIn()} aria-label={lang === "es" ? "Acercar" : "Zoom in"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button className="zbtn" onClick={() => mapRef.current?.zoomOut()} aria-label={lang === "es" ? "Alejar" : "Zoom out"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      )}

      {!view && (
        <div className={"heatctl " + (showHeat ? "heatctl-on" : "")}>
          {showHeat && (
            <div className="heatleg">
              <span className="heatleg-title">{t.feltIntensity}</span>
              <span className="heatleg-bar" />
              <span className="heatleg-lbls">
                <span>{t.intLeve}</span>
                <span>{t.intSevera}</span>
              </span>
              <span className="heatleg-src">
                {damage.source === "usgs" && damage.aftershocks.length > 0
                  ? `${damage.aftershocks.length} ${t.aftershocks} · USGS`
                  : t.damagePreliminary}
              </span>
            </div>
          )}
          <button className="heatbtn" onClick={() => setShowHeat((s) => !s)} aria-pressed={showHeat}>
            {ICON.flame}
            {t.damageLayer}
          </button>
        </div>
      )}

      {(showReport ?? true) && !view && (
        <div className="fabwrap">
          {fabOpen && (
            <>
              {/* Tap-away backdrop closes the menu. */}
              <button className="fab-backdrop" aria-label="" onClick={() => setFabOpen(false)} />
              <div className="fab-menu" role="menu">
                <button
                  className="fab-opt"
                  role="menuitem"
                  onClick={() => {
                    setFabOpen(false);
                    setView("reportMissing");
                  }}
                >
                  <span className="fab-opt-ic">{ICON.search}</span>
                  <span className="fab-opt-txt">
                    <b>{t.menuReportTitle}</b>
                    <small>{t.menuReportSub}</small>
                  </span>
                </button>
                <button
                  className="fab-opt"
                  role="menuitem"
                  onClick={() => {
                    setFabOpen(false);
                    setView("report");
                  }}
                >
                  <span className="fab-opt-ic">{ICON.plus}</span>
                  <span className="fab-opt-txt">
                    <b>{t.menuContribTitle}</b>
                    <small>{t.menuContribSub}</small>
                  </span>
                </button>
              </div>
            </>
          )}
          <button className={"fab " + (fabOpen ? "fab-open" : "")} onClick={() => setFabOpen((o) => !o)} aria-expanded={fabOpen}>
            {ICON.plus}
            {t.fabCta}
          </button>
        </div>
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
          {/* Trust note: dataset is field-confirmed + call for collaborators. Lives in
              the list (contextual to the data), so it never covers the map. */}
          <button className="trustbar" onClick={() => setView("volunteer")}>
            <span className="trust-ic">{ICON.check}</span>
            <span className="trust-txt">{t.trustLine}</span>
            <span className="trust-cta">{t.trustCta}</span>
          </button>
          {/* Rescued-people network: people pulled out alive but not yet at a center,
              so they have no map pin. Surfaced here as a list entry (CLAUDE.md §14). */}
          {rescatados.length > 0 && (
            <button className="rescbar" onClick={() => setView("rescued")}>
              <span className="resc-ic">{ICON.rescue}</span>
              <span className="resc-txt">
                <b>{rescatados.length}</b> {t.rescuedOpen}
              </span>
              <span className="resc-cta">{ICON.chevR}</span>
            </button>
          )}
          {/* Shelter needs entry bar: surfaces "N refugios necesitan ayuda" so needs are
              visible without hunting pins, and prompts people to collaborate (user focus). */}
          {!locationSel && needyCount > 0 && (
            <button className="refbar" onClick={() => setView("refugios")}>
              <span className="refbar-ic">{ICON.volunteer}</span>
              <span className="refbar-txt">{t.refNeedBar.replace("{n}", String(needyCount))}</span>
              <span className="refbar-cta">{ICON.chevR}</span>
            </button>
          )}
          {/* Shelter needs card: for a selected refugio, show what it RECEIVES and
              NEEDS now + contact actions (CLAUDE.md §14, AcopioVE integration). */}
          {selRefugio && selStateLoc && (
            <div className="refcard">
              <div className="refhead">
                <span className="refkick">{ICON.pin}{t.refShelterInfo}</span>
                {selRefugio.es_animal && <span className="refanimal">{t.refAnimal}</span>}
              </div>
              {selRefugio.necesita && (
                <div className="refneed">
                  <span className="reflabel">{ICON.volunteer}{t.refNeeds}</span>
                  <p className="refneedtxt">{selRefugio.necesita}</p>
                </div>
              )}
              {selRefugio.recibe.length > 0 && (
                <div className="refblock">
                  <span className="reflabel">{ICON.box}{t.refReceives}</span>
                  <div className="refchips">
                    {selRefugio.recibe.map((r, i) => (
                      <span key={i} className="refchip">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                    ))}
                  </div>
                </div>
              )}
              {(selRefugio.horario || selRefugio.responsable || selRefugio.address) && (
                <div className="refmeta">
                  {selRefugio.horario && (
                    <span className="refmetarow">{ICON.clock}{t.refSchedule}: {selRefugio.horario}</span>
                  )}
                  {selRefugio.responsable && (
                    <span className="refmetarow">{ICON.volunteer}{t.refManager}: {selRefugio.responsable}</span>
                  )}
                  {selRefugio.address && (
                    <span className="refmetarow">{ICON.pin}{selRefugio.address}</span>
                  )}
                </div>
              )}
              {!selRefugio.necesita && selRefugio.recibe.length === 0 && (
                <p className="refnonote">{t.refNoNeeds}</p>
              )}
              <div className="dactions">
                <a
                  className="btnp"
                  href={mapsDirectionsUrl(selStateLoc.lat, selStateLoc.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ICON.pin}
                  {t.directions}
                </a>
                {selStateLoc.contact_whatsapp && (
                  <a
                    className="btng"
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
                <button className="btng" onClick={() => shareRefugio(selStateLoc, selRefugio)}>
                  {ICON.share}
                  {t.refShareCta}
                </button>
              </div>
              <div className="reffoot">
                {selRefugio.last_confirmed_at && (
                  <span>{t.refConfirmed} {timeAgo(selRefugio.last_confirmed_at, lang)}</span>
                )}
                {selRefugio.fuente && <span>{t.refSource}: {selRefugio.fuente}</span>}
                {/* CC-BY 4.0 attribution (required by AcopioVE's license). */}
                <a className="refattrib" href="https://acopiove.org" target="_blank" rel="noopener noreferrer">
                  {t.refAttrib}
                </a>
              </div>
            </div>
          )}
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
          {/* refcard already carries the info + contact actions for refugios. */}
          {list.length === 0 && showDonationInfo && selStateLoc && !selRefugio && (
            <div className="locinfo">
              <div className="empty">
                {selStateLoc.type === "donation_centre" ? t.donationInfo : t.noPatientsHere}
              </div>
              <div className="dactions">
                <a
                  className="btnp"
                  href={mapsDirectionsUrl(selStateLoc.lat, selStateLoc.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ICON.pin}
                  {t.directions}
                </a>
                {selStateLoc.contact_whatsapp && (
                  <a
                    className="btng"
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
            </div>
          )}
        </div>
      </div>

      {/* ---- Detail overlay ---- */}
      {view === "detail" && selP && (
        <DetailView
          t={t}
          lang={lang}
          patient={selP}
          loc={selLoc}
          onShare={shareCurrent}
          onContribute={openContribute}
          onSeeMap={seeOnMap}
          onClose={() => setView(null)}
        />
      )}

      {/* ---- Contribute overlay (public → contributions moderation queue) ---- */}
      {view === "contribute" && selP && (
        <ContributeView t={t} patient={selP} showToast={showToast} onClose={() => setView("detail")} />
      )}

      {/* ---- Share overlay ---- */}
      {view === "share" && selP && (
        <ShareView t={t} lang={lang} patient={selP} onShareTo={shareTo} onBack={() => setView("detail")} />
      )}

      {/* ---- Donate overlay (external partners; opens in a new tab) ---- */}
      {view === "donate" && (
        <DonateView
          t={t}
          donations={donations}
          showToast={showToast}
          onJoin={() => openContact("donation")}
          onClose={() => setView(null)}
        />
      )}

      {/* ---- Volunteer overlay (recruit health/rescue staff with real info) ---- */}
      {view === "volunteer" && (
        <VolunteerView
          t={t}
          lang={lang}
          showToast={showToast}
          autoOpen={volAutoForm}
          onEmailContact={() => openContact("volunteer")}
          onClose={() => {
            setView(null);
            setVolAutoForm(false);
          }}
        />
      )}

      {/* ---- Contact overlay (public; sends an in-app email + image attachments) ---- */}
      {view === "contact" && (
        <ContactView t={t} kind={contactKind} showToast={showToast} onClose={() => setView(null)} />
      )}

      {/* ---- Report overlay (public intake; submits for review, not to DB) ---- */}
      {view === "report" && (
        <ReportView
          t={t}
          lang={lang}
          locations={locations}
          pending={pending}
          onPendingChange={setPending}
          showToast={showToast}
          onClose={() => setView(null)}
        />
      )}

      {/* ---- Report a missing person (public "Reportar" → /api/reports queue+email) ---- */}
      {view === "reportMissing" && (
        <ReportMissingView t={t} showToast={showToast} onClose={() => setView(null)} />
      )}

      {/* ---- Rescued people (public list) — field info network, no map pins ---- */}
      {view === "rescued" && <RescuedView t={t} rescatados={rescatados} onClose={() => setView(null)} />}

      {/* ---- Refugios needs list (visibilizar necesidades + prompt to collaborate) ---- */}
      {view === "refugios" && (
        <RefugiosView t={t} refugioNeeds={refugioNeeds} onShare={shareRefugio} onClose={() => setView(null)} />
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
              <button className="staff-guide" onClick={openStaffTour} aria-label={t.staffGuide} title={t.staffGuide}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" />
                  <path d="M12 17.5h.01" />
                </svg>
              </button>
            )}
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
                    placeholder="admin@helpmapvzla.net"
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
                    className={"atab " + (adminTab === "novedades" ? "atab-on" : "")}
                    onClick={() => {
                      switchTab("novedades");
                      loadAudit();
                      loadContributions();
                      if (isAdmin) loadVolRequests();
                    }}
                  >
                    {t.tabNews}
                    {contribs.length + volReqs.length + reports.length > 0 && (
                      <span className="atab-badge">{contribs.length + volReqs.length + reports.length}</span>
                    )}
                  </button>
                  <button
                    className={"atab " + (adminTab === "centros" ? "atab-on" : "")}
                    onClick={() => switchTab("centros")}
                  >
                    {t.tabCenters}
                  </button>
                  <button
                    className={"atab " + (adminTab === "personas" ? "atab-on" : "")}
                    onClick={() => switchTab("personas")}
                  >
                    {t.tabPeople}
                  </button>
                  <button
                    className={"atab " + (adminTab === "listas" ? "atab-on" : "")}
                    onClick={() => switchTab("listas")}
                  >
                    {t.tabLists}
                  </button>
                  <button
                    className={"atab " + (adminTab === "rescatados" ? "atab-on" : "")}
                    onClick={() => {
                      switchTab("rescatados");
                      loadRescAdmin();
                    }}
                  >
                    {t.tabRescued}
                  </button>
                  <button
                    className={"atab " + (adminTab === "reportes" ? "atab-on" : "")}
                    onClick={() => {
                      switchTab("reportes");
                      loadReports();
                    }}
                  >
                    {t.tabReports}
                    {reports.length > 0 && <span className="atab-badge">{reports.length}</span>}
                  </button>
                  <button
                    className={"atab " + (adminTab === "donaciones" ? "atab-on" : "")}
                    onClick={() => switchTab("donaciones")}
                  >
                    {t.tabDonations}
                  </button>
                  {isAdmin && (
                    <button
                      className={"atab " + (adminTab === "voluntarios" ? "atab-on" : "")}
                      onClick={() => {
                        switchTab("voluntarios");
                        loadVolunteers();
                        loadVolRequests();
                      }}
                    >
                      {t.tabVolunteers}
                    </button>
                  )}
                </div>
              )}
              <div className="ovbody">
                {/* Maintenance toggle — admin only, shown on every tab (high-impact,
                    same gate as deletes). Flips the public site-wide banner. */}
                {isAdmin && !editType && (
                  <div className={"maint-toggle" + (maintenance ? " maint-toggle-on" : "")}>
                    <div className="maint-toggle-txt">
                      <div className="maint-toggle-title">
                        {t.maintTitle}
                        <span className={"maint-pill" + (maintenance ? " maint-pill-on" : "")}>
                          {maintenance ? t.maintActive : t.maintInactive}
                        </span>
                      </div>
                      <div className="maint-toggle-hint">{t.maintHint}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={maintenance}
                      className={"switch" + (maintenance ? " switch-on" : "")}
                      onClick={toggleMaintenance}
                      disabled={maintBusy}
                      aria-label={t.maintTitle}
                    >
                      <span className="switch-knob" />
                    </button>
                  </div>
                )}
                <div className="note" style={{ marginBottom: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                  {isAdmin ? t.adminLocalNote : t.volReviewNote}
                </div>

                {adminTab === "novedades" && !editType && (
                  <div className="feed">
                    {(contribs.length > 0 || reports.length > 0 || (isAdmin && volReqs.length > 0)) && (
                      <div className="feed-pending">
                        {contribs.length > 0 && (
                          <button className="feed-pill" onClick={() => switchTab("personas")}>
                            {t.newsPendingContribs.replace("{n}", String(contribs.length))}
                          </button>
                        )}
                        {reports.length > 0 && (
                          <button
                            className="feed-pill"
                            onClick={() => {
                              switchTab("reportes");
                              loadReports();
                            }}
                          >
                            {t.newsPendingReports.replace("{n}", String(reports.length))}
                          </button>
                        )}
                        {isAdmin && volReqs.length > 0 && (
                          <button
                            className="feed-pill"
                            onClick={() => {
                              switchTab("voluntarios");
                              loadVolRequests();
                            }}
                          >
                            {t.newsPendingVols.replace("{n}", String(volReqs.length))}
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      className="addbtn"
                      onClick={() => {
                        // Refresh EVERYTHING the panel shows, not just the feed: the
                        // pending-aportes / volunteer-request counts drive the badge and
                        // the pills above, so refreshing only the audit list would leave
                        // them stale (looks like "nothing updated").
                        loadAudit();
                        loadContributions();
                        loadReports();
                        if (isAdmin) loadVolRequests();
                      }}
                    >
                      {t.newsRefresh}
                    </button>
                    {audit.length === 0 ? (
                      <div className="empty">{t.newsEmpty}</div>
                    ) : (
                      <ul className="feed-list">
                        {audit.map((a) => (
                          <li key={a.id} className={"feed-item feed-" + a.entity_type}>
                            <div className="feed-main">
                              <span className="feed-action">{AUDIT_LABEL[a.action]?.[lang] ?? a.action}</span>
                              {a.summary && <span className="feed-sum">{a.summary}</span>}
                            </div>
                            <div className="feed-meta">
                              <span>{a.actor_email ?? (a.action === "contribution_new" || a.action === "volunteer_apply" ? t.newsPublic : t.newsSystem)}</span>
                              <span className="feed-dot">·</span>
                              <span>{timeAgo(a.created_at, lang)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {adminTab === "centros" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newCenter}>
                      {ICON.plus}
                      {t.addCenter}
                    </button>
                    {admSearchBar}
                    {(() => {
                      const rows = locations.filter((l) =>
                        admHit(l.canonical_name + " " + (l.municipality ?? "") + " " + STATE_LABEL[l.state] + " " + TYPE_META[l.type][lang]),
                      );
                      if (rows.length === 0)
                        return <div className="asub" style={{ padding: "8px 2px" }}>{admQ ? t.admSearchNone : t.noResults}</div>;
                      return rows.map((l) => (
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
                          {isAdmin && (
                            <button className="amini del" onClick={() => deleteCenter(l.location_id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                      ));
                    })()}
                  </div>
                )}

                {adminTab === "donaciones" && !editType && (
                  <div>
                    <button className="addbtn" onClick={newDonation}>
                      {ICON.plus}
                      {t.addDonation}
                    </button>
                    {admSearchBar}
                    {donations.length === 0 && <div className="asub" style={{ padding: "8px 2px" }}>{t.donNone}</div>}
                    {donations
                      .filter((d) => admHit(d.name + " " + (d.description ?? "")))
                      .map((d) => (
                      <div className="arow" key={d.id}>
                        <div className="ai">
                          <div className="aname">{d.name}</div>
                          {d.description && <div className="asub">{d.description}</div>}
                        </div>
                        <div className="aacts">
                          <button className="amini" onClick={() => editDonation(d)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deleteDonation(d.id)}>
                              {ICON.trash}
                            </button>
                          )}
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
                    {admSearchBar}
                    {patients.filter((p) => admHit(p.nombres + " " + p.apellidos + " " + p.ci_display + " " + p.location_name)).length === 0 && (
                      <div className="asub" style={{ padding: "8px 2px" }}>{admQ ? t.admSearchNone : t.noResults}</div>
                    )}
                    {patients
                      .filter((p) => admHit(p.nombres + " " + p.apellidos + " " + p.ci_display + " " + p.location_name))
                      .map((p) => {
                      const nAportes = contribs.filter((c) => c.patient_id === p.id).length;
                      return (
                      <div className={"arow " + SM[p.estatus].cls} key={p.id}>
                        <div className="ai">
                          <div className="aname">{p.nombres + " " + p.apellidos}</div>
                          <div className="asub">{p.location_name}</div>
                        </div>
                        <div className="aacts">
                          {nAportes > 0 && (
                            <span className="abadge" style={{ background: "#fde68a", color: "#92400e" }} title={t.tabContribs}>
                              {nAportes} ⬆
                            </span>
                          )}
                          <span className="abadge">{SM[p.estatus][lang]}</span>
                          <button className="amini" onClick={() => editPerson(p)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deletePerson(p.id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {adminTab === "rescatados" && !editType && (
                  <div>
                    <div className="note" style={{ marginBottom: 12 }}>
                      <span className="resc-ic">{ICON.rescue}</span>
                      {t.rescuedReviewNote}
                    </div>
                    <button className="addbtn" onClick={newRescatado}>
                      {ICON.plus}
                      {t.addRescued}
                    </button>
                    {admSearchBar}
                    {rescAdmin.filter((r) => admHit(r.nombres + " " + r.apellidos + " " + (r.ci ?? "") + " " + (r.rescue_site ?? ""))).length === 0 && (
                      <div className="asub" style={{ padding: "8px 2px" }}>{admQ ? t.admSearchNone : t.rescuedNone}</div>
                    )}
                    {rescAdmin
                      .filter((r) => admHit(r.nombres + " " + r.apellidos + " " + (r.ci ?? "") + " " + (r.rescue_site ?? "")))
                      .map((r) => (
                      <div className="arow st-resc" key={r.id}>
                        <div className="ai">
                          <div className="aname">{(r.nombres + " " + r.apellidos).trim() || "—"}</div>
                          <div className="asub">
                            {[
                              r.edad != null ? r.edad + " " + t.yrs : null,
                              r.sexo === "M" ? t.male : r.sexo === "F" ? t.female : null,
                              r.rescue_site,
                            ]
                              .filter(Boolean)
                              .join(" · ") || t.rescuedStatus}
                          </div>
                        </div>
                        <div className="aacts">
                          <button className="amini resc-promote" title={t.promote} onClick={() => startPromote(r)}>
                            {ICON.pin}
                          </button>
                          <button className="amini" onClick={() => editRescatado(r)}>
                            {ICON.edit}
                          </button>
                          {isAdmin && (
                            <button className="amini del" onClick={() => deleteRescatado(r.id)}>
                              {ICON.trash}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "reportes" && !editType && (
                  <div>
                    <div className="note" style={{ marginBottom: 12 }}>
                      <span className="resc-ic">{ICON.search}</span>
                      {t.rmIntro}
                    </div>
                    {reports.length === 0 && (
                      <div className="asub" style={{ padding: "8px 2px" }}>{t.reportsNone}</div>
                    )}
                    {reports.map((r) => (
                      <div className="arow" key={r.id}>
                        <div className="ai">
                          <div className="aname">{(r.nombres + " " + r.apellidos).trim() || "—"}</div>
                          <div className="asub">
                            {[
                              r.ci ? r.ci : null,
                              r.edad != null ? r.edad + " " + t.yrs : null,
                              r.zona ? t.reportZonaLabel + ": " + r.zona : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          {r.descripcion && <div className="asub" style={{ marginTop: 3 }}>{r.descripcion}</div>}
                          <div className="asub" style={{ marginTop: 3 }}>
                            {t.reportReporter}: {r.reporter_name || "—"}
                            {r.reporter_contact ? " · " + r.reporter_contact : ""}
                            {" · " + timeAgo(r.created_at, lang)}
                          </div>
                        </div>
                        <div className="aacts">
                          <button className="amini" title={t.reportMarkReviewed} onClick={() => reviewReport(r.id, "reviewed")}>
                            {ICON.check}
                          </button>
                          <button className="amini del" title={t.reportCloseAction} onClick={() => reviewReport(r.id, "closed")}>
                            {ICON.trash}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab === "listas" && !editType && (
                  <div className="form">
                    <div className="note" style={{ marginBottom: 4 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M7 9h10M7 13h10M7 17h6" />
                      </svg>
                      {t.listHint}
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_ubic}</span>
                      <select className="fselect" value={listLoc} onChange={(e) => setListLoc(e.target.value)}>
                        <option value="">{t.selectHosp}</option>
                        {locations.map((l) => (
                          <option key={l.location_id} value={l.location_id}>
                            {l.canonical_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.listDate}</span>
                      <input
                        className="finput"
                        type="date"
                        max={todayISO}
                        value={listDate}
                        onChange={(e) => setListDate(e.target.value)}
                      />
                      <span className="fhint">{t.listDateHint}</span>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.listNote}</span>
                      <input className="finput" value={listNote} onChange={(e) => setListNote(e.target.value)} placeholder={t.listNote} />
                    </div>
                    <label className="upload">
                      <input type="file" accept="image/*" multiple onChange={onPickList} style={{ display: "none" }} disabled={listBusy} />
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16V4M8 8l4-4 4 4" />
                        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                      </svg>
                      {listBusy
                        ? listProgress && listProgress.total > 1
                          ? `${t.listSending} ${listProgress.done}/${listProgress.total}`
                          : t.listSending
                        : t.listPick}
                    </label>
                    {listBusy && (
                      <div className="list-progress" role="status" aria-live="polite">
                        <span className="spin" />
                        {listProgress && listProgress.total > 1
                          ? `${t.listSending} ${listProgress.done}/${listProgress.total}`
                          : t.listSending}
                      </div>
                    )}
                    {!listBusy && listResult && (
                      <div className={"list-result list-result-" + listResult.kind} role="status" aria-live="polite">
                        {listResult.kind === "ok" ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 8v5M12 16.5v.5" />
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                        )}
                        <span>{listResult.msg}</span>
                      </div>
                    )}
                  </div>
                )}

                {adminTab === "voluntarios" && isAdmin && !editType && (
                  <div className="form">
                    {/* Pending public applications — approve to provision the account. */}
                    <div className="fld">
                      <span className="flabel">{t.volRequests}</span>
                      <span className="fhint">{t.volReqReviewNote}</span>
                      {volReqs.length === 0 && <div className="asub" style={{ padding: "6px 2px" }}>{t.volReqNone}</div>}
                      {volReqs.map((rq) => (
                        <div className="volreq" key={rq.id}>
                          <div className="volreq-head">
                            <span className="volreq-name">{rq.nombre || rq.email}</span>
                            {rq.perfil && (
                              <span className="volreq-badge">
                                {VOL_PROFILES.find((pf) => pf.value === rq.perfil)?.[lang] ?? rq.perfil}
                              </span>
                            )}
                          </div>
                          <div className="volreq-meta">
                            <span>{ICON.mail}{rq.email}</span>
                            {rq.telefono && <span>{ICON.phone}{rq.telefono}</span>}
                            <span className="volreq-date">
                              {new Date(rq.created_at).toLocaleDateString(lang === "es" ? "es-VE" : "en-US")}
                            </span>
                          </div>
                          {rq.fuentes && (
                            <div className="volreq-why">
                              <span className="volreq-why-label">{t.volReqWhy}</span>
                              <p>{rq.fuentes}</p>
                            </div>
                          )}
                          <div className="volreq-acts">
                            <button className="btng volreq-reject" onClick={() => reviewVolRequest(rq.id, "reject")}>
                              {t.volReject}
                            </button>
                            <button className="btnp" onClick={() => reviewVolRequest(rq.id, "approve")}>
                              {ICON.check}
                              {t.volApprove}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="fld" style={{ marginTop: 8 }}>
                      <span className="flabel">{t.email}</span>
                      <input
                        className="finput"
                        type="email"
                        autoComplete="off"
                        value={volEmail}
                        onChange={(e) => setVolEmail(e.target.value)}
                        placeholder="voluntario@correo.com"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.volPass}</span>
                      <div className="frow" style={{ alignItems: "stretch" }}>
                        <input
                          className="finput mono"
                          value={volPass}
                          onChange={(e) => setVolPass(e.target.value)}
                          placeholder="••••••"
                        />
                        <button type="button" className="btng" style={{ flex: "0 0 auto" }} onClick={genPass}>
                          {t.volGenerate}
                        </button>
                      </div>
                    </div>
                    <button className="btnp" onClick={createVolunteer} disabled={volBusy}>
                      {ICON.plus}
                      {volBusy ? "…" : t.volCreate}
                    </button>

                    <div style={{ marginTop: 16 }}>
                      {volunteers.length === 0 && <div className="empty">{t.volNone}</div>}
                      {volunteers.map((v) => (
                        <div className="arow" key={v.user_id}>
                          <div className="ai">
                            <div className="aname">{v.email}</div>
                            <div className="asub">{t.tabVolunteers}</div>
                          </div>
                          <div className="aacts">
                            <button className="amini del" onClick={() => revokeVolunteer(v.user_id)}>
                              {ICON.trash}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    <div className="fld">
                      <span className="flabel">{t.f_address}</span>
                      <div className="geo-row">
                        <input
                          className="finput"
                          value={geoQuery}
                          onChange={(e) => setGeoQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (!geoBusy) geocodeAddress();
                            }
                          }}
                          placeholder={draft?.canonical_name || t.f_address}
                        />
                        <button className="btng geo-btn" onClick={geocodeAddress} disabled={geoBusy} type="button">
                          {geoBusy ? t.geoSearching : t.geoSearch}
                        </button>
                      </div>
                      {geoResults.length > 0 ? (
                        <div className="geo-results">
                          <span className="fhint">{t.geoPick}</span>
                          {geoResults.map((r, i) => (
                            <button key={i} type="button" className="geo-res" onClick={() => pickGeoResult(r)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10Z" />
                                <circle cx="12" cy="11" r="2" />
                              </svg>
                              <span>{r.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="fhint">{t.geoHint}</span>
                      )}
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
                    {/* Refugio needs: only for shelters. Editable by staff so each
                        refugio's differing needs stay current (AcopioVE, §14). */}
                    {draft?.type === "shelter" && (
                      <div className="refedit">
                        <span className="refedit-h">{t.refEditTitle}</span>
                        <div className="fld">
                          <span className="flabel">{t.f_refNecesita}</span>
                          <textarea
                            className="finput"
                            rows={3}
                            value={draft?.ref_necesita || ""}
                            onChange={(e) => setDraft((d) => ({ ...(d || {}), ref_necesita: e.target.value }))}
                            placeholder={t.f_refNecesita}
                          />
                          <span className="fhint">{t.f_refNecesitaHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refRecibe}</span>
                          <input
                            className="finput"
                            value={draft?.ref_recibe || ""}
                            onChange={setD("ref_recibe")}
                            placeholder="Agua, Alimentos, Medicamentos, Pañales"
                          />
                          <span className="fhint">{t.f_refRecibeHint}</span>
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refHorario}</span>
                          <input className="finput" value={draft?.ref_horario || ""} onChange={setD("ref_horario")} placeholder={t.f_refHorario} />
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refResponsable}</span>
                          <input className="finput" value={draft?.ref_responsable || ""} onChange={setD("ref_responsable")} placeholder={t.f_refResponsable} />
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refAddress}</span>
                          <input className="finput" value={draft?.ref_address || ""} onChange={setD("ref_address")} placeholder={t.f_refAddress} />
                        </div>
                        <div className="fld">
                          <span className="flabel">{t.f_refAnimal}</span>
                          <div className="seg">
                            <button className={"segb " + (!draft?.ref_animal ? "segb-on" : "")} onClick={setDV("ref_animal", false)}>
                              {t.no}
                            </button>
                            <button className={"segb " + (draft?.ref_animal ? "segb-on" : "")} onClick={setDV("ref_animal", true)}>
                              {t.yes}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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

                {editType === "donation" && (
                  <div className="form">
                    <div className="fld">
                      <span className="flabel">{t.f_donName}</span>
                      <input
                        className="finput"
                        value={draft?.don_name || ""}
                        onChange={setD("don_name")}
                        placeholder={t.f_donName}
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donDesc}</span>
                      <input
                        className="finput"
                        value={draft?.don_desc || ""}
                        onChange={setD("don_desc")}
                        placeholder={t.f_donDesc}
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donSocial}</span>
                      <input
                        className="finput"
                        type="url"
                        inputMode="url"
                        value={draft?.don_social || ""}
                        onChange={setD("don_social")}
                        placeholder="https://instagram.com/…"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donUrl}</span>
                      <input
                        className="finput"
                        type="url"
                        inputMode="url"
                        value={draft?.don_url || ""}
                        onChange={setD("don_url")}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_donInfo}</span>
                      <textarea
                        className="finput"
                        rows={4}
                        value={draft?.don_info || ""}
                        onChange={(e) => setDraft((d) => ({ ...(d || {}), don_info: e.target.value }))}
                        placeholder={t.f_donInfoHint}
                      />
                      <span className="fhint">{t.f_donInfoHint}</span>
                    </div>
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={saveDonation}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deleteDonation(editId)}>
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
                    {/* Verified is the publish gate (§8): a photo / FALLECIDO only shows
                        publicly once the record is verified. Open to all staff (admin OR
                        volunteer) — volunteers are trusted and their access is revocable. */}
                    {(isAdmin || isVolunteer) && (
                      <div className="fld">
                        <span className="flabel">{t.verified}</span>
                        <div className="seg">
                          <button className={"segb " + (!draft?.verified ? "segb-on" : "")} onClick={setDV("verified", false)}>
                            {t.verifiedNo}
                          </button>
                          <button className={"segb " + (draft?.verified ? "segb-on" : "")} onClick={setDV("verified", true)}>
                            {t.verifiedYes}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Pending photo/info contributions for THIS person — approve/reject in place. */}
                    {editId && contribs.some((c) => c.patient_id === editId) && (
                      <div className="fld">
                        <span className="flabel">{t.tabContribs}</span>
                        <span className="fhint">{t.contribReviewNote}</span>
                        {contribs
                          .filter((c) => c.patient_id === editId)
                          .map((c) => (
                            <div className="arow" key={c.id}>
                              {c.foto_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.foto_url} alt="" loading="lazy" decoding="async" className="upload-thumb" style={{ width: 48, height: 48, marginRight: 10 }} />
                              )}
                              <div className="ai">
                                {c.descripcion && <div className="asub">{c.descripcion}</div>}
                                {c.contacto && <div className="asub mono">{c.contacto}</div>}
                              </div>
                              <div className="aacts">
                                <button className="amini" title={t.contribApprove} onClick={() => reviewContribution(c.id, "approve")}>
                                  {ICON.check}
                                </button>
                                <button className="amini del" title={t.contribReject} onClick={() => reviewContribution(c.id, "reject")}>
                                  {ICON.trash}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
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

                {editType === "rescatado" && (
                  <div className="form">
                    <div className="note">
                      <span className="resc-ic">{ICON.rescue}</span>
                      {t.rescuedFieldNote}
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_ape}</span>
                      <input className="finput" value={draft?.apellidos || ""} onChange={setD("apellidos")} placeholder={t.f_ape} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_nom}</span>
                      <input className="finput" value={draft?.nombres || ""} onChange={setD("nombres")} placeholder={t.f_nom} />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_minor}</span>
                      <div className="seg">
                        <button className={"segb " + (!draft?.is_minor ? "segb-on" : "")} onClick={setDV("is_minor", false)}>
                          {t.no}
                        </button>
                        <button className={"segb " + (draft?.is_minor ? "segb-on" : "")} onClick={setDV("is_minor", true)}>
                          {t.yes}
                        </button>
                      </div>
                    </div>
                    <div className="frow">
                      <div className="fld">
                        <span className="flabel">{t.f_ci}</span>
                        <input
                          className="finput mono"
                          value={draft?.is_minor ? "MENOR" : draft?.ci || ""}
                          onChange={setD("ci")}
                          placeholder="V-00.000.000"
                          disabled={!!draft?.is_minor}
                        />
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
                      <span className="flabel">{t.f_rescueSite}</span>
                      <input className="finput" value={draft?.rescue_site || ""} onChange={setD("rescue_site")} placeholder={t.f_rescueSite} />
                      <span className="fhint">{t.f_rescueSiteHint}</span>
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_notas}</span>
                      <textarea
                        className="finput"
                        rows={3}
                        value={draft?.notas || ""}
                        onChange={(e) => setDraft((d) => ({ ...(d || {}), notas: e.target.value }))}
                        placeholder={t.f_notasHint}
                      />
                    </div>
                    <div className="fld">
                      <span className="flabel">{t.f_contact}</span>
                      <input className="finput" value={draft?.contacto || ""} onChange={setD("contacto")} placeholder="+58…" />
                    </div>
                    <div className="note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                      </svg>
                      {t.rescuedPublicNote}
                    </div>
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={saveRescatado}>
                        {t.save}
                      </button>
                    </div>
                    {canDelete && (
                      <button className="edel" onClick={() => editId && deleteRescatado(editId)}>
                        {t.del}
                      </button>
                    )}
                  </div>
                )}

                {editType === "promote" && (
                  <div className="form">
                    <div className="note">
                      <span className="resc-ic">{ICON.pin}</span>
                      {t.promoteHint}
                    </div>
                    <div className="arow" style={{ borderBottom: "none" }}>
                      <div className="ai">
                        <div className="aname">{((draft?.nombres || "") + " " + (draft?.apellidos || "")).trim() || "—"}</div>
                        <div className="asub">
                          {[
                            draft?.edad ? draft.edad + " " + t.yrs : null,
                            draft?.sexo === "M" ? t.male : draft?.sexo === "F" ? t.female : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
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
                    {(isAdmin || isVolunteer) && (
                      <div className="fld">
                        <span className="flabel">{t.verified}</span>
                        <div className="seg">
                          <button className={"segb " + (!draft?.verified ? "segb-on" : "")} onClick={setDV("verified", false)}>
                            {t.verifiedNo}
                          </button>
                          <button className={"segb " + (draft?.verified ? "segb-on" : "")} onClick={setDV("verified", true)}>
                            {t.verifiedYes}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="ebtns">
                      <button className="btng" onClick={clearEdit}>
                        {t.cancel}
                      </button>
                      <button className="btnp" onClick={savePromotion}>
                        {t.promoteTitle}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!!toast && <div className="toast">{toast}</div>}

      {/* In-app publish confirmation (replaces window.confirm): corroborate a photo
          before it goes public on an already-verified record (§2/§8 double-lock). */}
      {pubConfirm && (
        <div className="cfmwrap" onClick={() => setPubConfirm(null)}>
          <div className="cfm" onClick={(e) => e.stopPropagation()}>
            <div className="cfm-icon">{ICON.check}</div>
            <h3 className="cfm-title">{t.contribPublishTitle}</h3>
            <p className="cfm-body">{t.contribPublishConfirm}</p>
            <div className="cfm-actions">
              <button className="cfm-cancel" onClick={() => setPubConfirm(null)}>
                {t.cancel}
              </button>
              <button
                className="cfm-ok"
                onClick={() => {
                  const id = pubConfirm;
                  setPubConfirm(null);
                  void doReviewContribution(id, "approve");
                }}
              >
                {t.contribApprove}
              </button>
            </div>
          </div>
        </div>
      )}

      <Tour
        open={tourOpen}
        lang={lang}
        onClose={closeTour}
        onVolunteer={() => {
          closeTour();
          setView("volunteer");
        }}
        onLogin={
          !user
            ? () => {
                closeTour();
                setView("admin");
                clearEdit();
              }
            : undefined
        }
      />

      <Tour open={staffTourOpen} lang={lang} onClose={closeStaffTour} variant="staff" />
    </div>
  );
}
