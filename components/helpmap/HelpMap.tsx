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
  type Rescatado,
  type RescatadoPublic,
  type Sexo,
  type VzlaState,
} from "./data";
import { createClient } from "@/utils/supabase/client";
import { enqueue, flushQueue, queueCount, type IntakeSubmission } from "./intakeQueue";
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

type View = null | "detail" | "share" | "report" | "admin" | "donate" | "volunteer" | "contact" | "contribute" | "rescued";

// External donation partners surfaced in the "Donar" panel.
// Volunteer recruiting contact. ⚠️ Fill with the crew's real channel before
// launch. Leave `whatsapp` empty to hide the WhatsApp button (digits only, no +).
const VOLUNTEER = {
  whatsapp: "", // e.g. "584120000000"
  email: "info@helpmapvzla.net",
};

// Official Instagram — the brand/logo links here (main channel in Venezuela).
const INSTAGRAM_HANDLE = "helpmapvzla";
const INSTAGRAM_URL = "https://www.instagram.com/" + INSTAGRAM_HANDLE + "/";

// Profiles we're recruiting — shown as a checklist in the volunteer panel.
const VOLUNTEER_ROLES: { es: string; en: string }[] = [
  { es: "Médicos y médicas", en: "Doctors" },
  { es: "Enfermeros y enfermeras", en: "Nurses" },
  { es: "Personal de salud", en: "Health workers" },
  { es: "Rescatistas y Protección Civil", en: "Rescuers & Civil Protection" },
  { es: "Con acceso a información veraz y de primera mano", en: "With access to truthful, first-hand information" },
];

type AdminTab = "centros" | "personas" | "voluntarios" | "listas" | "donaciones" | "rescatados";
type EditType = null | "center" | "person" | "donation" | "rescatado" | "promote";

const CACHE_KEY = "helpmap:data:v4";
// Bump the version when tour content changes so returning users see it once more.
const TOUR_KEY = "helpmap:tour:v2";

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
  verified?: boolean;
  // donation
  don_name?: string;
  don_desc?: string;
  don_social?: string;
  don_url?: string;
  don_info?: string;
  // rescatado (field rescued report) — admin-only free-text + explicit minor toggle
  is_minor?: boolean;
  contacto?: string;
  rescue_site?: string;
  notas?: string;
}

interface AuthUser {
  email: string | null;
}

export interface HelpMapProps {
  accent?: string;
  mapLabels?: boolean;
  showReport?: boolean;
}

// Structural type shared by patients and rescatados — both carry these fields and the
// same minor-photo rules, so Avatar/initials work for either.
type PersonLike = { nombres: string; apellidos: string; foto_url: string | null; is_minor: boolean };

const initials = (p: PersonLike) =>
  ((p.nombres[0] || "") + (p.apellidos[0] || "")).toUpperCase() || "··";

function Avatar({ p, cls }: { p: PersonLike; cls: string }) {
  // Never render a photo for a minor, even if a foto_url somehow arrives (the
  // data is already stripped by protectMinor; this is the last line of defense).
  if (p.foto_url && !p.is_minor) {
    return (
      <div className={cls}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.foto_url} alt="" loading="lazy" decoding="async" />
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
  chevD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
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
  rescue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9" />
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
  flame: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2s4 3.5 4 8a4 4 0 0 1-8 0c0-1 .3-2 .8-2.7C8 9 8.5 11 10 11c0-3 2-5 2-9Z" />
      <path d="M12 22a6 6 0 0 0 6-6c0-2-1-4-2.5-5.3" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),
  ig: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  ),
  // Hand offering a heart — volunteer / help.
  volunteer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 14.5 8.8 12.4a1.7 1.7 0 0 1 2.4-2.4l1 1 1-1a1.7 1.7 0 0 1 2.4 2.4L13 14.5a1.4 1.4 0 0 1-2 0Z" />
      <path d="M3 13a2 2 0 0 1 2-2h1.5l3 2.6a2 2 0 0 0 1.3.5H15a1.5 1.5 0 0 1 0 3h-3" />
      <path d="M3 13v6h2.5l5.5 1.5 8-2.5a1.7 1.7 0 0 0-1.2-3.1" />
    </svg>
  ),
};

// Map a Nominatim address (or the display label as fallback) to one of our VzlaState
// enum values. Only returns a value when it matches a state we support — otherwise
// null, so we never set an invalid enum on the draft. Handles common variants:
// "Estado/Edo." prefixes, "Vargas" (old name of La Guaira), "Capital District".
const STATE_FROM_LABEL: Array<[VzlaState, string[]]> = [
  ["distrito_capital", ["distrito capital", "capital district", "dtto capital"]],
  ["la_guaira", ["la guaira", "vargas"]],
  ["miranda", ["miranda"]],
  ["yaracuy", ["yaracuy"]],
  ["falcon", ["falcon"]],
  ["carabobo", ["carabobo"]],
  ["aragua", ["aragua"]],
];
function veStateFromAddress(address?: Record<string, string>, label?: string): VzlaState | null {
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
function municipalityFromAddress(address?: Record<string, string>): string | null {
  if (!address) return null;
  const raw = address.municipality || address.county || address.city_district || address.city || "";
  const cleaned = raw.replace(/^(municipio|mcpio\.?|mun\.?)\s+/i, "").trim();
  return cleaned || null;
}

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
  const [rescAdmin, setRescAdmin] = useState<Rescatado[]>([]); // staff-only full base rows for the admin tab
  const [openDon, setOpenDon] = useState<string | null>(null); // foldable donation cards (accordion)
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
  const [volEmail, setVolEmail] = useState("");
  const [volPass, setVolPass] = useState("");
  const [volBusy, setVolBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [listNote, setListNote] = useState("");
  const [listLoc, setListLoc] = useState("");

  // Public "write to us" form (in-app email + image attachments)
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cMsg, setCMsg] = useState("");
  const [cImgs, setCImgs] = useState<string[]>([]);
  const [cBusy, setCBusy] = useState(false);
  const [cDone, setCDone] = useState(false); // shows the "we got your message" confirmation panel
  // Why the user is writing: drives the email subject + form copy. The contact form
  // is only reached from the volunteer / donations CTAs (no generic contact entry).
  const [contactKind, setContactKind] = useState<"volunteer" | "donation">("volunteer");

  // Public "Aportar foto / info" on an existing record (→ contributions moderation
  // queue, NOT the intake funnel — intake is for people not yet in the system).
  const [cbPhoto, setCbPhoto] = useState<string | null>(null); // compressed JPEG (adults only)
  const [cbPhotoBusy, setCbPhotoBusy] = useState(false);
  const [cbDesc, setCbDesc] = useState("");
  const [cbContact, setCbContact] = useState("");
  const [cbBusy, setCbBusy] = useState(false);
  const [cbDone, setCbDone] = useState(false); // shows the "thanks, under review" panel
  // Staff review queue (admin/volunteer)
  const [contribs, setContribs] = useState<
    { id: string; patient_id: string; patient_name: string; foto_url: string | null; descripcion: string | null; contacto: string | null }[]
  >([]);

  // Public intake form + offline queue
  const [rNom, setRNom] = useState("");
  const [rApe, setRApe] = useState("");
  const [rCi, setRCi] = useState("");
  const [rEdad, setREdad] = useState("");
  const [rMinor, setRMinor] = useState(false);
  const [rLoc, setRLoc] = useState("");
  const [rEstatus, setREstatus] = useState<Estatus>("INGRESADO");
  const [rSexo, setRSexo] = useState<"M" | "F" | "">("");
  const [rProcedencia, setRProcedencia] = useState("");
  const [rContact, setRContact] = useState("");
  const [rPhoto, setRPhoto] = useState<string | null>(null); // compressed JPEG data URL (adults only)
  const [rPhotoBusy, setRPhotoBusy] = useState(false);
  const [pending, setPending] = useState(() => (typeof window !== "undefined" ? queueCount() : 0));
  const [tourOpen, setTourOpen] = useState(false);

  const t = T[lang];

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== "undefined" && !localStorage.getItem(TOUR_KEY)) setTourOpen(true);
  }, []);
  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* storage unavailable — non-fatal */
    }
  };

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
        }
      } catch {
        /* ignore */
      }
      try {
        const supabase = getSupabase();
        const [locRes, patRes, donRes, setRes, rescRes] = await Promise.all([
          supabase.from("locations").select("*").eq("active", true),
          // Reads the privacy-filtered VIEW, never the base table (CLAUDE.md §2).
          supabase
            .from("patients_public")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(2000),
          supabase.from("donations").select("*").eq("active", true).order("sort", { ascending: true }),
          // Maintenance flag — non-critical; tolerate the table not existing yet.
          supabase.from("app_settings").select("maintenance").eq("id", 1).maybeSingle(),
          // Rescued (not-yet-transferred) people — privacy-filtered VIEW, non-critical.
          supabase.from("rescatados_public").select("*").order("created_at", { ascending: false }).limit(2000),
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
        const locs = (locRes.data ?? []) as Location[];
        // Defense in depth: enforce minor protection on every record from the
        // view before it touches state or the cache (CLAUDE.md §2).
        const pats = ((patRes.data ?? []) as PatientPublic[]).map(protectMinor);
        setLocations(locs);
        setPatients(pats);
        if (dons) setDonations(dons);
        if (resc) setRescatados(resc);
        setStale(false);
        try {
          const cached = JSON.stringify({ locations: locs, patients: pats, donations: dons ?? donations, rescatados: resc ?? rescatados });
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
        const m = L.marker([l.lat, l.lng], { icon: mkIcon(L, 0, TYPE_META[l.type].color, false, false) }).addTo(map);
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
      // Pin color reflects the location TYPE (hospital/shelter/morgue/acopio), not the
      // worst patient status — so the count badge reads as data, not as a death toll.
      const color = TYPE_META[l.type].color;
      m.setIcon(mkIcon(L, vis.length, color, active, dim));
      m.setZIndexOffset(active ? 1000 : dim ? -100 : 0);
    });
  }, [mapReady, locations, patients, tsMatch, locationSel, focusId]);

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
  const openContribute = () => {
    setCbPhoto(null);
    setCbDesc("");
    setCbContact("");
    setCbDone(false);
    setView("contribute");
  };
  const onPickContribPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (selP?.is_minor) return; // never a photo for a minor (CLAUDE.md §2)
    setCbPhotoBusy(true);
    try {
      setCbPhoto(await compressImage(file));
    } catch {
      showToast(t.photoError);
    } finally {
      setCbPhotoBusy(false);
    }
  };
  const submitContribution = async () => {
    if (!selP) return;
    const desc = cbDesc.trim();
    const photo = selP.is_minor ? null : cbPhoto; // defensive: minors never carry a photo
    if (!photo && !desc) {
      showToast(t.contribReq);
      return;
    }
    setCbBusy(true);
    try {
      let foto_url: string | null = null;
      if (photo) {
        const { uploadIntakePhoto } = await import("./uploadPhoto");
        foto_url = await uploadIntakePhoto(photo);
      }
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: selP.id, foto_url, descripcion: desc || null, contacto: cbContact.trim() || null }),
      });
      if (res.ok) {
        setCbDone(true);
      } else {
        showToast(t.saveError);
      }
    } catch {
      showToast(t.saveError);
    } finally {
      setCbBusy(false);
    }
  };
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
        showToast(t.saveError);
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
    setRSexo("");
    setRProcedencia("");
    setRContact("");
    setRPhoto(null);
    setRPhotoBusy(false);
  };

  // Compress the picked image in-browser. Refuses for minors (no photo ever,
  // CLAUDE.md §2/§5) — defensive even though the field is hidden for minors.
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (rMinor) return;
    setRPhotoBusy(true);
    try {
      setRPhoto(await compressImage(file));
    } catch {
      showToast(t.photoError);
    } finally {
      setRPhotoBusy(false);
    }
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
      sexo: rSexo || null,
      location_id: rLoc,
      location_name: loc?.canonical_name ?? "",
      estatus: rEstatus,
      procedencia: rProcedencia.trim() || null,
      contacto: rContact.trim() || null,
      lang,
      source: "web",
      // Adults only — never attach a photo for a minor (CLAUDE.md §2/§5).
      // foto_b64 is the local image; the upload turns it into foto_url (a URL).
      foto_b64: isMinor ? null : rPhoto,
      foto_url: null,
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
    setGeoQuery("");
    setGeoResults([]);
  };

  // Clear the in-panel search when switching tabs (but keep it across edit/cancel
  // within a tab, so staff can keep iterating over the same filtered list).
  useEffect(() => {
    setAdmQ("");
  }, [adminTab]);

  const editCenter = (l: Location) => {
    setEditType("center");
    setEditId(l.location_id);
    setGeoQuery("");
    setGeoResults([]);
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
    setGeoQuery("");
    setGeoResults([]);
    setDraft({ canonical_name: "", type: "hospital", state: "distrito_capital", municipality: "", lat: "", lng: "" });
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
      // The publish gate (§8). UI-gated to admins (the toggle is hidden for volunteers),
      // so a volunteer save preserves whatever value was loaded into the draft.
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

  // ---- List photo upload (staff): forward to n8n via /api/lists ----------
  const onPickList = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setListBusy(true);
    try {
      const b64 = await compressImage(file, LIST_OPTS); // higher-res for OCR legibility
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_b64: b64,
          filename: file.name,
          note: listNote.trim() || null,
          location_id: listLoc || null,
        }),
      });
      if (res.ok) {
        showToast(t.listSent);
        setListNote("");
      } else {
        showToast(t.listError);
      }
    } catch {
      showToast(t.listError);
    } finally {
      setListBusy(false);
    }
  };

  // ---- Volunteer / donation email (in-app, via nodemailer) ---------------
  const openContact = (kind: "volunteer" | "donation") => {
    setContactKind(kind);
    setCDone(false);
    setView("contact");
  };
  const onPickContactPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || cImgs.length >= 4) return;
    try {
      const b64 = await compressImage(file);
      setCImgs((a) => (a.length >= 4 ? a : [...a, b64]));
    } catch {
      showToast(t.photoError);
    }
  };
  const sendContact = async () => {
    if (!cMsg.trim()) {
      showToast(t.contactError);
      return;
    }
    setCBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: contactKind, name: cName.trim(), email: cEmail.trim(), message: cMsg.trim(), images: cImgs }),
      });
      if (res.ok) {
        // Show an in-form confirmation panel (more reassuring than a quick toast):
        // it mirrors the auto-acknowledgment email the user also receives.
        setCName("");
        setCEmail("");
        setCMsg("");
        setCImgs([]);
        setCDone(true);
      } else {
        showToast(t.contactError);
      }
    } catch {
      showToast(t.contactError);
    } finally {
      setCBusy(false);
    }
  };

  // ---- Derived view bits -------------------------------------------------
  const centerFilterOpts = locations.filter((l) => stateF === "all" || l.state === stateF);
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
                className="gear"
                onClick={() => {
                  setView("admin");
                  setAdminTab("centros"); // staff (admin + volunteer) can now manage centers
                  clearEdit();
                  loadContributions(); // pending aportes drive the count badges + in-card review
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
            <button className="gear" onClick={() => openContact("volunteer")} aria-label={t.contact}>
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
                { label: t.f_status, value: SM[selP.estatus][lang], mono: "" },
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
              <button className="btng" onClick={openContribute}>
                {ICON.plus}
                {t.contribCta}
              </button>
              <button className="btng" onClick={seeOnMap}>
                {ICON.pin}
                {t.seeMap}
              </button>
              <a
                className="btng"
                href={mapsDirectionsUrl(selP.lat, selP.lng)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ICON.pin}
                {t.directions}
              </a>
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

      {/* ---- Contribute overlay (public → contributions moderation queue) ---- */}
      {view === "contribute" && selP && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView("detail")}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.contribTitle}</span>
          </div>
          <div className="ovbody">
            {cbDone ? (
              <div className="contact-ack">
                <div className="contact-ack-ico">{ICON.check}</div>
                <h3 className="contact-ack-title">{t.contribAckTitle}</h3>
                <p className="contact-ack-body">{t.contribAckBody}</p>
                <button className="btnp" onClick={() => setView("detail")}>
                  {t.contribAckClose}
                </button>
              </div>
            ) : (
              <div className="form">
                <div className="fld">
                  <span className="flabel">{t.contribFor}</span>
                  <div className="aname">{selP.nombres + " " + selP.apellidos}</div>
                  <span className="asub">{selP.location_name}</span>
                </div>
                <p className="donate-sub">{t.contribSub}</p>
                <div className="fld">
                  <span className="flabel">{t.contribDescLabel}</span>
                  <textarea
                    className="finput"
                    rows={4}
                    value={cbDesc}
                    onChange={(e) => setCbDesc(e.target.value)}
                    placeholder={t.contribDescPh}
                  />
                </div>
                {selP.is_minor ? (
                  <div className="note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                    </svg>
                    {t.contribMinorNote}
                  </div>
                ) : (
                  <div className="fld">
                    <span className="flabel">{t.contribPhoto}</span>
                    {cbPhoto ? (
                      <div className="upload upload-has">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cbPhoto} alt="" className="upload-thumb" />
                        <button type="button" className="upload-remove" onClick={() => setCbPhoto(null)}>
                          {t.removePhoto}
                        </button>
                      </div>
                    ) : (
                      <label className="upload">
                        <input type="file" accept="image/*" onChange={onPickContribPhoto} style={{ display: "none" }} disabled={cbPhotoBusy} />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 16V4M8 8l4-4 4 4" />
                          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                        </svg>
                        {cbPhotoBusy ? t.photoBusy : t.f_photoHint}
                      </label>
                    )}
                  </div>
                )}
                <div className="fld">
                  <span className="flabel">{t.contribContact}</span>
                  <input className="finput" value={cbContact} onChange={(e) => setCbContact(e.target.value)} placeholder="+58… / correo" />
                </div>
                <div className="note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8h.01" />
                  </svg>
                  {t.contribNote}
                </div>
                <button className="btnp" onClick={submitContribution} disabled={cbBusy}>
                  {cbBusy ? t.contribSending : t.contribSend}
                </button>
              </div>
            )}
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
                    {selP.foto_url && !selP.is_minor ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selP.foto_url} alt="" loading="lazy" decoding="async" />
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
                    <span className="ogurl">{"helpmapvzla.net/p/" + selP.id.slice(0, 8) + "…"}</span>
                  </div>
                </div>
                <span className="blink">{"helpmapvzla.net/p/" + selP.id.slice(0, 8) + "…"}</span>
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
            <p className="share-disc">{ICON.check}{t.shareDisclosure}</p>
          </div>
        </div>
      )}

      {/* ---- Donate overlay (external partners; opens in a new tab) ---- */}
      {view === "donate" && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView(null)}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.donateTitle}</span>
          </div>
          <div className="ovbody">
            <p className="donate-sub">{t.donateSub}</p>
            <div className="donate-list">
              {donations.map((d) => {
                const open = openDon === d.id;
                const hasBody = !!(d.donate_info || d.social_url || d.donate_url);
                return (
                  <div key={d.id} className={"donate-card" + (open ? " open" : "")}>
                    <button
                      type="button"
                      className="donate-toggle"
                      onClick={() => hasBody && setOpenDon(open ? null : d.id)}
                      aria-expanded={open}
                      disabled={!hasBody}
                    >
                      <div className="donate-info">
                        <span className="donate-name">{d.name}</span>
                        {d.description && <span className="donate-desc">{d.description}</span>}
                      </div>
                      {hasBody && <span className="donate-chev">{ICON.chevD}</span>}
                    </button>
                    {open && hasBody && (
                      <div className="donate-body">
                        {d.donate_info && (
                          <div className="donate-data">
                            <span className="donate-data-label">{t.donData}</span>
                            <span className="donate-data-txt">{d.donate_info}</span>
                            <button
                              type="button"
                              className="donate-copy"
                              onClick={async () => {
                                if (await copyText(d.donate_info!)) showToast(t.copied);
                              }}
                            >
                              {ICON.copy}
                              {t.donCopy}
                            </button>
                          </div>
                        )}
                        {(d.social_url || d.donate_url) && (
                          <div className="donate-acts">
                            {d.social_url && (
                              <a
                                className="donate-ig"
                                href={d.social_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t.donFollow}
                              >
                                {ICON.ig}
                                {t.donFollow}
                              </a>
                            )}
                            {d.donate_url && (
                              <a className="donate-go" href={d.donate_url} target="_blank" rel="noopener noreferrer">
                                {t.donateCta}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {donations.length === 0 && <p className="donate-desc">{t.donNone}</p>}
            </div>
            <div className="donate-join">
              <span className="donate-join-t">{t.donateJoin}</span>
              <span className="donate-desc">{t.donateJoinSub}</span>
              <div className="dactions" style={{ marginTop: 11 }}>
                {VOLUNTEER.whatsapp && (
                  <a
                    className="btng"
                    href={`https://wa.me/${VOLUNTEER.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(t.donateJoin)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ICON.wa}
                    {t.whatsapp}
                  </a>
                )}
                <button className="btnp" onClick={() => openContact("donation")}>
                  {ICON.mail}
                  {t.donateJoinCta}
                </button>
              </div>
            </div>
            <p className="donate-note">{t.donateNote}</p>
          </div>
        </div>
      )}

      {/* ---- Volunteer overlay (recruit health/rescue staff with real info) ---- */}
      {view === "volunteer" && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView(null)}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.volunteerTitle}</span>
          </div>
          <div className="ovbody">
            <p className="donate-sub">{t.volunteerSub}</p>
            <div className="vol-roles">
              {VOLUNTEER_ROLES.map((r) => (
                <div className="vol-role" key={r.es}>
                  <span className="vol-check">{ICON.check}</span>
                  <span>{r[lang]}</span>
                </div>
              ))}
            </div>
            <p className="vol-ask">{t.volunteerAsk}</p>
            <div className="dactions">
              {VOLUNTEER.whatsapp && (
                <a
                  className="btng"
                  href={`https://wa.me/${VOLUNTEER.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(t.volunteerWaMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ICON.wa}
                  {t.volunteerWa}
                </a>
              )}
              <button className="btnp" onClick={() => openContact("volunteer")}>
                {ICON.mail}
                {t.volunteerEmail}
              </button>
            </div>
            <p className="donate-note">{t.volunteerNote}</p>
          </div>
        </div>
      )}

      {/* ---- Contact overlay (public; sends an in-app email + image attachments) ---- */}
      {view === "contact" && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView(null)}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.contactTitle}</span>
          </div>
          <div className="ovbody">
            {cDone ? (
              <div className="contact-ack">
                <div className="contact-ack-ico">{ICON.check}</div>
                <h3 className="contact-ack-title">{t.contactAckTitle}</h3>
                <p className="contact-ack-body">{t.contactAckBody}</p>
                <button className="btnp" onClick={() => setView(null)}>
                  {t.contactAckClose}
                </button>
              </div>
            ) : (
            <div className="form">
              <p className="donate-sub">{t.contactSub}</p>
              <div className="fld">
                <span className="flabel">{t.contactName}</span>
                <input className="finput" value={cName} onChange={(e) => setCName(e.target.value)} placeholder={t.contactName} />
              </div>
              <div className="fld">
                <span className="flabel">{t.contactEmailLabel}</span>
                <input className="finput" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
              </div>
              <div className="fld">
                <span className="flabel">{t.contactMsg}</span>
                <textarea className="finput" rows={5} value={cMsg} onChange={(e) => setCMsg(e.target.value)} placeholder={t.contactMsg} />
              </div>
              <div className="fld">
                <span className="flabel">{t.contactPhotos}</span>
                {cImgs.length > 0 && (
                  <div className="cimg-grid">
                    {cImgs.map((src, i) => (
                      <div className="cimg" key={i}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" />
                        <button type="button" className="cimg-x" onClick={() => setCImgs((a) => a.filter((_, n) => n !== i))}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {cImgs.length < 4 && (
                  <label className="upload">
                    <input type="file" accept="image/*" onChange={onPickContactPhoto} style={{ display: "none" }} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 16V4M8 8l4-4 4 4" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                    </svg>
                    {t.contactAddPhoto}
                  </label>
                )}
              </div>
              <button className="btnp" onClick={sendContact} disabled={cBusy}>
                {ICON.mail}
                {cBusy ? t.contactSending : t.contactSend}
              </button>
            </div>
            )}
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
              <div className="infoneed">
                <span className="infoneed-t">{t.infoNeededTitle}</span>
                <span className="infoneed-d">{t.infoNeeded}</span>
              </div>
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
                  <button
                    className={"segb " + (rMinor ? "segb-on" : "")}
                    onClick={() => {
                      setRMinor(true);
                      setRPhoto(null); // minors never carry a photo
                    }}
                  >
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
                <span className="flabel">{t.sexo}</span>
                <div className="seg">
                  <button className={"segb " + (rSexo === "M" ? "segb-on" : "")} onClick={() => setRSexo(rSexo === "M" ? "" : "M")}>
                    {t.male}
                  </button>
                  <button className={"segb " + (rSexo === "F" ? "segb-on" : "")} onClick={() => setRSexo(rSexo === "F" ? "" : "F")}>
                    {t.female}
                  </button>
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
                <span className="flabel">{t.f_procedencia}</span>
                <input className="finput" placeholder={t.f_procedenciaPh} value={rProcedencia} onChange={(e) => setRProcedencia(e.target.value)} />
                <span className="fhint">{t.f_procedenciaHint}</span>
              </div>
              <div className="fld">
                <span className="flabel">{t.f_contact}</span>
                <input className="finput" placeholder="+58…" value={rContact} onChange={(e) => setRContact(e.target.value)} />
              </div>
              {!rMinor && (
                <div className="fld">
                  <span className="flabel">{t.f_photo}</span>
                  {rPhoto ? (
                    <div className="upload upload-has">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rPhoto} alt="" className="upload-thumb" />
                      <button type="button" className="upload-remove" onClick={() => setRPhoto(null)}>
                        {t.removePhoto}
                      </button>
                    </div>
                  ) : (
                    <label className="upload">
                      <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: "none" }} disabled={rPhotoBusy} />
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16V4M8 8l4-4 4 4" />
                        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                      </svg>
                      {rPhotoBusy ? t.photoBusy : t.f_photoHint}
                    </label>
                  )}
                </div>
              )}
              <div className="note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
                {t.note}
              </div>
              <div className="note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                </svg>
                {t.noteMinors}
              </div>
              <button className="btnp" onClick={submitReport}>
                {t.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Rescued people (public list) — field info network, no map pins ---- */}
      {view === "rescued" && (
        <div className="overlay">
          <div className="ovhead">
            <button className="oicon" onClick={() => setView(null)}>
              {ICON.back}
            </button>
            <span className="ohtitle">{t.rescuedListTitle}</span>
          </div>
          <div className="ovbody">
            <div className="note" style={{ marginBottom: 14 }}>
              <span className="resc-ic">{ICON.rescue}</span>
              {t.rescuedListSub}
            </div>
            {rescatados.length === 0 && <div className="empty">{t.rescuedNone}</div>}
            {rescatados.map((r) => (
              <div className={"card st-resc"} key={r.id}>
                <Avatar p={r} cls="av" />
                <div className="cmid">
                  <span className="cname">
                    {(r.nombres + " " + r.apellidos).trim() || "—"}
                    {r.verified && <span className="vchk"> {ICON.check}</span>}
                  </span>
                  <span className="cmeta">
                    {[
                      r.edad != null ? r.edad + " " + t.yrs : null,
                      r.sexo === "M" ? t.male : r.sexo === "F" ? t.female : null,
                      !r.is_minor && r.ci_display && r.ci_display !== "—" ? r.ci_display : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="cend">
                  <span className="badge resc-badge">
                    <span className="dot"></span>
                    {t.rescuedStatus}
                  </span>
                </div>
              </div>
            ))}
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
                  <button
                    className={"atab " + (adminTab === "listas" ? "atab-on" : "")}
                    onClick={() => {
                      setAdminTab("listas");
                      clearEdit();
                    }}
                  >
                    {t.tabLists}
                  </button>
                  <button
                    className={"atab " + (adminTab === "rescatados" ? "atab-on" : "")}
                    onClick={() => {
                      setAdminTab("rescatados");
                      clearEdit();
                      loadRescAdmin();
                    }}
                  >
                    {t.tabRescued}
                  </button>
                  <button
                    className={"atab " + (adminTab === "donaciones" ? "atab-on" : "")}
                    onClick={() => {
                      setAdminTab("donaciones");
                      clearEdit();
                    }}
                  >
                    {t.tabDonations}
                  </button>
                  {isAdmin && (
                    <button
                      className={"atab " + (adminTab === "voluntarios" ? "atab-on" : "")}
                      onClick={() => {
                        setAdminTab("voluntarios");
                        clearEdit();
                        loadVolunteers();
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
                      <span className="flabel">{t.listNote}</span>
                      <input className="finput" value={listNote} onChange={(e) => setListNote(e.target.value)} placeholder={t.listNote} />
                    </div>
                    <label className="upload">
                      <input type="file" accept="image/*" capture="environment" onChange={onPickList} style={{ display: "none" }} disabled={listBusy} />
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16V4M8 8l4-4 4 4" />
                        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                      </svg>
                      {listBusy ? t.listSending : t.listPick}
                    </label>
                  </div>
                )}

                {adminTab === "voluntarios" && isAdmin && !editType && (
                  <div className="form">
                    <div className="fld">
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
                    {/* Verified is the publish gate (§8): a photo only shows publicly once
                        the record is verified. Admin-only — volunteers' edits are reviewed. */}
                    {isAdmin && (
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
                    {isAdmin && (
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

      <Tour open={tourOpen} lang={lang} onClose={closeTour} />
    </div>
  );
}
