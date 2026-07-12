// Product roadmap data — rendered by app/docs/roadmap/page.tsx. This is the
// public "where we are / where we're going" roadmap, by phase, bilingual (Spanish
// base, English secondary). The detailed engineering feature-proposal doc lives in
// ROADMAP.md at the repo root. Every shipped/planned item still obeys CLAUDE.md
// §2/§11 privacy rules.

import type { Lang } from "./data";

// Trilingual string. `pt` is optional: long-form docs content (guides, privacy, etc.)
// hasn't all been translated yet, so `tr()` falls back to Spanish rather than leaving
// press/diaspora readers with a mix of English fallbacks for untranslated sections.
export type LS = { es: string; en: string; pt?: string };

export const tr = (o: LS, lang: Lang) => (lang === "pt" ? (o.pt ?? o.es) : o[lang]);

export type PhaseStatus = "done" | "current" | "next" | "later";

export const PHASE_META: Record<PhaseStatus, { dot: string; label: LS }> = {
  done: { dot: "#1c8a4e", label: { es: "Completado", en: "Done", pt: "Concluído" } },
  current: {
    dot: "#2563eb",
    label: { es: "En curso · Lanzamiento", en: "In progress · Launch", pt: "Em andamento · Lançamento" },
  },
  next: { dot: "#b45309", label: { es: "Próximo", en: "Next", pt: "Próximo" } },
  later: { dot: "#7b818c", label: { es: "Más adelante", en: "Later", pt: "Mais adiante" } },
};

export interface Phase {
  id: string;
  title: LS;
  status: PhaseStatus;
  note?: LS;
  items: LS[];
}

export const ROADMAP_TITLE: LS = { es: "Roadmap", en: "Roadmap", pt: "Roadmap" };

export const ROADMAP_INTRO: LS = {
  es: "En qué estamos y hacia dónde vamos. HelpMap VE está listo para su lanzamiento: abajo ves lo que ya funciona y lo que viene después. Es una guía de producto que evoluciona; el equipo decide las prioridades.",
  en: "Where we are and where we're headed. HelpMap VE is ready to launch: below is what already works and what comes next. It's an evolving product guide; the team sets the priorities.",
  pt: "Em que ponto estamos e para onde vamos. O HelpMap VE está pronto para o lançamento: abaixo você vê o que já funciona e o que vem a seguir. É um guia de produto em evolução; a equipe define as prioridades.",
};

// Short banner highlighting the current phase.
export const ROADMAP_NOW: LS = {
  es: "Fase actual: Lanzamiento — listos para salir.",
  en: "Current phase: Launch — ready to go live.",
  pt: "Fase atual: Lançamento — prontos para ir ao ar.",
};

export const ROADMAP_PHASES: Phase[] = [
  {
    id: "p1",
    title: { es: "Fase 1 · Fundación", en: "Phase 1 · Foundation", pt: "Fase 1 · Fundação" },
    status: "done",
    items: [
      {
        es: "Mapa interactivo: explorar por estado, municipio y centro.",
        en: "Interactive map: explore by state, municipality and centre.",
        pt: "Mapa interativo: explore por estado, município e centro.",
      },
      {
        es: "Búsqueda por nombre, apellido o cédula, con filtros por estatus.",
        en: "Search by name, surname or ID, with status filters.",
        pt: "Busca por nome, sobrenome ou CI, com filtros por status.",
      },
      {
        es: "Fichas con páginas compartibles (WhatsApp, Telegram, Instagram).",
        en: "Records with shareable pages (WhatsApp, Telegram, Instagram).",
        pt: "Fichas com páginas compartilháveis (WhatsApp, Telegram, Instagram).",
      },
      {
        es: "Funciona sin conexión: abre una vez con datos y consúltala sin señal.",
        en: "Works offline: open it once with data and consult it without signal.",
        pt: "Funciona sem conexão: abra uma vez com dados e consulte sem sinal.",
      },
      {
        es: 'Formulario "Subir info" — revisado por el equipo antes de publicarse.',
        en: '"Upload info" form — reviewed by the team before publishing.',
        pt: 'Formulário "Enviar info" — revisado pela equipe antes de publicar.',
      },
      {
        es: "Protección reforzada de menores: nunca su foto ni su cédula.",
        en: "Reinforced protection of minors: never their photo or ID.",
        pt: "Proteção reforçada de menores: nunca sua foto nem seu CI.",
      },
    ],
  },
  {
    id: "p2",
    title: { es: "Fase 2 · Lanzamiento", en: "Phase 2 · Launch", pt: "Fase 2 · Lançamento" },
    status: "current",
    note: { es: "Estamos aquí.", en: "We are here.", pt: "Estamos aqui." },
    items: [
      {
        es: "Cobertura inicial: Distrito Capital, La Guaira y Miranda, con estados ampliados habilitados.",
        en: "Initial coverage: Distrito Capital, La Guaira and Miranda, with expanded states enabled.",
        pt: "Cobertura inicial: Distrito Capital, La Guaira e Miranda, com estados ampliados habilitados.",
      },
      {
        es: "Panel de administración: gestión de centros y personas.",
        en: "Admin panel: manage centres and people.",
        pt: "Painel de administração: gestão de centros e pessoas.",
      },
      {
        es: 'Voluntariado: roles, alta de voluntarios y "subir listas" (foto de listas).',
        en: 'Volunteering: roles, volunteer onboarding and "upload lists" (photo of lists).',
        pt: 'Voluntariado: perfis, cadastro de voluntários e "enviar listas" (foto de listas).',
      },
      {
        es: 'Donaciones: organizaciones aliadas y CTA "quiero aparecer aquí".',
        en: 'Donations: partner organizations and an "add my organization" CTA.',
        pt: 'Doações: organizações parceiras e CTA "quero aparecer aqui".',
      },
      {
        es: "Capa de daños / intensidad sentida del sismo.",
        en: "Damage / felt-intensity layer of the quake.",
        pt: "Camada de danos / intensidade sentida do terremoto.",
      },
      {
        es: "Datos confirmados en campo con contactos en centros de salud.",
        en: "Data confirmed in the field with contacts at health centres.",
        pt: "Dados confirmados em campo com contatos em centros de saúde.",
      },
      {
        es: "Difusión y contacto por redes (@helpmapvzla) — esfuerzo ciudadano.",
        en: "Outreach and contact via social (@helpmapvzla) — a citizen effort.",
        pt: "Divulgação e contato por redes sociais (@helpmapvzla) — esforço cidadão.",
      },
    ],
  },
  {
    id: "p3",
    title: { es: "Fase 3 · Después del lanzamiento", en: "Phase 3 · Post-launch", pt: "Fase 3 · Após o lançamento" },
    status: "next",
    items: [
      {
        es: 'Centros de acopio con "lo más necesitado hoy" + WhatsApp al coordinador.',
        en: 'Donation centres with "most needed today" + WhatsApp to the coordinator.',
        pt: 'Centros de doação com "o mais necessário hoje" + WhatsApp para o coordenador.',
      },
      {
        es: 'Conteos por ubicación y "última actualización" visible para dar confianza.',
        en: 'Per-location counts and a visible "last updated" to build trust.',
        pt: 'Contagens por local e "última atualização" visível para gerar confiança.',
      },
      {
        es: "OCR de listas manuscritas hacia la cola de revisión.",
        en: "OCR of handwritten lists into the review queue.",
        pt: "OCR de listas manuscritas para a fila de revisão.",
      },
      {
        es: '"Yo lo vi": actualizaciones de estado aportadas por familiares.',
        en: '"Yo lo vi": status updates contributed by families.',
        pt: '"Eu o vi": atualizações de status enviadas por familiares.',
      },
    ],
  },
  {
    id: "p4",
    title: { es: "Fase 4 · Futuro", en: "Phase 4 · Future", pt: "Fase 4 · Futuro" },
    status: "later",
    items: [
      {
        es: "Morgues con manejo digno: solo canal de contacto, sin listas públicas.",
        en: "Morgues handled with dignity: contact channel only, no public lists.",
        pt: "Necrotérios com manejo digno: apenas canal de contato, sem listas públicas.",
      },
      {
        es: 'Búsqueda inversa "persona buscada" — tras una revisión de seguridad.',
        en: '"Persona buscada" reverse search — after a safety review.',
        pt: 'Busca reversa "pessoa procurada" — após uma revisão de segurança.',
      },
      {
        es: "Imagen compartible de la lista de un centro, respetando la privacidad.",
        en: "Shareable image of a centre's list, respecting privacy.",
        pt: "Imagem compartilhável da lista de um centro, respeitando a privacidade.",
      },
      {
        es: "Accesibilidad ampliada: alto contraste, búsqueda por voz.",
        en: "Expanded accessibility: high contrast, voice search.",
        pt: "Acessibilidade ampliada: alto contraste, busca por voz.",
      },
      {
        es: "Alcance a la diáspora (familiares en el exterior).",
        en: "Diaspora reach (relatives abroad).",
        pt: "Alcance à diáspora (familiares no exterior).",
      },
    ],
  },
];
