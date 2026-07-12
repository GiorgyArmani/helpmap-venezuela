import type { Metadata } from "next";
import Link from "next/link";
import type { Lang } from "@/components/helpmap/data";
import { FLAG_ICON } from "@/components/helpmap/icons";
import {
  ROADMAP_PHASES,
  ROADMAP_INTRO,
  ROADMAP_NOW,
  ROADMAP_TITLE,
  PHASE_META,
  PhaseStatus,
  tr,
} from "@/components/helpmap/roadmap";

type SearchParams = { searchParams: Promise<{ lang?: string }> };

const pickLang = (v?: string): Lang => (v === "en" ? "en" : v === "pt" ? "pt" : "es");

const DESC = {
  es: "Roadmap de producto de HelpMap VE: lo que ya funciona y lo que viene, por fases. Listos para lanzar.",
  en: "Product roadmap for HelpMap VE: what already works and what's coming, by phase. Ready to launch.",
  pt: "Roadmap de produto do HelpMap VE: o que já funciona e o que vem a seguir, por fase. Prontos para lançar.",
};
const BACK_APP = { es: "Volver a la app", en: "Back to the app", pt: "Voltar ao app" };
const FEEDBACK = { es: "¿Comentarios o quieres colaborar? ", en: "Feedback or want to collaborate? ", pt: "Comentários ou quer colaborar? " };
const BACK_DOCS = { es: "← Documentación", en: "← Documentation", pt: "← Documentação" };
const GO_MAP = { es: "Ir al mapa", en: "Go to the map", pt: "Ir para o mapa" };

export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const lang = pickLang((await searchParams).lang);
  return {
    title: "Roadmap · HelpMap Venezuela",
    description: DESC[lang],
    alternates: {
      canonical: "/docs/roadmap" + (lang === "es" ? "" : `?lang=${lang}`),
    },
  };
}

const ORDER: PhaseStatus[] = ["done", "current", "next", "later"];

export default async function RoadmapPage({ searchParams }: SearchParams) {
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
            <Link href={`/docs/roadmap${qs("es")}`} style={lang === "es" ? S.lgOn : S.lg} aria-label="Español">
              <span style={S.lgFlag}>{FLAG_ICON.es}</span>ES
            </Link>
            <Link href={`/docs/roadmap${qs("en")}`} style={lang === "en" ? S.lgOn : S.lg} aria-label="English">
              <span style={S.lgFlag}>{FLAG_ICON.en}</span>EN
            </Link>
            <Link href={`/docs/roadmap${qs("pt")}`} style={lang === "pt" ? S.lgOn : S.lg} aria-label="Português">
              <span style={S.lgFlag}>{FLAG_ICON.pt}</span>PT
            </Link>
          </div>
        </nav>

        <div style={S.kicker}>ROADMAP · HELPMAP</div>
        <h1 style={S.h1}>{tr(ROADMAP_TITLE, lang)}</h1>
        <p style={S.lead}>{tr(ROADMAP_INTRO, lang)}</p>

        <div style={S.now}>
          <span style={{ ...S.nowDot, background: PHASE_META.current.dot }} />
          {tr(ROADMAP_NOW, lang)}
        </div>

        <div style={S.legend}>
          {ORDER.map((k) => (
            <span key={k} style={S.legendItem}>
              <span style={{ ...S.legendDot, background: PHASE_META[k].dot }} />
              {tr(PHASE_META[k].label, lang)}
            </span>
          ))}
        </div>

        <div style={S.timeline}>
          {ROADMAP_PHASES.map((p) => {
            const meta = PHASE_META[p.status];
            const isNow = p.status === "current";
            return (
              <div key={p.id} style={{ ...S.phase, ...(isNow ? S.phaseNow : {}) }}>
                <div style={S.phaseHead}>
                  <span style={{ ...S.phaseDot, background: meta.dot }} />
                  <h2 style={S.phaseTitle}>{tr(p.title, lang)}</h2>
                  <span style={{ ...S.phaseTag, color: meta.dot, borderColor: meta.dot }}>
                    {tr(meta.label, lang)}
                  </span>
                </div>
                {p.note && <p style={S.phaseNote}>{tr(p.note, lang)}</p>}
                <ul style={S.items}>
                  {p.items.map((it, n) => (
                    <li key={n} style={S.itemLi}>
                      {tr(it, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p style={S.note}>
          {FEEDBACK[lang]}
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
  h1: { fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-.5px", margin: "0 0 10px" },
  lead: { fontSize: "0.8438rem", lineHeight: 1.55, color: "#4b5159", margin: "0 0 14px" },
  now: { display: "flex", alignItems: "center", gap: 8, fontSize: "0.8125rem", fontWeight: 700, color: "#16191f", background: "#eef4ff", border: "1px solid #cfe0ff", borderRadius: 12, padding: "11px 13px", marginBottom: 18 },
  nowDot: { width: 9, height: 9, borderRadius: "50%", flex: "0 0 auto" },
  legend: { display: "flex", flexWrap: "wrap", gap: 12, padding: 12, background: "#f7f8f9", border: "1px solid #ebecef", borderRadius: 12, marginBottom: 22 },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.7188rem", fontWeight: 600, color: "#4b5159" },
  legendDot: { width: 8, height: 8, borderRadius: "50%", flex: "0 0 auto" },
  timeline: { display: "flex", flexDirection: "column", gap: 14 },
  phase: { border: "1px solid #ebecef", borderRadius: 15, padding: "16px 16px 6px" },
  phaseNow: { borderColor: "#2563eb", boxShadow: "0 0 0 3px rgba(37,99,235,.10)" },
  phaseHead: { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 6 },
  phaseDot: { width: 10, height: 10, borderRadius: "50%", flex: "0 0 auto" },
  phaseTitle: { fontSize: "0.9688rem", fontWeight: 700, margin: 0, letterSpacing: "-.3px" },
  phaseTag: { fontSize: "0.6875rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "1px solid", marginLeft: "auto" },
  phaseNote: { fontSize: "0.7813rem", fontWeight: 700, color: "#2563eb", margin: "0 0 6px" },
  items: { margin: "4px 0 10px", paddingLeft: 18 },
  itemLi: { fontSize: "0.8125rem", lineHeight: 1.5, color: "#4b5159", marginBottom: 6 },
  note: { fontSize: "0.8125rem", lineHeight: 1.5, color: "#4b5159", margin: "18px 0 0" },
  mail: { color: "#15181d", fontWeight: 600 },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 },
  secondary: { flex: 1, textAlign: "center", background: "#fff", color: "#16191f", border: "1px solid #ebecef", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: "0.875rem", fontWeight: 600 },
  primary: { flex: 1, textAlign: "center", background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: "0.875rem", fontWeight: 600 },
};
