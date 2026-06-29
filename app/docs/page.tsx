import type { Metadata } from "next";
import Link from "next/link";
import type { Lang } from "@/components/helpmap/data";

type SearchParams = { searchParams: Promise<{ lang?: string }> };

const pickLang = (v?: string): Lang => (v === "en" ? "en" : "es");

export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const lang = pickLang((await searchParams).lang);
  return {
    title: lang === "en" ? "Documentation · HelpMap Venezuela" : "Documentación · HelpMap Venezuela",
    description:
      lang === "en"
        ? "HelpMap VE documentation: usage guide, roadmap, privacy and data handling. Coming soon."
        : "Documentación de HelpMap VE: guía de uso, roadmap, privacidad y manejo de datos. Próximamente.",
  };
}

type Lstr = { es: string; en: string };

// Sections we plan to publish. `href` flips an item from "coming soon" to a real link.
const SECTIONS: { title: Lstr; desc: Lstr; href?: string }[] = [
  {
    title: { es: "Guía de uso", en: "Usage guide" },
    desc: {
      es: "Cómo buscar a un familiar, explorar el mapa, subir información y usar la app sin conexión.",
      en: "How to search for a relative, explore the map, upload information and use the app offline.",
    },
    href: "/docs/guia",
  },
  {
    title: { es: "Roadmap", en: "Roadmap" },
    desc: {
      es: "Qué funciones vienen y en qué orden: centros de acopio, actualizaciones de estado, accesibilidad y más.",
      en: "What's coming and in what order: donation centres, status updates, accessibility and more.",
    },
    href: "/docs/roadmap",
  },
  {
    title: { es: "Privacidad y manejo de datos", en: "Privacy & data handling" },
    desc: {
      es: "Qué mostramos y qué no, protección reforzada de menores y cómo verificamos cada registro en campo.",
      en: "What we show and what we don't, reinforced protection of minors, and how we verify each record in the field.",
    },
    href: "/docs/privacidad",
  },
  {
    title: { es: "Para voluntarios", en: "For volunteers" },
    desc: {
      es: "Cómo sumarse, qué perfiles buscamos y cómo cargar listas e información de forma segura.",
      en: "How to join, which profiles we look for, and how to upload lists and information safely.",
    },
    href: "/docs/voluntarios",
  },
  {
    title: { es: "Para prensa y aliados", en: "For press & partners" },
    desc: {
      es: "Qué es HelpMap VE, quién lo construye y cómo citar o colaborar con el proyecto.",
      en: "What HelpMap VE is, who builds it, and how to cite or collaborate with the project.",
    },
    href: "/docs/prensa",
  },
];

export default async function DocsPage({ searchParams }: SearchParams) {
  const lang = pickLang((await searchParams).lang);
  const t = (o: Lstr) => o[lang];
  const qs = (l: Lang) => (l === "en" ? "?lang=en" : "");
  const withLang = (href: string) => (lang === "en" ? `${href}?lang=en` : href);
  const SOON = lang === "en" ? "Coming soon" : "Próximamente";

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        {/* Nav back to the app + language toggle */}
        <nav style={S.nav}>
          <Link href="/" style={S.back}>
            ← {lang === "en" ? "Back to the app" : "Volver a la app"}
          </Link>
          <div style={S.lang}>
            <Link href={`/docs${qs("es")}`} style={lang === "es" ? S.lgOn : S.lg} aria-label="Español">
              ES
            </Link>
            <Link href={`/docs${qs("en")}`} style={lang === "en" ? S.lgOn : S.lg} aria-label="English">
              EN
            </Link>
          </div>
        </nav>

        <div style={S.kicker}>{lang === "en" ? "DOCUMENTATION · HELPMAP" : "DOCUMENTACIÓN · HELPMAP"}</div>
        <h1 style={S.h1}>{lang === "en" ? "Documentation" : "Documentación"}</h1>
        <p style={S.lead}>
          {lang === "en"
            ? "How HelpMap VE works: usage guide, project roadmap, privacy and data handling, and how to volunteer or collaborate."
            : "Cómo funciona HelpMap VE: guía de uso, roadmap del proyecto, privacidad y manejo de datos, y cómo ser voluntario o colaborar."}
        </p>

        <div style={S.list}>
          {SECTIONS.map((s) => (
            <div key={s.title.es} style={S.item}>
              <div style={S.itemHead}>
                <span style={S.itemTitle}>{t(s.title)}</span>
                {s.href ? (
                  <Link href={withLang(s.href)} style={S.itemLink}>
                    {lang === "en" ? "View" : "Ver"}
                  </Link>
                ) : (
                  <span style={S.itemSoon}>{SOON}</span>
                )}
              </div>
              <p style={S.itemDesc}>{t(s.desc)}</p>
            </div>
          ))}
        </div>

        <p style={S.note}>
          {lang === "en" ? "Need something now or want to collaborate? Write to " : "¿Necesitas algo ahora o quieres colaborar? Escríbenos a "}
          <a href="mailto:info@helpmapvzla.net" style={S.mail}>
            info@helpmapvzla.net
          </a>
          .
        </p>

        <Link href="/" style={S.primary}>
          {lang === "en" ? "Go to the map" : "Ir al mapa"}
        </Link>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", color: "#16191f" },
  card: { width: "100%", maxWidth: 520, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 24, boxShadow: "0 10px 34px rgba(16,20,28,.10)", marginTop: 24 },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #ebecef" },
  back: { fontSize: 13, fontWeight: 600, color: "#16191f", textDecoration: "none" },
  kicker: { fontSize: 9.5, letterSpacing: ".8px", color: "#7b818c", fontWeight: 700, marginBottom: 10 },
  lang: { display: "flex", border: "1px solid #ebecef", borderRadius: 10, overflow: "hidden", flex: "0 0 auto" },
  lg: { padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#7b818c", textDecoration: "none", background: "#fff" },
  lgOn: { padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#fff", textDecoration: "none", background: "#15181d" },
  soon: { display: "inline-block", fontSize: 11, fontWeight: 700, color: "#15803d", background: "#e9f7ef", border: "1px solid #bfe6cf", borderRadius: 999, padding: "4px 11px", marginBottom: 12 },
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: "-.5px", margin: "0 0 8px" },
  lead: { fontSize: 14, lineHeight: 1.5, color: "#4b5159", margin: "0 0 18px" },
  list: { display: "flex", flexDirection: "column", border: "1px solid #ebecef", borderRadius: 15, overflow: "hidden" },
  item: { padding: "14px 15px", borderBottom: "1px solid #ebecef" },
  itemHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 },
  itemTitle: { fontSize: 14.5, fontWeight: 700 },
  itemLink: { fontSize: 12.5, fontWeight: 700, color: "#15181d", textDecoration: "none" },
  itemSoon: { fontSize: 11, fontWeight: 600, color: "#7b818c", background: "#f1f2f4", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" },
  itemDesc: { fontSize: 13, lineHeight: 1.45, color: "#7b818c", margin: 0 },
  note: { fontSize: 13, lineHeight: 1.5, color: "#4b5159", margin: "18px 0 0" },
  mail: { color: "#15181d", fontWeight: 600 },
  primary: { display: "block", textAlign: "center", marginTop: 16, background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600 },
};
