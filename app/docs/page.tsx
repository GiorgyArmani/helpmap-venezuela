import type { Metadata } from "next";
import Link from "next/link";
import type { Lang } from "@/components/helpmap/data";
import { FLAG_ICON } from "@/components/helpmap/icons";

type SearchParams = { searchParams: Promise<{ lang?: string }> };

const pickLang = (v?: string): Lang => (v === "en" ? "en" : v === "pt" ? "pt" : "es");

type Lstr = { es: string; en: string; pt: string };

const TITLE: Lstr = { es: "Documentación · HelpMap Venezuela", en: "Documentation · HelpMap Venezuela", pt: "Documentação · HelpMap Venezuela" };
const DESC: Lstr = {
  es: "Documentación de HelpMap VE: guía de uso, roadmap, privacidad y manejo de datos. Próximamente.",
  en: "HelpMap VE documentation: usage guide, roadmap, privacy and data handling. Coming soon.",
  pt: "Documentação do HelpMap VE: guia de uso, roadmap, privacidade e manejo de dados. Em breve.",
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
const SECTIONS: { title: Lstr; desc: Lstr; href?: string }[] = [
  {
    title: { es: "Guía de uso", en: "Usage guide", pt: "Guia de uso" },
    desc: {
      es: "Cómo buscar a un familiar, explorar el mapa, subir información y usar la app sin conexión.",
      en: "How to search for a relative, explore the map, upload information and use the app offline.",
      pt: "Como buscar um familiar, explorar o mapa, enviar informações e usar o app sem conexão.",
    },
    href: "/docs/guia",
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
  view: { es: "Ver", en: "View", pt: "Ver" } as Lstr,
  soon: { es: "Próximamente", en: "Coming soon", pt: "Em breve" } as Lstr,
  noteAsk: {
    es: "¿Necesitas algo ahora o quieres colaborar? Escríbenos a ",
    en: "Need something now or want to collaborate? Write to ",
    pt: "Precisa de algo agora ou quer colaborar? Escreva para ",
  } as Lstr,
  goToMap: { es: "Ir al mapa", en: "Go to the map", pt: "Ir para o mapa" } as Lstr,
};

export default async function DocsPage({ searchParams }: SearchParams) {
  const lang = pickLang((await searchParams).lang);
  const t = (o: Lstr) => o[lang];
  const qs = (l: Lang) => (l === "es" ? "" : `?lang=${l}`);
  const withLang = (href: string) => `${href}${qs(lang)}`;

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        {/* Nav back to the app + language toggle */}
        <nav style={S.nav}>
          <Link href="/" style={S.back}>
            ← {t(T.backToApp)}
          </Link>
          <div style={S.lang}>
            <Link href={`/docs${qs("es")}`} style={lang === "es" ? S.lgOn : S.lg} aria-label="Español">
              <span style={S.lgFlag}>{FLAG_ICON.es}</span>ES
            </Link>
            <Link href={`/docs${qs("en")}`} style={lang === "en" ? S.lgOn : S.lg} aria-label="English">
              <span style={S.lgFlag}>{FLAG_ICON.en}</span>EN
            </Link>
            <Link href={`/docs${qs("pt")}`} style={lang === "pt" ? S.lgOn : S.lg} aria-label="Português">
              <span style={S.lgFlag}>{FLAG_ICON.pt}</span>PT
            </Link>
          </div>
        </nav>

        <div style={S.kicker}>{t(T.kicker)}</div>
        <h1 style={S.h1}>{t(T.h1)}</h1>
        <p style={S.lead}>{t(T.lead)}</p>

        <div style={S.list}>
          {SECTIONS.map((s) => (
            <div key={s.title.es} style={S.item}>
              <div style={S.itemHead}>
                <span style={S.itemTitle}>{t(s.title)}</span>
                {s.href ? (
                  <Link href={withLang(s.href)} style={S.itemLink}>
                    {t(T.view)}
                  </Link>
                ) : (
                  <span style={S.itemSoon}>{t(T.soon)}</span>
                )}
              </div>
              <p style={S.itemDesc}>{t(s.desc)}</p>
            </div>
          ))}
        </div>

        <p style={S.note}>
          {t(T.noteAsk)}
          <a href="mailto:info@helpmapvzla.net" style={S.mail}>
            info@helpmapvzla.net
          </a>
          .
        </p>

        <Link href="/" style={S.primary}>
          {t(T.goToMap)}
        </Link>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", color: "#16191f" },
  card: { width: "100%", maxWidth: 520, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 24, boxShadow: "0 10px 34px rgba(16,20,28,.10)", marginTop: 24 },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #ebecef" },
  back: { fontSize: "0.8125rem", fontWeight: 600, color: "#16191f", textDecoration: "none" },
  kicker: { fontSize: "0.5938rem", letterSpacing: ".8px", color: "#7b818c", fontWeight: 700, marginBottom: 10 },
  lang: { display: "flex", border: "1px solid #ebecef", borderRadius: 10, overflow: "hidden", flex: "0 0 auto" },
  lg: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: "0.6875rem", fontWeight: 700, color: "#7b818c", textDecoration: "none", background: "#fff" },
  lgOn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: "0.6875rem", fontWeight: 700, color: "#fff", textDecoration: "none", background: "#15181d" },
  lgFlag: { display: "inline-flex", width: 15, height: 10.5, borderRadius: 2, overflow: "hidden", boxShadow: "0 0 0 1px rgba(16,20,28,.15)", flex: "0 0 auto" },
  soon: { display: "inline-block", fontSize: "0.6875rem", fontWeight: 700, color: "#15803d", background: "#e9f7ef", border: "1px solid #bfe6cf", borderRadius: 999, padding: "4px 11px", marginBottom: 12 },
  h1: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-.5px", margin: "0 0 8px" },
  lead: { fontSize: "0.875rem", lineHeight: 1.5, color: "#4b5159", margin: "0 0 18px" },
  list: { display: "flex", flexDirection: "column", border: "1px solid #ebecef", borderRadius: 15, overflow: "hidden" },
  item: { padding: "14px 15px", borderBottom: "1px solid #ebecef" },
  itemHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  itemTitle: { fontSize: "0.9063rem", fontWeight: 700 },
  itemLink: { fontSize: "0.7813rem", fontWeight: 700, color: "#15181d", textDecoration: "none" },
  itemSoon: { fontSize: "0.6875rem", fontWeight: 600, color: "#7b818c", background: "#f1f2f4", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" },
  itemDesc: { fontSize: "0.8125rem", lineHeight: 1.45, color: "#7b818c", margin: 0 },
  note: { fontSize: "0.8125rem", lineHeight: 1.5, color: "#4b5159", margin: "18px 0 0" },
  mail: { color: "#15181d", fontWeight: 600 },
  primary: { display: "block", textAlign: "center", marginTop: 16, background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: "0.875rem", fontWeight: 600 },
};
