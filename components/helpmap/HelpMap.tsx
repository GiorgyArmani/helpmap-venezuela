"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ESTATUS_ORDER,
  SM,
  STATE_LABEL,
  T,
  TYPE_META,
  norm,
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
  type VzlaState,
} from "./data";
import { createClient } from "@/utils/supabase/client";
import { flushQueue, queueCount } from "./intakeQueue";
import { compressImage, LIST_OPTS } from "./uploadPhoto";
import {
  centerUrl,
  copyText,
  nativeShare,
  mapsDirectionsUrl,
  openShare,
  patientUrl,
  shareCenterStoryImage,
  shareStoryImage,
  shareText,
  telegramUrl,
  whatsappUrl,
} from "./share";
import Tour from "./Tour";
import "./helpmap.css";

import { ICON, TYPE_ICON, FLAG_ICON } from "./icons";
import { CenterPicker } from "./CenterPicker";
import { StatePicker } from "./StatePicker";
import { Avatar } from "./Avatar";
import { RescuedView } from "./RescuedView";
import { RefugiosView } from "./RefugiosView";
import { RefugioShareView } from "./RefugioShareView";
import { ShareView } from "./ShareView";
import { DonateView } from "./DonateView";
import { DetailView } from "./DetailView";
import { ReportMissingView } from "./ReportMissingView";
import { ContactView } from "./ContactView";
import { ContributeView } from "./ContributeView";
import { VolunteerView } from "./VolunteerView";
import { ReportView } from "./ReportView";
import AdminPanel from "./AdminPanel";
import { AdminProvider } from "./AdminContext";
import { useHelpMapData } from "./useHelpMapData";
import { useStaffFeed } from "./useStaffFeed";
import { useMapMarkers } from "./useMapMarkers";
import { timeAgo, veStateFromAddress, municipalityFromAddress, parseLatLng } from "./helpers";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  TOUR_KEY,
  STAFF_TOUR_KEY,
} from "./constants";
import type {
  View,
  AdminTab,
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
  // Center-type filter is multi-select: empty Set = all types; toggling a chip
  // adds/removes that type (CLAUDE.md mobile-minimal: no separate "Todos" chip).
  const [typeF, setTypeF] = useState<Set<LocationType>>(() => new Set());
  const [locationSel, setLocationSel] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The help point (refugio / centro de acopio) currently open in the share overlay,
  // plus the view to return to on back (the map bottom-sheet or the refugios list).
  const [refShareSel, setRefShareSel] = useState<{ loc: Location; ref: Refugio } | null>(null);
  const [refShareBack, setRefShareBack] = useState<View>(null);
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
  const [pickingOnMap, setPickingOnMap] = useState(false); // "ubicar tocando el mapa" mode (center form)

  // Lazily-created Supabase client (anon key), shared by the data hook + all handlers.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  // Public dataset (cache-first + revalidate) lives in a dedicated hook (§14 Phase 3).
  const {
    locations, setLocations,
    patients, setPatients,
    donations, setDonations,
    rescatados, setRescatados,
    refugios, setRefugios,
    maintenance, setMaintenance,
    stale,
  } = useHelpMapData(getSupabase);
  const [maintBusy, setMaintBusy] = useState(false);
  const [showHeat, setShowHeat] = useState(false); // damage heat overlay off by default (user toggles "Daños")
  // "Mi ubicación": the visitor's own GPS position, shown as a blue dot so they can
  // orient themselves on the map. Requested explicitly (button tap), never on load —
  // asking for location permission unprompted is unexpected and often auto-denied.
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Auth
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // true only if the user has an admin role row
  const [isVolunteer, setIsVolunteer] = useState(false); // admin OR volunteer (staff)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [recoverMode, setRecoverMode] = useState(false); // "forgot password" sub-view
  const [recoverSent, setRecoverSent] = useState(false);

  // Staff feed (moderation queues + audit log + volunteer roster) lives in a dedicated
  // hook (§14 Phase 3): owns the state + loaders + the preload/60s-polling effects.
  const {
    contribs, setContribs,
    reports, setReports,
    audit,
    rescAdmin, setRescAdmin,
    volReqs, setVolReqs,
    volunteers, setVolunteers,
    loadContributions, loadReports, loadAudit, loadRescAdmin, loadVolunteers, loadVolRequests,
  } = useStaffFeed(getSupabase, isAdmin, isVolunteer, view);

  // Volunteer management (admin) + list upload (staff)
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

  // Public intake form + offline queue
  // FAB "+" menu (Reportar desaparecido / Aportar datos).
  const [fabOpen, setFabOpen] = useState(false);
  // Language switcher dropdown (flag + code button that expands to ES/EN/PT). A single
  // trigger button keeps the header row from overflowing on mobile now that there are
  // three languages with flag swatches, instead of three always-visible pill buttons.
  const [langOpen, setLangOpen] = useState(false);
  // Report-a-missing-person form (the public "Reportar" flow → /api/reports).
  const [pending, setPending] = useState(() => (typeof window !== "undefined" ? queueCount() : 0));
  const [tourOpen, setTourOpen] = useState(false);
  const [staffTourOpen, setStaffTourOpen] = useState(false);

  const t = T[lang];
  // Upper bound for the "fecha del dato" pickers — data can't be from the future.
  const todayISO = new Date().toISOString().slice(0, 10);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    () =>
      locations.filter(
        (l) => !shadowedRefugios.has(l.location_id) && (typeF.size === 0 || typeF.has(l.type)),
      ),
    [locations, shadowedRefugios, typeF],
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

  // Data-driven list of center types present in the loaded locations, in TYPE_META order
  // (so new types — comedor, morgue… — surface as a filter chip automatically once rows exist).
  const typesAvailable = useMemo(() => {
    const present = new Set<LocationType>();
    locations.forEach((l) => present.add(l.type));
    return (Object.keys(TYPE_META) as LocationType[]).filter((t) => present.has(t));
  }, [locations]);

  const tsMatch = useCallback(
    (p: PatientPublic) => {
      const q = norm(query.trim());
      const textOk = !q || norm(p.nombres + " " + p.apellidos + " " + p.ci_display).includes(q);
      const statusOk = status === "all" || p.estatus === status;
      const stateOk = stateF === "all" || p.state === stateF;
      const typeOk = typeF.size === 0 || typeF.has(p.location_type);
      return textOk && statusOk && stateOk && typeOk;
    },
    [query, status, stateF, typeF],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1900);
  }, []);

  // The Leaflet map subsystem (init + marker/overlay effects + damage heat) lives in a hook
  // (§14 Phase 3). onMarkerRef is created HERE, before the hook, so `onMarker` below — which
  // reads the hook's mapRef — is wired into it via the sync effect (breaks the ref cycle).
  const onMarkerRef = useRef<(id: string) => void>(() => {});
  const { containerRef, mapRef, markersRef, clusterRef, damage } = useMapMarkers({
    mapLabels,
    mapLocations,
    patients,
    tsMatch,
    locationSel,
    focusId,
    refugioById,
    editType,
    draft,
    setDraft,
    pickingOnMap,
    showHeat,
    myLoc,
    onMarkerRef,
  });

  // "Mi ubicación" button: one-shot GPS read, recenters the map and drops a blue "you
  // are here" dot (see the marker effect below). Never runs automatically.
  const locateMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showToast(t.locateUnsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setMyLoc({ lat: latitude, lng: longitude, accuracy });
        setLocating(false);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 14), { animate: false });
        }
      },
      (err) => {
        setLocating(false);
        showToast(err.code === err.PERMISSION_DENIED ? t.locateDenied : t.locateFailed);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [showToast, t, mapRef]);

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
    [locationSel, locById, mapRef],
  );
  useEffect(() => {
    onMarkerRef.current = onMarker;
  }, [onMarker]);

  // Leaving the center form ends map-pick mode (avoids a stuck crosshair / hidden panel).
  useEffect(() => {
    if (editType !== "center" && pickingOnMap) setPickingOnMap(false);
  }, [editType, pickingOnMap]);

  // ---- Derived list ------------------------------------------------------
  const list = useMemo(
    () => patients.filter((p) => tsMatch(p) && (!locationSel || p.location_id === locationSel)),
    [patients, tsMatch, locationSel],
  );

  // Freshness of the list AS A WHOLE, not just per-card: the most recent updated_at among
  // the visible people. Per-record "hace X" (DetailView) hides how stale the rest of a
  // hospital's list might be — this surfaces one number for the whole selection.
  const listFreshest = useMemo(() => {
    if (list.length === 0) return null;
    return list.reduce((max, p) => (p.updated_at > max ? p.updated_at : max), list[0].updated_at);
  }, [list]);

  // The status filter (Ingresado/Alta/Fallecido) is hospital-specific and now lives in
  // the list header, shown only when a hospital center is selected. Reset it to "all"
  // whenever the active center isn't a hospital, so a lingering status filter doesn't
  // silently filter the map counts + list while its control is hidden.
  useEffect(() => {
    const isHosp = locationSel ? locById[locationSel]?.type === "hospital" : false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isHosp) setStatus((s) => (s === "all" ? s : "all"));
  }, [locationSel, locById]);

  const flyTo = (l: Location | undefined, zoom = 14) => {
    const map = mapRef.current;
    if (!map || !l) return;
    const marker = markersRef.current[l.location_id];
    const cluster = clusterRef.current?.[l.type];
    // If the target pin is collapsed inside its type's cluster, expand it first so the
    // user actually sees the center they picked (from "Ver en el mapa" / center dropdown).
    if (marker && cluster?.zoomToShowLayer) {
      cluster.zoomToShowLayer(marker, () => {
        map.setView([l.lat, l.lng], Math.max(map.getZoom(), zoom), { animate: false });
      });
    } else {
      map.setView([l.lat, l.lng], zoom, { animate: false });
    }
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

  // Open the share overlay for a help point's NEED — the same rich system as patients
  // (preview card + WhatsApp/Telegram/Instagram-story/copy), so a need can be shared
  // "a sociales bien" instead of only a raw WhatsApp text (CLAUDE.md §5, focus:
  // visibilizar necesidades). The IG target generates a 1080×1920 image of the need.
  const shareRefugio = (loc: Location, r: Refugio) => {
    setRefShareSel({ loc, ref: r });
    setRefShareBack(view);
    setView("refShare");
  };

  // Build the shareable text for a help point's need. Links to /c/<id> (an SSR page
  // that renders a HelpMap OG preview card), not a bare Maps URL.
  const refShareMessage = (loc: Location, r: Refugio) => {
    const needs = r.necesita?.trim() || (r.recibe.length ? r.recibe.join(", ") : "");
    const where = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(", ");
    return (
      `🆘 ${loc.canonical_name}${where ? " · " + where : ""} necesita ayuda` +
      (needs ? `:\n${needs}` : "") +
      `\n${t.refShareTag}`
    );
  };

  const shareRefugioTo = async (target: "wa" | "tg" | "ig" | "copy") => {
    if (!refShareSel) return;
    const { loc, ref } = refShareSel;
    const url = centerUrl(loc.location_id);
    const text = refShareMessage(loc, ref);
    if (target === "wa") openShare(whatsappUrl(url, text));
    else if (target === "tg") openShare(telegramUrl(url, text));
    else if (target === "ig") {
      showToast(t.storyBuilding);
      const r = await shareCenterStoryImage(loc.location_id, loc.canonical_name);
      if (r === "shared") showToast(t.storyShared);
      else if (r === "downloaded") showToast(t.storyDownloaded);
      else showToast(t.storyError);
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

  const pickState = (v: "all" | VzlaState) => {
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
  const onSelectType = (v: LocationType) => {
    // Toggle: add the type if absent, remove it if already active (a second tap on
    // the same chip clears it). Empty set means "all types".
    const next = new Set(typeF);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    const cur = locationSel ? locById[locationSel] : null;
    // Drop the selected center if the new filter set hides its pin.
    const keep = cur && (next.size === 0 || next.has(cur.type)) ? locationSel : null;
    setTypeF(next);
    setLocationSel(keep);
    setSheetOpen(true);
  };
  const pickCenter = (id: string | null) => {
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
    // Escape hatch: if the admin pasted coordinates or a Google/Apple Maps link, use
    // them directly — this always resolves, even when Nominatim/Photon can't find the
    // address. Keeps the current name (a raw coord has no POI name to fill).
    const coords = parseLatLng(term);
    if (coords) {
      setDraft((d) => ({ ...(d || {}), lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) }));
      setGeoResults([]);
      mapRef.current?.setView([coords.lat, coords.lng], 16, { animate: true });
      showToast(t.geoFound);
      return;
    }
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
      // Nominatim came up empty → try Photon (Komoot), a second free OSM geocoder with
      // different/fuzzier matching that often finds POIs Nominatim misses. Biased toward
      // the Venezuela corridor. No API key needed.
      if (!hits.length) {
        try {
          const purl =
            "https://photon.komoot.io/api/?limit=6&lang=" +
            (lang === "es" ? "es" : "en") +
            "&lat=10.5&lon=-66.9&q=" +
            encodeURIComponent(queries[0]);
          const pres = await fetch(purl);
          const pjson = (await pres.json()) as {
            features?: Array<{
              geometry?: { coordinates?: [number, number] };
              properties?: Record<string, string>;
            }>;
          };
          hits = (pjson.features || [])
            .map((f) => {
              const [lng, lat] = f.geometry?.coordinates || [NaN, NaN];
              const p = f.properties || {};
              const label = [p.name, p.street, p.district, p.city, p.state]
                .filter(Boolean)
                .join(", ");
              // Photon uses OSM keys; remap to what veStateFromAddress/municipality expect.
              const address: Record<string, string> = {
                state: p.state || "",
                city: p.city || "",
                county: p.county || "",
                municipality: p.county || p.city || "",
              };
              return { lat, lng, label: label || p.name || queries[0], address };
            })
            .filter((h) => isFinite(h.lat) && isFinite(h.lng) && h.lat >= 0 && h.lat <= 17 && h.lng >= -74 && h.lng <= -58);
        } catch {
          /* Photon offline — fall through to not-found */
        }
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
        tipo: loc.type === "donation_centre" ? "acopio" : "refugio",
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
    // Shelter/acopio needs (recibe/necesita/…) live in the companion `refugios` table.
    // Upsert it whenever the center is a refugio (shelter) OR a punto de acopio
    // (donation_centre) — both carry AcopioVE needs (CLAUDE.md §14). Non-fatal: the
    // center already saved.
    if (obj.type === "shelter" || obj.type === "donation_centre") {
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
      // Edit clock for the Workflow C timestamp gate: advance it on every app write so the
      // every-poll Sheets→Supabase pipeline upsert won't clobber this edit. Separate from
      // `updated_at` (family-facing freshness); this one is pipeline-internal. See CLAUDE.md.
      data_updated_at: new Date().toISOString(),
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
      // Edit clock for the Workflow C timestamp gate (see CLAUDE.md / savePerson).
      data_updated_at: new Date().toISOString(),
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
  // Password recovery: email a reset link that lands on /auth/reset. redirectTo uses
  // the current origin so it works in dev and prod (both must be in Supabase's
  // Redirect URLs allowlist). We always report success (never reveal if the email exists).
  const sendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginErr("");
    try {
      await getSupabase().auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
    } catch {
      /* ignore — still report success below */
    } finally {
      setRecoverSent(true);
      setLoginBusy(false);
    }
  };

  // ---- Volunteer management (admin-only, via server API) -----------------
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
    const order: LocationType[] = ["hospital", "shelter", "comedor", "morgue", "donation_centre"];
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
  // A donation centre / comedor tracks NO patients — showing "0 personas" reads as
  // "nobody was helped here", alarming and wrong. For those types the header shows the
  // center kind ("Centro de acopio" / "Comedor") instead of a people count; the body
  // already carries the how-to-help / who's-in-charge info (refcard / comedorcard).
  const selHasPatients = selStateLoc ? TYPE_META[selStateLoc.type].hasPatients : true;
  // Status filter belongs to the list header and only for hospitals (INGRESADO/ALTA/
  // FALLECIDO are hospital states; refugios/comedores don't use them).
  const showStatusFilter = selStateLoc?.type === "hospital";
  // Keep the phone UI calm: don't render the patient list until the user has a reason
  // to see it — a name/CI search, or a center tapped/selected (CLAUDE.md mobile focus).
  const listActive = query.trim().length > 0 || locationSel !== null;
  // A selected center's needs card: its own refugio row, or a refugio merged onto it
  // (a coincident AcopioVE hospital-refuge that we shadowed to avoid a duplicate pin).
  const selRefugio = locationSel ? refugioById[locationSel] ?? needsForCenter[locationSel] ?? null : null;
  const showDonationInfo =
    !!selStateLoc &&
    (selStateLoc.type === "donation_centre" ||
      selStateLoc.type === "comedor" ||
      (list.length === 0 && !query && status === "all"));

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
            <button className="donate-btn" onClick={() => setView("donate")} aria-label={t.donate}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
              </svg>
              <span className="donate-label">{t.donate}</span>
            </button>
            <button
              className="gear"
              onClick={() => setTourOpen(true)}
              aria-label={{ es: "Cómo funciona", en: "How it works", pt: "Como funciona" }[lang]}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5" />
                <path d="M12 17.5h.01" />
              </svg>
            </button>
            <div className="langwrap">
              <button
                className={"langbtn " + (langOpen ? "langbtn-open" : "")}
                onClick={() => setLangOpen((o) => !o)}
                aria-expanded={langOpen}
                aria-label={{ es: "Cambiar idioma", en: "Change language", pt: "Mudar idioma" }[lang]}
              >
                <span className="lg-flag lg-flag-lg">{FLAG_ICON[lang]}</span>
                <span className="langbtn-code">{lang.toUpperCase()}</span>
                <svg className="langbtn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {langOpen && (
                <>
                  <button className="lang-backdrop" aria-label="" onClick={() => setLangOpen(false)} />
                  <div className="lang-menu">
                    {(
                      [
                        ["es", "Español"],
                        ["en", "English"],
                        ["pt", "Português"],
                      ] as const
                    ).map(([code, name]) => (
                      <button
                        key={code}
                        className={"lang-opt " + (lang === code ? "lang-opt-on" : "")}
                        onClick={() => {
                          setLang(code);
                          setLangOpen(false);
                        }}
                      >
                        <span className="lg-flag lg-flag-lg">{FLAG_ICON[code]}</span>
                        <span className="lang-opt-name">{name}</span>
                        {lang === code && <span className="lang-opt-check">{ICON.check}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
          <StatePicker t={t} states={statesAvailable} value={stateF} onPick={pickState} />
          <CenterPicker
            t={t}
            lang={lang}
            groups={centerFilterGroups}
            valueId={locationSel}
            locById={locById}
            onPick={pickCenter}
          />
        </div>

        {/* Center-type filter (Hospital / Refugio / Comedor / …). Data-driven from the
            types present in the loaded locations — a new type appears automatically.
            Multi-select toggles: no "Todos" chip; none active = all types shown. */}
        {typesAvailable.length > 1 && (
          <div className="chips">
            {typesAvailable.map((ty) => (
              <button
                key={ty}
                className={"chip " + (typeF.has(ty) ? "chip-on" : "")}
                onClick={() => onSelectType(ty)}
              >
                <span className="tico" style={{ color: TYPE_META[ty].color }}>{TYPE_ICON[ty]}</span>
                {TYPE_META[ty][lang]}
              </button>
            ))}
          </div>
        )}

        {stale && (
          <div className="stale">
            {ICON.wifiOff}
            {t.staleData}
          </div>
        )}
      </div>

      {!view && (
        <div className="zoomctl">
          <button
            className="zbtn"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label={{ es: "Acercar", en: "Zoom in", pt: "Aproximar" }[lang]}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            className="zbtn"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label={{ es: "Alejar", en: "Zoom out", pt: "Afastar" }[lang]}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      )}

      {!view && (
        <div className="locatectl">
          <button
            className={"locatebtn" + (locating ? " locatebtn-busy" : "")}
            onClick={locateMe}
            aria-label={t.locateMe}
            title={t.locateMe}
          >
            {ICON.locate}
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
              {selStateLoc && !selHasPatients ? (
                <span className="hkind">{TYPE_META[selStateLoc.type][lang]}</span>
              ) : (
                <>
                  <b>{list.length}</b> {t.people}
                </>
              )}
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
          {/* Whole-list freshness (not just per-card): "hace 6h" per record hides how stale
              the rest of a hospital's list might be, so surface one number for the selection. */}
          {listActive && listFreshest && (
            <div className="hfresh">
              {(locationSel && locById[locationSel]
                ? t.listFreshnessNamed.replace("{name}", locById[locationSel]!.canonical_name)
                : t.listFreshness
              ).replace("{time}", timeAgo(listFreshest, lang))}
            </div>
          )}
        </button>
        <div className="list">
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
                <span className="refkick">{ICON.pin}{selStateLoc.type === "donation_centre" ? t.refAcopioInfo : t.refShelterInfo}</span>
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
                    className="btng btnwa"
                    href={`https://wa.me/${selStateLoc.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ICON.wa}
                    {t.whatsapp}
                  </a>
                )}
                {selStateLoc.contact_phone && (
                  <a className="btng btncall" href={`tel:${selStateLoc.contact_phone}`}>
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
          {/* Status filter (Ingresado / Alta / Fallecido) lives in the list header, next
              to the data it filters, and only for a hospital (CLAUDE.md mobile focus). */}
          {showStatusFilter && (
            <div className="liststatus">
              {chips.map((c) => (
                <button
                  key={c.key}
                  className={"lchip " + (status === c.key ? "lchip-on" : "")}
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
          )}
          {/* Idle (no search, no center): keep the sheet minimal — prompt instead of a
              full list, so the phone UI isn't buried under hundreds of cards. */}
          {!listActive && <div className="empty listprompt">{t.browseHint}</div>}
          {listActive &&
            list.map((p) => (
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
          {listActive && list.length === 0 && !showDonationInfo && <div className="empty">{t.noResults}</div>}
          {/* Comedor (WCK free kitchen): an explanatory info pin — no patient list.
              Clear branded card + directions + a prompt to donate (WCK is in "Donar"). */}
          {list.length === 0 && showDonationInfo && selStateLoc && !selRefugio && selStateLoc.type === "comedor" && (
            <div className="comedorcard">
              <span className="comedorkick">{ICON.utensils}{t.comedorTitle}</span>
              <p className="comedordesc">{t.comedorDesc}</p>
              <div className="comedorhours">{ICON.clock}{t.comedorHours}</div>
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
                <button className="btng" onClick={() => setView("donate")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
                  </svg>
                  {t.comedorDonate}
                </button>
              </div>
            </div>
          )}
          {/* refcard already carries the info + contact actions for refugios. */}
          {list.length === 0 && showDonationInfo && selStateLoc && !selRefugio && selStateLoc.type !== "comedor" && (
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
                    className="btng btnwa"
                    href={`https://wa.me/${selStateLoc.contact_whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ICON.wa}
                    {t.whatsapp}
                  </a>
                )}
                {selStateLoc.contact_phone && (
                  <a className="btng btncall" href={`tel:${selStateLoc.contact_phone}`}>
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

      {view === "refShare" && refShareSel && (
        <RefugioShareView
          t={t}
          lang={lang}
          loc={refShareSel.loc}
          refugio={refShareSel.ref}
          onShareTo={shareRefugioTo}
          onBack={() => setView(refShareBack)}
        />
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
      {/* Floating guide while placing a center by tapping the map (panel hidden below). */}
      {pickingOnMap && (
        <div className="pickbanner">
          <span>{t.geoPickBanner}</span>
          <button type="button" className="pickdone" onClick={() => setPickingOnMap(false)}>
            {t.geoPickDone}
          </button>
        </div>
      )}

      {view === "admin" && (
        <AdminProvider
          value={{
            pickingOnMap, setPickingOnMap, user, signOut, openStaffTour, setView, clearEdit, t, lang,
            recoverMode, setRecoverMode, sendRecovery, recoverSent, setRecoverSent,
            loginEmail, setLoginEmail, loginBusy, loginErr, setLoginErr, signIn, loginPass, setLoginPass,
            editType, adminTab, switchTab, isAdmin, isVolunteer,
            loadAudit, loadContributions, loadVolRequests, loadVolunteers, loadReports, loadRescAdmin,
            maintenance, toggleMaintenance, maintBusy,
            contribs, reports, volReqs, audit,
            admSearchBar, admHit, admQ,
            newCenter, locations, patients, editCenter, deleteCenter,
            newDonation, donations, editDonation, deleteDonation,
            newPerson, editPerson, deletePerson,
            newRescatado, rescAdmin, startPromote, editRescatado, deleteRescatado,
            reviewReport,
            listLoc, setListLoc, listDate, setListDate, todayISO, listNote, setListNote,
            onPickList, listBusy, listProgress, listResult,
            reviewVolRequest, volEmail, setVolEmail, volPass, setVolPass, genPass, createVolunteer, volBusy, volunteers, revokeVolunteer,
            draft, setD, setDV, setDraft, geoQuery, setGeoQuery, geoBusy, geocodeAddress, geoResults, pickGeoResult,
            saveCenter, saveDonation, savePerson, saveRescatado, savePromotion, reviewContribution,
            statusOpts, canDelete, editId,
          }}
        >
          <AdminPanel />
        </AdminProvider>
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
        onDonate={() => {
          closeTour();
          setView("donate");
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
