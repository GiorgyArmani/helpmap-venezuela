"use client";

import { useState } from "react";
import type { Lang } from "./data";

// First-run app tour: explains how to use HelpMap and — importantly — the steps a
// submission goes through before it is accepted/published (CLAUDE.md §7/§8).
// Reopenable any time from the header "?" button.

type Slide = {
  eyebrow: { es: string; en: string };
  title: { es: string; en: string };
  body: { es: string; en: string };
  steps?: { t: { es: string; en: string }; d: { es: string; en: string } }[];
  // Optional: only shown when it mirrors a real in-app icon the user taps (map pin,
  // search, share, report +, volunteer). Purely decorative slides omit it.
  icon?: React.ReactNode;
  // When set, the slide shows a prominent CTA button (e.g. the volunteer signup).
  // Reinforces the "tap the icon above" copy with a direct one-tap action.
  cta?: "volunteer";
};

const I = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  ),
  // Matches the in-app map marker (ICON.pin) — "explora el mapa" = tap the pins.
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  // Matches the in-app "Reportar" FAB (ICON.plus).
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M8 8l4-4 4 4" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  hands: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 14.5 8.8 12.4a1.7 1.7 0 0 1 2.4-2.4l1 1 1-1a1.7 1.7 0 0 1 2.4 2.4L13 14.5a1.4 1.4 0 0 1-2 0Z" />
      <path d="M3 13a2 2 0 0 1 2-2h1.5l3 2.6a2 2 0 0 0 1.3.5H15a1.5 1.5 0 0 1 0 3h-3" />
      <path d="M3 13v6h2.5l5.5 1.5 8-2.5a1.7 1.7 0 0 0-1.2-3.1" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </svg>
  ),
};

const SLIDES: Slide[] = [
  {
    eyebrow: { es: "Bienvenido", en: "Welcome" },
    title: { es: "Encuentra a tus seres queridos", en: "Find your loved ones" },
    body: {
      es: "Base de datos verificada de personas afectadas por los terremotos del 24 de Junio 2026, en constante actualización por personal médico en campo. Te ayuda a ubicar a tus familiares.",
      en: "A verified database of people affected by the earthquakes in Caracas, La Guaira and Miranda, continuously updated by medical staff in the field. It helps you locate your family.",
    },
  },
  {
    eyebrow: { es: "Paso 1", en: "Step 1" },
    title: { es: "Explora el mapa", en: "Explore the map" },
    body: {
      es: "Toca un punto en el mapa o filtra por estado y centro. Verás quién está reportado en cada lugar.",
      en: "Tap a point on the map or filter by state and center. You'll see who is reported at each place.",
    },
    icon: I.pin,
  },
  {
    eyebrow: { es: "Paso 2", en: "Step 2" },
    title: { es: "Busca por nombre o cédula", en: "Search by name or ID" },
    body: {
      es: "Usa el buscador para encontrar a una persona por nombre, apellido o cédula. Filtra por estatus: ingresado, de alta o fallecido.",
      en: "Use the search to find a person by first name, surname or ID. Filter by status: admitted, discharged or deceased.",
    },
    icon: I.search,
  },
  {
    eyebrow: { es: "Importante", en: "Important" },
    title: { es: "Cómo leer los datos", en: "How to read the data" },
    body: {
      es: "Cada ficha muestra su fecha de última actualización. En una emergencia hay múltiples traslados: esta lista no garantiza que la persona siga en ese centro, pero sí la veracidad y la fecha del dato publicado. La información se actualiza a medida que llegan nuevos aportes. Úsala como herramienta de búsqueda, consulta y colaboración ciudadana.",
      en: "Each record shows its last-updated date. In an emergency there are multiple transfers: this list does not guarantee the person is still at that center, but it does guarantee the veracity and date of the published data. Information is updated as new contributions arrive. Use it as a tool for searching, consultation and citizen collaboration.",
    },
    icon: I.info,
  },
  {
    eyebrow: { es: "Paso 3", en: "Step 3" },
    title: { es: "Comparte para ayudar", en: "Share to help" },
    body: {
      es: "Comparte una ficha por WhatsApp, Telegram o como historia de Instagram. Mientras más se comparte, más rápido se reúnen las familias.",
      en: "Share a record via WhatsApp, Telegram or as an Instagram story. The more it's shared, the faster families reunite.",
    },
    icon: I.share,
  },
  {
    eyebrow: { es: "Subir información", en: "Upload information" },
    title: { es: "Tu envío pasa por revisión", en: "Your submission is reviewed" },
    body: {
      es: "Si tienes datos de alguien, toca «Subir info». Tu envío NO se publica de inmediato. Sigue estos pasos antes de aparecer en el mapa:",
      en: "If you have details about someone, tap “Upload info”. Your submission is NOT published right away. It follows these steps before appearing on the map:",
    },
    icon: I.plus,
    steps: [
      {
        t: { es: "Recibido", en: "Received" },
        d: { es: "Tu envío entra a la cola del equipo.", en: "Your submission enters the team's queue." },
      },
      {
        t: { es: "Limpieza", en: "Cleanup" },
        d: {
          es: "Se normaliza y se cruza con otros reportes para evitar duplicados.",
          en: "It's normalized and cross-checked against other reports to avoid duplicates.",
        },
      },
      {
        t: { es: "Verificación", en: "Verification" },
        d: {
          es: "El equipo y contactos médicos lo confirman.",
          en: "The team and medical contacts confirm it.",
        },
      },
      {
        t: { es: "Publicado", en: "Published" },
        d: {
          es: "Solo entonces aparece en el mapa, con su sello verde «Verificado». Las fotos de menores nunca se muestran.",
          en: "Only then does it appear on the map, with its green “Verified” badge. Photos of minors are never shown.",
        },
      },
    ],
  },
  {
    eyebrow: { es: "Nuestro compromiso", en: "Our commitment" },
    title: { es: "Sin fines de lucro y con cuidado", en: "Non-profit and handled with care" },
    body: {
      es: "Somos una iniciativa ciudadana sin fines de lucro. Esta información existe solo para reunir familias. Así protegemos los datos:",
      en: "We are a volunteer initiative. This information exists only to reunite families. This is how we protect the data:",
    },
    steps: [
      {
        t: { es: "No lucramos", en: "No profit" },
        d: {
          es: "No cobramos, no mostramos publicidad y no obtenemos beneficio de estos datos.",
          en: "We don't charge, show ads, or profit from this data.",
        },
      },
      {
        t: { es: "No vendemos tus datos", en: "We don't sell your data" },
        d: {
          es: "La información nunca se vende ni se comparte con terceros con fines comerciales.",
          en: "The information is never sold or shared with third parties for commercial purposes.",
        },
      },
      {
        t: { es: "Verificado por profesionales", en: "Verified by professionals" },
        d: {
          es: "Cada registro es confirmado por personal médico y contactos de confianza antes de publicarse.",
          en: "Each record is confirmed by medical staff and trusted contacts before being published.",
        },
      },
      {
        t: { es: "Protección de niños, niñas y adolescentes", en: "Protection of children and adolescents" },
        d: {
          es: "Nunca mostramos la cédula ni la foto de un menor, y limitamos sus datos al mínimo.",
          en: "We never show a minor's ID or photo, and we keep their data to a minimum.",
        },
      },
    ],
  },
  {
    eyebrow: { es: "Súmate", en: "Join us" },
    title: { es: "¿Eres personal de salud o rescate?", en: "Are you health or rescue staff?" },
    body: {
      es: "Esto es un esfuerzo ciudadano: mientras más datos confirmemos, más rápido llenamos el mapa. Si eres médico, enfermero, personal de salud o rescatista, súmate con tu perfil y tus fuentes para darte acceso.",
      en: "This is a citizen effort: the more data we confirm, the faster we fill the map. If you are a doctor, nurse, health worker or rescuer, join us with your profile and sources so we can grant you access.",
    },
    icon: I.hands,
    cta: "volunteer",
  },
];

// Staff onboarding — shown to volunteers/admins on sign-in so they "get up to date"
// (reshow after updates by bumping STAFF_TOUR_KEY in HelpMap). Reflects the live-publish
// trust model: staff changes go public immediately; access is revocable.
const STAFF_SLIDES: Slide[] = [
  {
    eyebrow: { es: "Eres parte del equipo", en: "You're on the team" },
    title: { es: "Bienvenido, voluntario", en: "Welcome, volunteer" },
    body: {
      es: "Gracias por ayudar a reunir familias. Tienes acceso de confianza: lo que publiques se refleja de inmediato. Úsalo con responsabilidad; podemos revocar el acceso en cualquier momento.",
      en: "Thank you for helping reunite families. You have trusted access: what you publish reflects immediately. Use it responsibly; access can be revoked at any time.",
    },
    icon: I.hands,
  },
  {
    eyebrow: { es: "Tu panel", en: "Your panel" },
    title: { es: "Abre el panel del equipo", en: "Open the team panel" },
    body: {
      es: "Toca el ícono de menú (≡) arriba a la derecha. Tendrás pestañas: Centros, Personas, Listas, Donaciones y Rescatados.",
      en: "Tap the menu icon (≡) at the top right. You'll get tabs: Centers, People, Lists, Donations and Rescued.",
    },
    icon: I.map,
  },
  {
    eyebrow: { es: "Personas", en: "People" },
    title: { es: "Agrega, edita y verifica", en: "Add, edit and verify" },
    body: {
      es: "En «Personas» agregas o editas registros. El interruptor «Verificado» publica la foto y el estatus (incluido fallecido). Sin verificar, el registro aparece pero sin foto.",
      en: "In “People” you add or edit records. The “Verified” switch publishes the photo and status (including deceased). Unverified, a record still appears but without a photo.",
    },
    icon: I.shield,
    steps: [
      {
        t: { es: "Verificado = público", en: "Verified = public" },
        d: { es: "Solo marca verificado lo que confirmaste en campo.", en: "Only mark verified what you confirmed in the field." },
      },
      {
        t: { es: "Menores protegidos", en: "Minors protected" },
        d: { es: "Nunca se muestra foto ni cédula de un menor.", en: "A minor's photo and ID are never shown." },
      },
    ],
  },
  {
    eyebrow: { es: "Aportes del público", en: "Public contributions" },
    title: { es: "Pon caras a los registros", en: "Put faces to records" },
    body: {
      es: "La gente puede enviar fotos/datos de una persona. Aparecen DENTRO de la ficha de esa persona (con un contador ámbar en la lista). Ábrela y aprueba o rechaza cada aporte.",
      en: "People can submit photos/info for a person. They appear INSIDE that person's card (with an amber counter in the list). Open it and approve or reject each contribution.",
    },
    icon: I.share,
  },
  {
    eyebrow: { es: "Rescatados", en: "Rescued" },
    title: { es: "Reporta rescatados con vida", en: "Report people rescued alive" },
    body: {
      es: "En «Rescatados» publicas a alguien sacado con vida aunque aún no sepas a qué centro fue. Cuando lo trasladen, promuévelo a paciente y aparecerá en el mapa.",
      en: "In “Rescued” you publish someone pulled out alive even before you know which center they went to. When transferred, promote them to a patient and they appear on the map.",
    },
    icon: I.heart,
  },
  {
    eyebrow: { es: "Subir listas", en: "Upload lists" },
    title: { es: "Fotografía listas manuscritas", en: "Photograph handwritten lists" },
    body: {
      es: "¿Tienes una lista de pacientes en papel? Foto en «Listas» → el equipo la procesa (OCR) y entra al flujo. Borrar registros y centros queda solo para administradores.",
      en: "Got a paper patient list? Photo it in “Lists” → the team processes it (OCR) into the flow. Deleting records and centers is admin-only.",
    },
    icon: I.upload,
  },
];

export default function Tour({
  open,
  lang,
  onClose,
  onLogin,
  onVolunteer,
  variant = "public",
}: {
  open: boolean;
  lang: Lang;
  onClose: () => void;
  // Staff login entry, shown under the docs link. Omitted when already signed in.
  onLogin?: () => void;
  // Opens the volunteer signup panel. Powers the CTA button on the "Súmate" slide.
  onVolunteer?: () => void;
  // "public" = first-run visitor tour; "staff" = volunteer/admin onboarding on sign-in.
  variant?: "public" | "staff";
}) {
  const [i, setI] = useState(0);
  if (!open) return null;

  const slides = variant === "staff" ? STAFF_SLIDES : SLIDES;
  const s = slides[i];
  const last = i === slides.length - 1;
  const L = (o: { es: string; en: string }) => o[lang];

  const next = () => (last ? onClose() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  return (
    <div className="tourwrap" onClick={onClose}>
      <div className="tour" onClick={(e) => e.stopPropagation()}>
        {s.icon && <div className="tour-icon">{s.icon}</div>}
        <div>
          <div className="tour-eyebrow">{L(s.eyebrow)}</div>
          <h2 className="tour-title">{L(s.title)}</h2>
        </div>
        <p className="tour-body">{L(s.body)}</p>

        {s.steps && (
          <div className="tour-steps">
            {s.steps.map((st, n) => (
              <div className="tour-step" key={n}>
                <span className="tour-num">{n + 1}</span>
                <div>
                  <div className="tour-step-t">{L(st.t)}</div>
                  <div className="tour-step-d">{L(st.d)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {s.cta === "volunteer" && onVolunteer && (
          <button className="tour-cta" onClick={onVolunteer}>
            {I.hands}
            {lang === "es" ? "Quiero ayudar" : "I want to help"}
          </button>
        )}

        <div className="tour-dots">
          {slides.map((_, n) => (
            <span key={n} className={"tour-dot " + (n === i ? "tour-dot-on" : "")} />
          ))}
        </div>

        <div className="tour-actions">
          {i > 0 ? (
            <button className="tour-back" onClick={back}>
              {lang === "es" ? "Atrás" : "Back"}
            </button>
          ) : (
            <button className="tour-skip" onClick={onClose}>
              {lang === "es" ? "Saltar" : "Skip"}
            </button>
          )}
          <button className="tour-next" onClick={next}>
            {last ? (lang === "es" ? "Entendido" : "Got it") : lang === "es" ? "Siguiente" : "Next"}
          </button>
        </div>

        {onLogin && (
          <button className="tour-loginlink" onClick={onLogin}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {lang === "es" ? "Ingresar (equipo)" : "Sign in (team)"}
          </button>
        )}
      </div>
    </div>
  );
}
