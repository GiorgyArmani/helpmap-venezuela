import type { Metadata } from "next";
import Link from "next/link";
import type { Lang } from "@/components/helpmap/data";
import { DocTopbar } from "./DocTopbar";

type SearchParams = { searchParams: Promise<{ lang?: string }> };

const pickLang = (v?: string): Lang => (v === "en" ? "en" : v === "pt" ? "pt" : "es");

type Lstr = { es: string; en: string; pt: string };

const TITLE: Lstr = { es: "Documentación · HelpMap Venezuela", en: "Documentation · HelpMap Venezuela", pt: "Documentação · HelpMap Venezuela" };
const DESC: Lstr = {
  es: "Documentación de HelpMap: guía de uso, roadmap, privacidad y cómo colaborar, financiar o desplegar la plataforma.",
  en: "HelpMap documentation: usage guide, roadmap, privacy, and how to collaborate, fund or deploy the platform.",
  pt: "Documentação do HelpMap: guia de uso, roadmap, privacidade e como colaborar, financiar ou implantar a plataforma.",
};

export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const lang = pickLang((await searchParams).lang);
  return {
    title: TITLE[lang],
    description: DESC[lang],
    alternates: {
      canonical: "/docs" + (lang === "es" ? "" : `?lang=${lang}`),
    },
  };
}

// Sections we plan to publish. `href` flips an item from "coming soon" to a real link.
// `feature` visually highlights a card (used for the partnerships/funding call-out).
const SECTIONS: { title: Lstr; desc: Lstr; href?: string; feature?: boolean }[] = [
  {
    title: { es: "Guía de uso", en: "Usage guide", pt: "Guia de uso" },
    desc: {
      es: "Manual completo: buscar a un familiar, leer una ficha, el mapa y sus filtros, compartir, colaborar y usar la app sin conexión.",
      en: "Full manual: search for a relative, read a record, the map and its filters, sharing, contributing and using the app offline.",
      pt: "Manual completo: buscar um familiar, ler uma ficha, o mapa e seus filtros, compartilhar, colaborar e usar o app sem conexão.",
    },
    href: "/docs/guia",
  },
  {
    title: { es: "Colabora, financia y despliega", en: "Collaborate, fund & deploy", pt: "Colabore, financie e implante" },
    desc: {
      es: "Somos código abierto y sin fines de lucro. Financia, aporta en especie, despliega HelpMap en tu país o súmate como aliado.",
      en: "We're open-source and non-profit. Fund it, give in-kind support, deploy HelpMap in your country or join as an ally.",
      pt: "Somos código aberto e sem fins lucrativos. Financie, contribua em espécie, implante o HelpMap no seu país ou junte-se como aliado.",
    },
    href: "/docs/colabora",
    feature: true,
  },
  {
    title: { es: "Roadmap", en: "Roadmap", pt: "Roadmap" },
    desc: {
      es: "Qué funciones vienen y en qué orden: centros de acopio, actualizaciones de estado, accesibilidad y más.",
      en: "What's coming and in what order: donation centres, status updates, accessibility and more.",
      pt: "Quais funcionalidades vêm a seguir e em que ordem: centros de doação, atualizações de status, acessibilidade e mais.",
    },
    href: "/docs/roadmap",
  },
  {
    title: { es: "Privacidad y manejo de datos", en: "Privacy & data handling", pt: "Privacidade e manejo de dados" },
    desc: {
      es: "Qué mostramos y qué no, protección reforzada de menores y cómo verificamos cada registro en campo.",
      en: "What we show and what we don't, reinforced protection of minors, and how we verify each record in the field.",
      pt: "O que exibimos e o que não, proteção reforçada de menores e como verificamos cada registro em campo.",
    },
    href: "/docs/privacidad",
  },
  {
    title: { es: "Para voluntarios", en: "For volunteers", pt: "Para voluntários" },
    desc: {
      es: "Cómo sumarse, qué perfiles buscamos y cómo cargar listas e información de forma segura.",
      en: "How to join, which profiles we look for, and how to upload lists and information safely.",
      pt: "Como participar, quais perfis buscamos e como enviar listas e informações com segurança.",
    },
    href: "/docs/voluntarios",
  },
  {
    title: { es: "Manual del voluntario", en: "Volunteer manual", pt: "Manual do voluntário" },
    desc: {
      es: "Paso a paso del panel: cada pestaña, cuándo marcar verificado y las reglas que no se rompen.",
      en: "Step by step through the panel: every tab, when to mark verified, and the rules that are never broken.",
      pt: "Passo a passo do painel: cada aba, quando marcar verificado e as regras que nunca se quebram.",
    },
    href: "/docs/manual-voluntario",
  },
  {
    title: { es: "Para prensa y aliados", en: "For press & partners", pt: "Para imprensa e parceiros" },
    desc: {
      es: "Qué es HelpMap VE, quién lo construye y cómo citar o colaborar con el proyecto.",
      en: "What HelpMap VE is, who builds it, and how to cite or collaborate with the project.",
      pt: "O que é o HelpMap VE, quem o constrói e como citar ou colaborar com o projeto.",
    },
    href: "/docs/prensa",
  },
];

const T = {
  backToApp: { es: "Volver a la app", en: "Back to the app", pt: "Voltar ao app" } as Lstr,
  kicker: { es: "DOCUMENTACIÓN · HELPMAP", en: "DOCUMENTATION · HELPMAP", pt: "DOCUMENTAÇÃO · HELPMAP" } as Lstr,
  h1: { es: "Documentación", en: "Documentation", pt: "Documentação" } as Lstr,
  lead: {
    es: "Cómo funciona HelpMap VE: guía de uso, roadmap del proyecto, privacidad y manejo de datos, y cómo ser voluntario o colaborar.",
    en: "How HelpMap VE works: usage guide, project roadmap, privacy and data handling, and how to volunteer or collaborate.",
    pt: "Como funciona o HelpMap VE: guia de uso, roadmap do projeto, privacidade e manejo de dados, e como ser voluntário ou colaborar.",
  } as Lstr,
  forPartners: { es: "Aliados y financistas", en: "Partners & funders", pt: "Parceiros e financiadores" } as Lstr,
  soon: { es: "Próximamente", en: "Coming soon", pt: "Em breve" } as Lstr,
  noteAsk: {
    es: "¿Necesitas algo ahora o quieres colaborar? Escríbenos a ",
    en: "Need something now or want to collaborate? Write to ",
    pt: "Precisa de algo agora ou quer colaborar? Escreva para ",
  } as Lstr,
  goToMap: { es: "Ir al mapa", en: "Go to the map", pt: "Ir para o mapa" } as Lstr,
};

// One icon per section (keyed by its /docs/<slug>), shown in a tinted square on each tile.
const sv = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const ICONS: Record<string, React.ReactNode> = {
  guia: sv(
    <>
      <path d="M12 7v13" />
      <path d="M3 5a1 1 0 0 1 1-1h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a2 2 0 0 0-2 2 2 2 0 0 0-2-2H4a1 1 0 0 1-1-1z" />
    </>,
  ),
  colabora: sv(<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />),
  roadmap: sv(
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>,
  ),
  privacidad: sv(
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>,
  ),
  voluntarios: sv(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
  ),
  "manual-voluntario": sv(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="m9.5 9.5 1.5 1.5 3-3" />
    </>,
  ),
  prensa: sv(
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>,
  ),
};

export default async function DocsPage({ searchParams }: SearchParams) {
  const lang = pickLang((await searchParams).lang);
  const t = (o: Lstr) => o[lang];
  const qs = (l: Lang) => (l === "es" ? "" : `?lang=${l}`);
  const withLang = (href: string) => `${href}${qs(lang)}`;

  const slugOf = (href?: string) => href?.split("/").pop() ?? "";
  const chevron = (
    <span className="doc-tile-chev" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </span>
  );

  return (
    <div className="doc-wrap">
      <DocTopbar lang={lang} base="/docs" backLabel={t(T.backToApp)} docsLabel={t(T.h1)} />
      <div className="doc-content">
        <div className="doc-card">
          <div className="doc-kicker">{t(T.kicker)}</div>
          <h1 className="doc-h1">{t(T.h1)}</h1>
          <p className="doc-lead">{t(T.lead)}</p>

        <div className="doc-grid">
          {SECTIONS.map((s) =>
            s.href ? (
              <Link
                key={s.title.es}
                href={withLang(s.href)}
                className={"doc-tile" + (s.feature ? " doc-tile-feature" : "")}
              >
                {chevron}
                <span className="doc-tile-ic">{ICONS[slugOf(s.href)]}</span>
                {s.feature && <span className="doc-feature-tag">{t(T.forPartners)}</span>}
                <span className="doc-tile-title">{t(s.title)}</span>
                <p className="doc-tile-desc">{t(s.desc)}</p>
              </Link>
            ) : (
              <div key={s.title.es} className="doc-tile doc-tile-soon">
                <span className="doc-tile-ic">{ICONS[slugOf(s.href)]}</span>
                <span className="doc-item-soon">{t(T.soon)}</span>
                <span className="doc-tile-title">{t(s.title)}</span>
                <p className="doc-tile-desc">{t(s.desc)}</p>
              </div>
            ),
          )}
        </div>

        <p className="doc-note">
          {t(T.noteAsk)}
          <a href="mailto:info@helpmapvzla.net" className="doc-mail">
            info@helpmapvzla.net
          </a>
          .
        </p>

          <div className="doc-single">
            <Link href="/" className="doc-primary">
              {t(T.goToMap)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
