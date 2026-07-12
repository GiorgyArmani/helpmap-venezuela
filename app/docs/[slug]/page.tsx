import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Lang } from "@/components/helpmap/data";
import { FLAG_ICON } from "@/components/helpmap/icons";
import { tr } from "@/components/helpmap/roadmap";
import { DOCS, getDoc } from "@/components/helpmap/docs-content";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

const pickLang = (v?: string): Lang => (v === "en" ? "en" : v === "pt" ? "pt" : "es");

const KICKER = { es: "DOCUMENTACIÓN · HELPMAP", en: "DOCUMENTATION · HELPMAP", pt: "DOCUMENTAÇÃO · HELPMAP" };
const BACK_APP = { es: "Volver a la app", en: "Back to the app", pt: "Voltar ao app" };
const NEED_HELP = { es: "¿Necesitas algo o quieres colaborar? ", en: "Need something or want to collaborate? ", pt: "Precisa de algo ou quer colaborar? " };
const BACK_DOCS = { es: "← Documentación", en: "← Documentation", pt: "← Documentação" };
const GO_MAP = { es: "Ir al mapa", en: "Go to the map", pt: "Ir para o mapa" };

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: "HelpMap Venezuela" };
  const lang = pickLang((await searchParams).lang);
  return {
    title: `${tr(doc.title, lang)} · HelpMap Venezuela`,
    description: tr(doc.intro, lang),
    alternates: {
      canonical: `/docs/${slug}` + (lang === "es" ? "" : `?lang=${lang}`),
    },
  };
}

export default async function DocPage({ params, searchParams }: Props) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();
  const lang = pickLang((await searchParams).lang);
  const qs = (l: Lang) => (l === "es" ? "" : `?lang=${l}`);
  const docsHref = `/docs${qs(lang)}`;

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        {/* Nav back to the app + language toggle */}
        <nav style={S.nav}>
          <Link href="/" style={S.back}>
            ← {BACK_APP[lang]}
          </Link>
          <div style={S.lang}>
            <Link href={`/docs/${doc.slug}${qs("es")}`} style={lang === "es" ? S.lgOn : S.lg} aria-label="Español">
              <span style={S.lgFlag}>{FLAG_ICON.es}</span>ES
            </Link>
            <Link href={`/docs/${doc.slug}${qs("en")}`} style={lang === "en" ? S.lgOn : S.lg} aria-label="English">
              <span style={S.lgFlag}>{FLAG_ICON.en}</span>EN
            </Link>
            <Link href={`/docs/${doc.slug}${qs("pt")}`} style={lang === "pt" ? S.lgOn : S.lg} aria-label="Português">
              <span style={S.lgFlag}>{FLAG_ICON.pt}</span>PT
            </Link>
          </div>
        </nav>

        <div style={S.kicker}>{KICKER[lang]}</div>
        <h1 style={S.h1}>{tr(doc.title, lang)}</h1>
        <p style={S.lead}>{tr(doc.intro, lang)}</p>

        {doc.sections.map((sec, i) => (
          <section key={i} style={S.section}>
            <h2 style={S.h2}>{tr(sec.heading, lang)}</h2>
            {sec.blocks.map((b, n) => (
              <div key={n} style={S.block}>
                {b.label && <span style={S.blockLabel}>{tr(b.label, lang)}: </span>}
                {b.text && <span style={S.blockText}>{tr(b.text, lang)}</span>}
                {b.bullets && (
                  <ul style={S.bullets}>
                    {b.bullets.map((li, m) => (
                      <li key={m} style={S.bullet}>
                        {tr(li, lang)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}

        <p style={S.note}>
          {NEED_HELP[lang]}
          <a href="mailto:info@helpmapvzla.net" style={S.mail}>
            info@helpmapvzla.net
          </a>
        </p>

        <div style={S.actions}>
          <Link href={docsHref} style={S.secondary}>
            {BACK_DOCS[lang]}
          </Link>
          <Link href="/" style={S.primary}>
            {GO_MAP[lang]}
          </Link>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", color: "#16191f" },
  card: { width: "100%", maxWidth: 640, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 24, boxShadow: "0 10px 34px rgba(16,20,28,.10)", margin: "24px 0" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #ebecef" },
  back: { fontSize: "0.8125rem", fontWeight: 600, color: "#16191f", textDecoration: "none" },
  lang: { display: "flex", border: "1px solid #ebecef", borderRadius: 10, overflow: "hidden", flex: "0 0 auto" },
  lg: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: "0.6875rem", fontWeight: 700, color: "#7b818c", textDecoration: "none", background: "#fff" },
  lgOn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: "0.6875rem", fontWeight: 700, color: "#fff", textDecoration: "none", background: "#15181d" },
  lgFlag: { display: "inline-flex", width: 15, height: 10.5, borderRadius: 2, overflow: "hidden", boxShadow: "0 0 0 1px rgba(16,20,28,.15)", flex: "0 0 auto" },
  kicker: { fontSize: "0.5938rem", letterSpacing: ".8px", color: "#7b818c", fontWeight: 700, marginBottom: 10 },
  h1: { fontSize: "1.5625rem", fontWeight: 700, letterSpacing: "-.5px", margin: "0 0 10px" },
  lead: { fontSize: "0.875rem", lineHeight: 1.55, color: "#4b5159", margin: "0 0 18px" },
  section: { marginBottom: 20 },
  h2: { fontSize: "0.9688rem", fontWeight: 700, letterSpacing: "-.3px", margin: "0 0 8px", paddingBottom: 7, borderBottom: "1px solid #ebecef" },
  block: { marginBottom: 8 },
  blockLabel: { fontSize: "0.8438rem", fontWeight: 700, color: "#16191f" },
  blockText: { fontSize: "0.8438rem", lineHeight: 1.55, color: "#4b5159" },
  bullets: { margin: "2px 0 0", paddingLeft: 18 },
  bullet: { fontSize: "0.8438rem", lineHeight: 1.5, color: "#4b5159", marginBottom: 5 },
  note: { fontSize: "0.8125rem", lineHeight: 1.5, color: "#4b5159", margin: "20px 0 0" },
  mail: { color: "#15181d", fontWeight: 600 },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 },
  secondary: { flex: 1, textAlign: "center", background: "#fff", color: "#16191f", border: "1px solid #ebecef", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: "0.875rem", fontWeight: 600 },
  primary: { flex: 1, textAlign: "center", background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: "0.875rem", fontWeight: 600 },
};
