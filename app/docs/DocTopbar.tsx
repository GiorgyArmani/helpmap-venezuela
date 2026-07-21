// Full-width sticky top bar shared by every /docs page: back-to-app (left),
// HelpMap brand (centre) and the language toggle (right). Uses the horizontal
// space on desktop instead of cramming the nav inside the narrow content card.
import Link from "next/link";
import type { Lang } from "@/components/helpmap/data";
import { FLAG_ICON } from "@/components/helpmap/icons";

const qs = (l: Lang) => (l === "es" ? "" : `?lang=${l}`);

export function DocTopbar({
  lang,
  base,
  backLabel,
  docsLabel,
}: {
  lang: Lang;
  base: string; // path the language toggle points at (this page), e.g. "/docs" or "/docs/roadmap"
  backLabel: string;
  docsLabel: string;
}) {
  return (
    <header className="doc-topbar">
      <Link href="/" className="doc-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {backLabel}
      </Link>
      <Link href={`/docs${qs(lang)}`} className="doc-brand" aria-label={`HelpMap · ${docsLabel}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ico.png" alt="HelpMap" />
        <span>
          <span className="doc-brand-name">HelpMap</span> <span className="doc-brand-sub">· {docsLabel}</span>
        </span>
      </Link>
      <div className="doc-langs">
        <Link href={`${base}${qs("es")}`} className={lang === "es" ? "doc-lg doc-lg-on" : "doc-lg"} aria-label="Español">
          <span className="doc-flag">{FLAG_ICON.es}</span>ES
        </Link>
        <Link href={`${base}${qs("en")}`} className={lang === "en" ? "doc-lg doc-lg-on" : "doc-lg"} aria-label="English">
          <span className="doc-flag">{FLAG_ICON.en}</span>EN
        </Link>
        <Link href={`${base}${qs("pt")}`} className={lang === "pt" ? "doc-lg doc-lg-on" : "doc-lg"} aria-label="Português">
          <span className="doc-flag">{FLAG_ICON.pt}</span>PT
        </Link>
      </div>
    </header>
  );
}
