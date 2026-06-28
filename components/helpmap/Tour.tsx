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
  icon: React.ReactNode;
  steps?: { t: { es: string; en: string }; d: { es: string; en: string } }[];
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
};

const SLIDES: Slide[] = [
  {
    eyebrow: { es: "Bienvenido", en: "Welcome" },
    title: { es: "Encuentra a tus seres queridos", en: "Find your loved ones" },
    body: {
      es: "Base de datos verificada de personas afectadas por los terremotos del 24 de Junio 2026, en constante actualización por personal médico en campo. Te ayuda a ubicar a tus familiares.",
      en: "A verified database of people affected by the earthquakes in Caracas, La Guaira and Miranda, continuously updated by medical staff in the field. It helps you locate your family.",
    },
    icon: I.heart,
  },
  {
    eyebrow: { es: "Paso 1", en: "Step 1" },
    title: { es: "Explorá el mapa", en: "Explore the map" },
    body: {
      es: "Toca un punto en el mapa o filtra por estado y centro. Verás quién está reportado en cada lugar.",
      en: "Tap a point on the map or filter by state and center. You'll see who is reported at each place.",
    },
    icon: I.map,
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
    icon: I.upload,
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
          es: "Recién ahí aparece en el mapa, con su sello verde «Verificado». Las fotos de menores nunca se muestran.",
          en: "Only then does it appear on the map, with its green “Verified” badge. Photos of minors are never shown.",
        },
      },
    ],
  },
  {
    eyebrow: { es: "Nuestro compromiso", en: "Our commitment" },
    title: { es: "Sin fines de lucro y con cuidado", en: "Non-profit and handled with care" },
    body: {
      es: "Somos una iniciativa voluntaria. Esta información existe solo para reunir familias. Así protegemos los datos:",
      en: "We are a volunteer initiative. This information exists only to reunite families. This is how we protect the data:",
    },
    icon: I.shield,
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
      es: "Si eres médico, enfermero, personal de salud o rescatista y tienes acceso a información veraz, contáctanos: te explicamos cómo colaborar. Toca el ícono de voluntariado arriba.",
      en: "If you are a doctor, nurse, health worker or rescuer with access to truthful information, contact us — we'll explain how to collaborate. Tap the volunteer icon at the top.",
    },
    icon: I.hands,
  },
];

export default function Tour({ open, lang, onClose }: { open: boolean; lang: Lang; onClose: () => void }) {
  const [i, setI] = useState(0);
  if (!open) return null;

  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const L = (o: { es: string; en: string }) => o[lang];

  const next = () => (last ? onClose() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  return (
    <div className="tourwrap" onClick={onClose}>
      <div className="tour" onClick={(e) => e.stopPropagation()}>
        <div className="tour-icon">{s.icon}</div>
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

        <div className="tour-dots">
          {SLIDES.map((_, n) => (
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
      </div>
    </div>
  );
}
