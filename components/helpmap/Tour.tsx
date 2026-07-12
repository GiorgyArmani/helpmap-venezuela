"use client";

import { useState } from "react";
import type { Lang } from "./data";

// First-run app tour: explains how to use HelpMap and — importantly — the steps a
// submission goes through before it is accepted/published (CLAUDE.md §7/§8).
// Reopenable any time from the header "?" button.

type Slide = {
  eyebrow: { es: string; en: string; pt: string };
  title: { es: string; en: string; pt: string };
  body: { es: string; en: string; pt: string };
  steps?: { t: { es: string; en: string; pt: string }; d: { es: string; en: string; pt: string } }[];
  // Optional: only shown when it mirrors a real in-app icon the user taps (map pin,
  // search, share, report +, volunteer). Purely decorative slides omit it.
  icon?: React.ReactNode;
  // When set, the slide shows a prominent CTA button (e.g. the volunteer signup).
  // Reinforces the "tap the icon above" copy with a direct one-tap action.
  cta?: "volunteer" | "donate";
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
    eyebrow: { es: "Bienvenido", en: "Welcome", pt: "Bem-vindo" },
    title: { es: "Encuentra a tus seres queridos", en: "Find your loved ones", pt: "Encontre seus entes queridos" },
    body: {
      es: "Base de datos verificada de personas afectadas por los terremotos del 24 de Junio 2026, en constante actualización por personal médico en campo. Te ayuda a ubicar a tus familiares.",
      en: "A verified database of people affected by the June 24, 2026 earthquakes, continuously updated by medical staff in the field. It helps you locate your family.",
      pt: "Base de dados verificada de pessoas afetadas pelos terremotos de 24 de junho de 2026, atualizada constantemente por profissionais de saúde em campo. Ajuda você a localizar seus familiares.",
    },
  },
  {
    eyebrow: { es: "Paso 1", en: "Step 1", pt: "Passo 1" },
    title: { es: "Explora el mapa", en: "Explore the map", pt: "Explore o mapa" },
    body: {
      es: "Toca un punto en el mapa o filtra por estado y centro. Verás quién está reportado en cada lugar.",
      en: "Tap a point on the map or filter by state and center. You'll see who is reported at each place.",
      pt: "Toque em um ponto do mapa ou filtre por estado e centro. Você verá quem está registrado em cada local.",
    },
    icon: I.pin,
  },
  {
    eyebrow: { es: "Paso 2", en: "Step 2", pt: "Passo 2" },
    title: { es: "Busca por nombre o cédula", en: "Search by name or ID", pt: "Busque por nome ou CI" },
    body: {
      es: "Usa el buscador para encontrar a una persona por nombre, apellido o cédula. Filtra por estatus: ingresado, de alta o fallecido.",
      en: "Use the search to find a person by first name, surname or ID. Filter by status: admitted, discharged or deceased.",
      pt: "Use a busca para encontrar uma pessoa por nome, sobrenome ou CI. Filtre por status: internado, com alta ou falecido.",
    },
    icon: I.search,
  },
  {
    eyebrow: { es: "Importante", en: "Important", pt: "Importante" },
    title: { es: "Cómo leer los datos", en: "How to read the data", pt: "Como interpretar os dados" },
    body: {
      es: "Cada ficha muestra su fecha de última actualización. En una emergencia hay múltiples traslados: esta lista no garantiza que la persona siga en ese centro, pero sí la veracidad y la fecha del dato publicado. La información se actualiza a medida que llegan nuevos aportes. Úsala como herramienta de búsqueda, consulta y colaboración ciudadana.",
      en: "Each record shows its last-updated date. In an emergency there are multiple transfers: this list does not guarantee the person is still at that center, but it does guarantee the veracity and date of the published data. Information is updated as new contributions arrive. Use it as a tool for searching, consultation and citizen collaboration.",
      pt: "Cada ficha mostra sua data de última atualização. Em uma emergência há múltiplas transferências: esta lista não garante que a pessoa continue naquele centro, mas garante a veracidade e a data do dado publicado. A informação é atualizada à medida que chegam novas contribuições. Use-a como ferramenta de busca, consulta e colaboração cidadã.",
    },
    icon: I.info,
  },
  {
    eyebrow: { es: "Paso 3", en: "Step 3", pt: "Passo 3" },
    title: { es: "Comparte para ayudar", en: "Share to help", pt: "Compartilhe para ajudar" },
    body: {
      es: "Comparte una ficha por WhatsApp, Telegram o como historia de Instagram. Mientras más se comparte, más rápido se reúnen las familias.",
      en: "Share a record via WhatsApp, Telegram or as an Instagram story. The more it's shared, the faster families reunite.",
      pt: "Compartilhe uma ficha pelo WhatsApp, Telegram ou como story do Instagram. Quanto mais é compartilhada, mais rápido as famílias se reencontram.",
    },
    icon: I.share,
  },
  {
    eyebrow: { es: "Subir información", en: "Upload information", pt: "Enviar informação" },
    title: { es: "Tu envío pasa por revisión", en: "Your submission is reviewed", pt: "Seu envio passa por revisão" },
    body: {
      es: "Si tienes datos de alguien, toca «Subir info». Tu envío NO se publica de inmediato. Sigue estos pasos antes de aparecer en el mapa:",
      en: "If you have details about someone, tap “Upload info”. Your submission is NOT published right away. It follows these steps before appearing on the map:",
      pt: "Se você tem dados de alguém, toque em «Enviar info». Seu envio NÃO é publicado imediatamente. Ele segue estas etapas antes de aparecer no mapa:",
    },
    icon: I.plus,
    steps: [
      {
        t: { es: "Recibido", en: "Received", pt: "Recebido" },
        d: {
          es: "Tu envío entra a la cola del equipo.",
          en: "Your submission enters the team's queue.",
          pt: "Seu envio entra na fila da equipe.",
        },
      },
      {
        t: { es: "Limpieza", en: "Cleanup", pt: "Triagem" },
        d: {
          es: "Se normaliza y se cruza con otros reportes para evitar duplicados.",
          en: "It's normalized and cross-checked against other reports to avoid duplicates.",
          pt: "É normalizado e cruzado com outros reportes para evitar duplicados.",
        },
      },
      {
        t: { es: "Verificación", en: "Verification", pt: "Verificação" },
        d: {
          es: "El equipo y contactos médicos lo confirman.",
          en: "The team and medical contacts confirm it.",
          pt: "A equipe e contatos médicos confirmam a informação.",
        },
      },
      {
        t: { es: "Publicado", en: "Published", pt: "Publicado" },
        d: {
          es: "Solo entonces aparece en el mapa, con su sello verde «Verificado». Las fotos de menores nunca se muestran.",
          en: "Only then does it appear on the map, with its green “Verified” badge. Photos of minors are never shown.",
          pt: "Só então aparece no mapa, com seu selo verde «Verificado». Fotos de menores nunca são exibidas.",
        },
      },
    ],
  },
  {
    eyebrow: { es: "Nuestro compromiso", en: "Our commitment", pt: "Nosso compromisso" },
    title: {
      es: "Sin fines de lucro y con cuidado",
      en: "Non-profit and handled with care",
      pt: "Sem fins lucrativos e com cuidado",
    },
    body: {
      es: "Somos una iniciativa ciudadana sin fines de lucro. Esta información existe solo para reunir familias. Así protegemos los datos:",
      en: "We are a volunteer initiative. This information exists only to reunite families. This is how we protect the data:",
      pt: "Somos uma iniciativa cidadã sem fins lucrativos. Esta informação existe apenas para reunir famílias. Assim protegemos os dados:",
    },
    steps: [
      {
        t: { es: "No lucramos", en: "No profit", pt: "Não lucramos" },
        d: {
          es: "No cobramos, no mostramos publicidad y no obtenemos beneficio de estos datos.",
          en: "We don't charge, show ads, or profit from this data.",
          pt: "Não cobramos, não exibimos publicidade e não obtemos benefício destes dados.",
        },
      },
      {
        t: { es: "No vendemos tus datos", en: "We don't sell your data", pt: "Não vendemos seus dados" },
        d: {
          es: "La información nunca se vende ni se comparte con terceros con fines comerciales.",
          en: "The information is never sold or shared with third parties for commercial purposes.",
          pt: "A informação nunca é vendida nem compartilhada com terceiros para fins comerciais.",
        },
      },
      {
        t: { es: "Verificado por profesionales", en: "Verified by professionals", pt: "Verificado por profissionais" },
        d: {
          es: "Cada registro es confirmado por personal médico y contactos de confianza antes de publicarse.",
          en: "Each record is confirmed by medical staff and trusted contacts before being published.",
          pt: "Cada registro é confirmado por profissionais de saúde e contatos de confiança antes de ser publicado.",
        },
      },
      {
        t: {
          es: "Protección de niños, niñas y adolescentes",
          en: "Protection of children and adolescents",
          pt: "Proteção de crianças e adolescentes",
        },
        d: {
          es: "Nunca mostramos la cédula ni la foto de un menor, y limitamos sus datos al mínimo.",
          en: "We never show a minor's ID or photo, and we keep their data to a minimum.",
          pt: "Nunca mostramos o CI nem a foto de um menor, e limitamos seus dados ao mínimo.",
        },
      },
    ],
  },
  {
    eyebrow: { es: "Dona", en: "Donate", pt: "Doe" },
    title: {
      es: "Apoya a quien está en el terreno",
      en: "Support those on the ground",
      pt: "Apoie quem está no terreno",
    },
    body: {
      es: "Toca el botón «Donar» (el corazón, arriba a la derecha) para ver refugios y organizaciones que reciben comida y medicinas verificadas. Cada ficha indica qué necesitan ahora y cómo donarles directamente. Tu ayuda llega a las familias afectadas.",
      en: "Tap the “Donate” button (the heart, top right) to see shelters and organizations receiving verified food and medicine. Each card shows what they need now and how to donate to them directly. Your help reaches affected families.",
      pt: "Toque no botão «Doar» (o coração, no canto superior direito) para ver abrigos e organizações que recebem comida e remédios verificados. Cada ficha indica o que precisam agora e como doar diretamente. Sua ajuda chega às famílias afetadas.",
    },
    icon: I.heart,
    cta: "donate",
  },
  {
    eyebrow: { es: "Súmate", en: "Join us", pt: "Junte-se a nós" },
    title: {
      es: "¿Eres personal de salud o rescate?",
      en: "Are you health or rescue staff?",
      pt: "Você é profissional de saúde ou resgate?",
    },
    body: {
      es: "Esto es un esfuerzo ciudadano: mientras más datos confirmemos, más rápido llenamos el mapa. Si eres médico, enfermero, personal de salud o rescatista, súmate con tu perfil y tus fuentes para darte acceso.",
      en: "This is a citizen effort: the more data we confirm, the faster we fill the map. If you are a doctor, nurse, health worker or rescuer, join us with your profile and sources so we can grant you access.",
      pt: "Este é um esforço cidadão: quanto mais dados confirmarmos, mais rápido preenchemos o mapa. Se você é médico, enfermeiro, profissional de saúde ou resgatista, junte-se a nós com seu perfil e suas fontes para liberarmos seu acesso.",
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
    eyebrow: { es: "Eres parte del equipo", en: "You're on the team", pt: "Você faz parte da equipe" },
    title: { es: "Bienvenido, voluntario", en: "Welcome, volunteer", pt: "Bem-vindo, voluntário" },
    body: {
      es: "Gracias por ayudar a reunir familias. Tienes acceso de confianza: lo que publiques se refleja de inmediato. Úsalo con responsabilidad; podemos revocar el acceso en cualquier momento.",
      en: "Thank you for helping reunite families. You have trusted access: what you publish reflects immediately. Use it responsibly; access can be revoked at any time.",
      pt: "Obrigado por ajudar a reunir famílias. Você tem acesso de confiança: o que você publica reflete imediatamente. Use com responsabilidade; podemos revogar o acesso a qualquer momento.",
    },
    icon: I.hands,
  },
  {
    eyebrow: { es: "Tu panel", en: "Your panel", pt: "Seu painel" },
    title: { es: "Abre el panel del equipo", en: "Open the team panel", pt: "Abra o painel da equipe" },
    body: {
      es: "Toca el ícono de menú (≡) arriba a la derecha. Tendrás pestañas: Centros, Personas, Listas, Donaciones y Rescatados.",
      en: "Tap the menu icon (≡) at the top right. You'll get tabs: Centers, People, Lists, Donations and Rescued.",
      pt: "Toque no ícone de menu (≡) no canto superior direito. Você terá abas: Centros, Pessoas, Listas, Doações e Resgatados.",
    },
    icon: I.map,
  },
  {
    eyebrow: { es: "Personas", en: "People", pt: "Pessoas" },
    title: { es: "Agrega, edita y verifica", en: "Add, edit and verify", pt: "Adicione, edite e verifique" },
    body: {
      es: "En «Personas» agregas o editas registros. El interruptor «Verificado» publica la foto y el estatus (incluido fallecido). Sin verificar, el registro aparece pero sin foto.",
      en: "In “People” you add or edit records. The “Verified” switch publishes the photo and status (including deceased). Unverified, a record still appears but without a photo.",
      pt: "Em «Pessoas» você adiciona ou edita registros. O interruptor «Verificado» publica a foto e o status (incluindo falecido). Sem verificar, o registro aparece, mas sem foto.",
    },
    icon: I.shield,
    steps: [
      {
        t: { es: "Verificado = público", en: "Verified = public", pt: "Verificado = público" },
        d: {
          es: "Solo marca verificado lo que confirmaste en campo.",
          en: "Only mark verified what you confirmed in the field.",
          pt: "Só marque como verificado o que você confirmou em campo.",
        },
      },
      {
        t: { es: "Menores protegidos", en: "Minors protected", pt: "Menores protegidos" },
        d: {
          es: "Nunca se muestra foto ni cédula de un menor.",
          en: "A minor's photo and ID are never shown.",
          pt: "Nunca são exibidas a foto nem o CI de um menor.",
        },
      },
    ],
  },
  {
    eyebrow: { es: "Aportes del público", en: "Public contributions", pt: "Contribuições do público" },
    title: { es: "Pon caras a los registros", en: "Put faces to records", pt: "Dê rostos aos registros" },
    body: {
      es: "La gente puede enviar fotos/datos de una persona. Aparecen DENTRO de la ficha de esa persona (con un contador ámbar en la lista). Ábrela y aprueba o rechaza cada aporte.",
      en: "People can submit photos/info for a person. They appear INSIDE that person's card (with an amber counter in the list). Open it and approve or reject each contribution.",
      pt: "As pessoas podem enviar fotos/dados de alguém. Eles aparecem DENTRO da ficha dessa pessoa (com um contador âmbar na lista). Abra e aprove ou rejeite cada contribuição.",
    },
    icon: I.share,
  },
  {
    eyebrow: { es: "Rescatados", en: "Rescued", pt: "Resgatados" },
    title: { es: "Reporta rescatados con vida", en: "Report people rescued alive", pt: "Reporte resgatados com vida" },
    body: {
      es: "En «Rescatados» publicas a alguien sacado con vida aunque aún no sepas a qué centro fue. Cuando lo trasladen, promuévelo a paciente y aparecerá en el mapa.",
      en: "In “Rescued” you publish someone pulled out alive even before you know which center they went to. When transferred, promote them to a patient and they appear on the map.",
      pt: "Em «Resgatados» você publica alguém retirado com vida mesmo sem saber ainda para qual centro foi. Quando for transferido, promova-o a paciente e ele aparecerá no mapa.",
    },
    icon: I.heart,
  },
  {
    eyebrow: { es: "Subir listas", en: "Upload lists", pt: "Enviar listas" },
    title: { es: "Fotografía listas manuscritas", en: "Photograph handwritten lists", pt: "Fotografe listas manuscritas" },
    body: {
      es: "¿Tienes una lista de pacientes en papel? Foto en «Listas» → el equipo la procesa (OCR) y entra al flujo. Borrar registros y centros queda solo para administradores.",
      en: "Got a paper patient list? Photo it in “Lists” → the team processes it (OCR) into the flow. Deleting records and centers is admin-only.",
      pt: "Tem uma lista de pacientes em papel? Fotografe em «Listas» → a equipe a processa (OCR) e ela entra no fluxo. Excluir registros e centros é exclusivo para administradores.",
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
  onDonate,
  variant = "public",
}: {
  open: boolean;
  lang: Lang;
  onClose: () => void;
  // Staff login entry, shown under the docs link. Omitted when already signed in.
  onLogin?: () => void;
  // Opens the volunteer signup panel. Powers the CTA button on the "Súmate" slide.
  onVolunteer?: () => void;
  // Opens the donations panel. Powers the CTA button on the "Dona" slide.
  onDonate?: () => void;
  // "public" = first-run visitor tour; "staff" = volunteer/admin onboarding on sign-in.
  variant?: "public" | "staff";
}) {
  const [i, setI] = useState(0);
  if (!open) return null;

  const slides = variant === "staff" ? STAFF_SLIDES : SLIDES;
  const s = slides[i];
  const last = i === slides.length - 1;
  const L = (o: { es: string; en: string; pt: string }) => o[lang];

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
            {L({ es: "Quiero ayudar", en: "I want to help", pt: "Quero ajudar" })}
          </button>
        )}

        {s.cta === "donate" && onDonate && (
          <button className="tour-cta" onClick={onDonate}>
            {I.heart}
            {L({ es: "Quiero donar", en: "I want to donate", pt: "Quero doar" })}
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
              {L({ es: "Atrás", en: "Back", pt: "Voltar" })}
            </button>
          ) : (
            <button className="tour-skip" onClick={onClose}>
              {L({ es: "Saltar", en: "Skip", pt: "Pular" })}
            </button>
          )}
          <button className="tour-next" onClick={next}>
            {last ? L({ es: "Entendido", en: "Got it", pt: "Entendi" }) : L({ es: "Siguiente", en: "Next", pt: "Próximo" })}
          </button>
        </div>

        {onLogin && (
          <button className="tour-loginlink" onClick={onLogin}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {L({ es: "Ingresar (equipo)", en: "Sign in (team)", pt: "Entrar (equipe)" })}
          </button>
        )}
      </div>
    </div>
  );
}
