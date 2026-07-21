import type { Metadata } from "next";
import Link from "next/link";
import type { Lang } from "@/components/helpmap/data";
import { DocTopbar } from "../DocTopbar";
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
const DOCS_LABEL = { es: "Documentación", en: "Documentation", pt: "Documentação" };

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
    <div className="doc-wrap">
      <DocTopbar lang={lang} base="/docs/roadmap" backLabel={BACK_APP[lang]} docsLabel={DOCS_LABEL[lang]} />
      <div className="doc-content">
        <div className="doc-card">
          <div className="doc-kicker">ROADMAP · HELPMAP</div>
        <h1 className="doc-h1">{tr(ROADMAP_TITLE, lang)}</h1>
        <p className="doc-lead">{tr(ROADMAP_INTRO, lang)}</p>

        <div className="doc-now">
          <span className="doc-now-dot" style={{ background: PHASE_META.current.dot }} />
          {tr(ROADMAP_NOW, lang)}
        </div>

        <div className="doc-legend">
          {ORDER.map((k) => (
            <span key={k} className="doc-legend-item">
              <span className="doc-legend-dot" style={{ background: PHASE_META[k].dot }} />
              {tr(PHASE_META[k].label, lang)}
            </span>
          ))}
        </div>

        <div className="doc-timeline">
          {ROADMAP_PHASES.map((p) => {
            const meta = PHASE_META[p.status];
            const isNow = p.status === "current";
            return (
              <div key={p.id} className={"doc-phase" + (isNow ? " doc-phase-now" : "")}>
                <div className="doc-phase-head">
                  <span className="doc-phase-dot" style={{ background: meta.dot }} />
                  <h2 className="doc-phase-title">{tr(p.title, lang)}</h2>
                  <span className="doc-phase-tag" style={{ color: meta.dot, borderColor: meta.dot }}>
                    {tr(meta.label, lang)}
                  </span>
                </div>
                {p.note && <p className="doc-phase-note">{tr(p.note, lang)}</p>}
                <ul className="doc-phase-items">
                  {p.items.map((it, n) => (
                    <li key={n} className="doc-phase-li">
                      {tr(it, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="doc-note">
          {FEEDBACK[lang]}
          <a href="mailto:info@helpmapvzla.net" className="doc-mail">
            info@helpmapvzla.net
          </a>
        </p>

          <div className="doc-actions">
            <Link href={docsHref} className="doc-secondary">
              {BACK_DOCS[lang]}
            </Link>
            <Link href="/" className="doc-primary">
              {GO_MAP[lang]}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
