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
  es: "HelpMap está EN LÍNEA y funcionando. Nació como respuesta ciudadana al terremoto de junio de 2026 en Venezuela; hoy lo estamos convirtiendo en una plataforma cívica replicable, para que cualquier comunidad o país pueda desplegarla ante una emergencia. Abajo: lo que ya funciona y hacia dónde vamos.",
  en: "HelpMap is LIVE and working. It began as a citizen response to the June 2026 earthquake in Venezuela; today we're turning it into a replicable civic platform, so any community or country can deploy it in an emergency. Below: what already works and where we're headed.",
  pt: "O HelpMap está NO AR e funcionando. Nasceu como resposta cidadã ao terremoto de junho de 2026 na Venezuela; hoje estamos transformando-o em uma plataforma cívica replicável, para que qualquer comunidade ou país possa implantá-lo em uma emergência. Abaixo: o que já funciona e para onde vamos.",
};

// Short banner highlighting the current phase.
export const ROADMAP_NOW: LS = {
  es: "Fase actual: Consolidación y sostenibilidad — sostener la operación en Venezuela y abrir la plataforma a aliados, financistas y otros países.",
  en: "Current phase: Consolidation & sustainability — keep the operation running in Venezuela and open the platform to allies, funders and other countries.",
  pt: "Fase atual: Consolidação e sustentabilidade — manter a operação na Venezuela e abrir a plataforma a aliados, financiadores e outros países.",
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
    status: "done",
    note: { es: "Lanzada y en uso.", en: "Launched and in use.", pt: "Lançada e em uso." },
    items: [
      {
        es: "App en línea en helpmapvzla.net, instalable en el teléfono (PWA).",
        en: "App live at helpmapvzla.net, installable on your phone (PWA).",
        pt: "App no ar em helpmapvzla.net, instalável no telefone (PWA).",
      },
      {
        es: "Cobertura de Distrito Capital, La Guaira y Miranda, con estados ampliados habilitados.",
        en: "Coverage of Distrito Capital, La Guaira and Miranda, with expanded states enabled.",
        pt: "Cobertura de Distrito Capital, La Guaira e Miranda, com estados ampliados habilitados.",
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
        es: "Capa de daños / intensidad sentida del sismo (datos USGS + campo).",
        en: "Damage / felt-intensity layer of the quake (USGS + field data).",
        pt: "Camada de danos / intensidade sentida do terremoto (dados USGS + campo).",
      },
      {
        es: "App multiidioma: español, inglés y portugués — para la diáspora y aliados.",
        en: "Multilingual app: Spanish, English and Portuguese — for the diaspora and allies.",
        pt: "App multilíngue: espanhol, inglês e português — para a diáspora e aliados.",
      },
    ],
  },
  {
    id: "p3",
    title: { es: "Fase 3 · Red viva y confianza", en: "Phase 3 · Living network & trust", pt: "Fase 3 · Rede viva e confiança" },
    status: "done",
    note: {
      es: "Funciones ya en producción tras el lanzamiento.",
      en: "Features already in production after launch.",
      pt: "Funcionalidades já em produção após o lançamento.",
    },
    items: [
      {
        es: 'Rescatados: red de "está vivo, fue rescatado" antes del traslado a un centro.',
        en: 'Rescued: an "alive, was rescued" network before transfer to a centre.',
        pt: 'Resgatados: rede de "está vivo, foi resgatado" antes da transferência a um centro.',
      },
      {
        es: 'Refugios y centros de acopio con "qué reciben / qué necesitan hoy" + cómo llegar y WhatsApp (integración con AcopioVE).',
        en: 'Shelters and donation centres with "what they receive / need today" + directions and WhatsApp (AcopioVE integration).',
        pt: 'Abrigos e centros de doação com "o que recebem / precisam hoje" + como chegar e WhatsApp (integração com AcopioVE).',
      },
      {
        es: "Aportes del público: ponerle cara y datos a un registro existente, con moderación del equipo.",
        en: "Public contributions: put a face and details to an existing record, with team moderation.",
        pt: "Contribuições do público: dar rosto e dados a um registro existente, com moderação da equipe.",
      },
      {
        es: "Reportar desaparecido: las familias piden al equipo buscar a alguien en la base.",
        en: "Report a missing person: families ask the team to search someone in the database.",
        pt: "Reportar desaparecido: as famílias pedem à equipe buscar alguém na base.",
      },
      {
        es: 'Confianza: conteos por centro, "última actualización" visible y registro de auditoría de cambios.',
        en: 'Trust: per-centre counts, a visible "last updated" and an audit log of changes.',
        pt: 'Confiança: contagens por centro, "última atualização" visível e registro de auditoria de mudanças.',
      },
      {
        es: "API pública (solo lectura, verificados) para que otras iniciativas humanitarias reutilicen los datos confirmados.",
        en: "Public read-only API (verified records) so other humanitarian efforts can reuse the confirmed data.",
        pt: "API pública (somente leitura, verificados) para que outras iniciativas humanitárias reutilizem os dados confirmados.",
      },
    ],
  },
  {
    id: "p4",
    title: { es: "Fase 4 · Consolidación y sostenibilidad", en: "Phase 4 · Consolidation & sustainability", pt: "Fase 4 · Consolidação e sustentabilidade" },
    status: "current",
    note: { es: "Estamos aquí — buscamos aliados y financiamiento.", en: "We are here — seeking allies and funding.", pt: "Estamos aqui — buscamos aliados e financiamento." },
    items: [
      {
        es: "Financiamiento y patrocinio para sostener y escalar la operación: infraestructura, verificación en campo y equipo.",
        en: "Funding and sponsorship to sustain and scale the operation: infrastructure, field verification and the team.",
        pt: "Financiamento e patrocínio para sustentar e escalar a operação: infraestrutura, verificação em campo e equipe.",
      },
      {
        es: "Llamado al sector privado: aporte en especie (conectividad, hosting/cloud, redes médicas y logísticas, difusión).",
        en: "Call to the private sector: in-kind support (connectivity, hosting/cloud, medical and logistics networks, outreach).",
        pt: "Chamado ao setor privado: apoio em espécie (conectividade, hosting/cloud, redes médicas e logísticas, divulgação).",
      },
      {
        es: "Red de aliados: organizaciones, medios y ciudadanos que multiplican la acción cívica.",
        en: "Ally network: organizations, media and citizens who multiply the civic action.",
        pt: "Rede de aliados: organizações, mídia e cidadãos que multiplicam a ação cívica.",
      },
      {
        es: "Ampliar cobertura verificada a más estados, según llegue el dato confirmado.",
        en: "Expand verified coverage to more states as confirmed data arrives.",
        pt: "Ampliar a cobertura verificada a mais estados, conforme chega o dado confirmado.",
      },
      {
        es: "OCR de listas manuscritas hacia la cola de revisión (automatizar la digitalización).",
        en: "OCR of handwritten lists into the review queue (automate digitization).",
        pt: "OCR de listas manuscritas para a fila de revisão (automatizar a digitalização).",
      },
    ],
  },
  {
    id: "p5",
    title: { es: "Fase 5 · Plataforma replicable (multi-país)", en: "Phase 5 · Replicable platform (multi-country)", pt: "Fase 5 · Plataforma replicável (multi-país)" },
    status: "next",
    note: {
      es: "El objetivo: que cualquier país despliegue HelpMap ante una emergencia.",
      en: "The goal: any country can deploy HelpMap in an emergency.",
      pt: "O objetivo: qualquer país pode implantar o HelpMap em uma emergência.",
    },
    items: [
      {
        es: "Generalizar más allá de Venezuela: geografía, idiomas y centros configurables, sin tocar el código.",
        en: "Generalize beyond Venezuela: configurable geography, languages and centres, without touching the code.",
        pt: "Generalizar além da Venezuela: geografia, idiomas e centros configuráveis, sem tocar no código.",
      },
      {
        es: "Despliegue sencillo: montar una instancia para una nueva emergencia en horas, no semanas.",
        en: "Easy deployment: stand up an instance for a new emergency in hours, not weeks.",
        pt: "Implantação simples: subir uma instância para uma nova emergência em horas, não semanas.",
      },
      {
        es: "Modelo de participación cívica reutilizable: voluntarios verificados, aportes del público y aliados locales.",
        en: "Reusable civic-participation model: vetted volunteers, public contributions and local allies.",
        pt: "Modelo de participação cívica reutilizável: voluntários verificados, contribuições do público e aliados locais.",
      },
      {
        es: "Guía de despliegue y buenas prácticas de privacidad para nuevos equipos.",
        en: "Deployment guide and privacy best-practices for new teams.",
        pt: "Guia de implantação e boas práticas de privacidade para novas equipes.",
      },
    ],
  },
  {
    id: "p6",
    title: { es: "Fase 6 · Futuro", en: "Phase 6 · Future", pt: "Fase 6 · Futuro" },
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
    ],
  },
];
