import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Lang } from "@/components/helpmap/data";
import { tr } from "@/components/helpmap/roadmap";
import { DOCS, getDoc } from "@/components/helpmap/docs-content";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

const pickLang = (v?: string): Lang => (v === "en" ? "en" : "es");

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const doc = getDoc((await params).slug);
  if (!doc) return { title: "HelpMap Venezuela" };
  const lang = pickLang((await searchParams).lang);
  return {
    title: `${tr(doc.title, lang)} · HelpMap Venezuela`,
    description: tr(doc.intro, lang),
  };
}

export default async function DocPage({ params, searchParams }: Props) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();
  const lang = pickLang((await searchParams).lang);
  const qs = (l: Lang) => (l === "en" ? "?lang=en" : "");
  const docsHref = lang === "en" ? "/docs?lang=en" : "/docs";

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        {/* Nav back to the app + language toggle */}
        <nav style={S.nav}>
          <Link href="/" style={S.back}>
            ← {lang === "en" ? "Back to the app" : "Volver a la app"}
          </Link>
          <div style={S.lang}>
            <Link href={`/docs/${doc.slug}${qs("es")}`} style={lang === "es" ? S.lgOn : S.lg} aria-label="Español">
              ES
            </Link>
            <Link href={`/docs/${doc.slug}${qs("en")}`} style={lang === "en" ? S.lgOn : S.lg} aria-label="English">
              EN
            </Link>
          </div>
        </nav>

        <div style={S.kicker}>{lang === "en" ? "DOCUMENTATION · HELPMAP" : "DOCUMENTACIÓN · HELPMAP"}</div>
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
          {lang === "en" ? "Need something or want to collaborate? " : "¿Necesitas algo o quieres colaborar? "}
          <a href="mailto:info@helpmapvzla.net" style={S.mail}>
            info@helpmapvzla.net
          </a>
        </p>

        <div style={S.actions}>
          <Link href={docsHref} style={S.secondary}>
            {lang === "en" ? "← Documentation" : "← Documentación"}
          </Link>
          <Link href="/" style={S.primary}>
            {lang === "en" ? "Go to the map" : "Ir al mapa"}
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
  back: { fontSize: 13, fontWeight: 600, color: "#16191f", textDecoration: "none" },
  lang: { display: "flex", border: "1px solid #ebecef", borderRadius: 10, overflow: "hidden", flex: "0 0 auto" },
  lg: { padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#7b818c", textDecoration: "none", background: "#fff" },
  lgOn: { padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#fff", textDecoration: "none", background: "#15181d" },
  kicker: { fontSize: 9.5, letterSpacing: ".8px", color: "#7b818c", fontWeight: 700, marginBottom: 10 },
  h1: { fontSize: 25, fontWeight: 700, letterSpacing: "-.5px", margin: "0 0 10px" },
  lead: { fontSize: 14, lineHeight: 1.55, color: "#4b5159", margin: "0 0 18px" },
  section: { marginBottom: 20 },
  h2: { fontSize: 15.5, fontWeight: 700, letterSpacing: "-.3px", margin: "0 0 8px", paddingBottom: 7, borderBottom: "1px solid #ebecef" },
  block: { marginBottom: 8 },
  blockLabel: { fontSize: 13.5, fontWeight: 700, color: "#16191f" },
  blockText: { fontSize: 13.5, lineHeight: 1.55, color: "#4b5159" },
  bullets: { margin: "2px 0 0", paddingLeft: 18 },
  bullet: { fontSize: 13.5, lineHeight: 1.5, color: "#4b5159", marginBottom: 5 },
  note: { fontSize: 13, lineHeight: 1.5, color: "#4b5159", margin: "20px 0 0" },
  mail: { color: "#15181d", fontWeight: 600 },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 },
  secondary: { flex: 1, textAlign: "center", background: "#fff", color: "#16191f", border: "1px solid #ebecef", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600 },
  primary: { flex: 1, textAlign: "center", background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600 },
};
