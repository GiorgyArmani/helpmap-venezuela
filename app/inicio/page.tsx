import type { Metadata } from "next";
import Link from "next/link";

// QR landing gate. People arrive here from the printed QR (helpmapvzla.net/inicio) and
// pick one of two paths: search for a relative (→ the map app) or help others (→ the
// registration/"ayudar" panel, opened via the ?ayuda=1 deep-link in HelpMap).
// Server component on purpose: two links, no client JS — fast on flaky 3G.

export const metadata: Metadata = {
  title: "HelpMap Venezuela — ¿Cómo podemos ayudarte?",
  description:
    "Busca a un familiar en un hospital o refugio tras el terremoto, o ayuda a otras familias a reunirse.",
  alternates: { canonical: "/inicio" },
};

export default function InicioPage() {
  return (
    <main style={S.wrap}>
      <div style={S.card}>
        <header style={S.head}>
          <span style={S.logo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ico.png" alt="HelpMap Venezuela" style={S.logoImg} />
          </span>
          <div style={S.brand}>helpmapvzla.net</div>
          <h1 style={S.h1}>
            ¿Cómo podemos <span style={S.accent}>ayudarte</span>?
          </h1>
          <p style={S.sub}>
            Tras el terremoto en Caracas, La Guaira, Miranda y Yaracuy. Elige una opción para continuar.
          </p>
        </header>

        <nav style={S.opts}>
          {/* Priority path: a frightened family searching for someone. */}
          <Link href="/" style={{ ...S.opt, ...S.optSearch }}>
            <span style={S.optIco} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <span style={S.optText}>
              <span style={S.optTitle}>Buscar a un familiar</span>
              <span style={S.optDesc}>En un hospital o refugio tras el terremoto</span>
            </span>
            <span style={S.optArrow} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>

          {/* Help path: opens the "ayudar" (registration) panel inside the app. */}
          <Link href="/?ayuda=1" style={{ ...S.opt, ...S.optHelp }}>
            <span style={{ ...S.optIco, ...S.optIcoHelp }} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
                <path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2 5 5.3 5c2 0 3.4 1.2 4.2 2.4C10.3 6.2 11.7 5 13.7 5 17 5 18.5 8.4 17 11.7 14.5 16.4 12 21 12 21z" />
              </svg>
            </span>
            <span style={S.optText}>
              <span style={S.optTitle}>Quiero ayudar</span>
              <span style={S.optDesc}>Ayuda a otras familias a encontrar a los suyos</span>
            </span>
            <span style={S.optArrow} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </nav>

        <footer style={S.foot}>
          <span style={S.footText}>Un esfuerzo ciudadano · tropicalsadness × imagenesnacionales</span>
        </footer>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "radial-gradient(120% 90% at 50% 0%, #232a3a 0%, #171b24 55%, #12151c 100%)",
    fontFamily: "var(--font-geist-sans),'Helvetica Neue',Helvetica,Arial,sans-serif",
  },
  card: { width: "100%", maxWidth: 440 },
  head: { textAlign: "center", marginBottom: 26 },
  logo: {
    display: "inline-flex",
    width: 76,
    height: 76,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    boxShadow: "0 12px 34px rgba(0,0,0,.4)",
    outline: "1px solid rgba(255,255,255,.08)",
    outlineOffset: -1,
  },
  logoImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  brand: {
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: ".4px",
    color: "#8b93a7",
    marginBottom: 16,
  },
  h1: {
    fontSize: 30,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-.5px",
    color: "#fff",
    margin: "0 0 10px",
  },
  accent: { color: "#ffce33" },
  sub: { fontSize: 14.5, lineHeight: 1.5, color: "#b7bED0", margin: 0 },
  opts: { display: "flex", flexDirection: "column", gap: 14 },
  opt: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    padding: "18px 18px",
    borderRadius: 18,
    textDecoration: "none",
    transition: "transform .12s ease",
    boxShadow: "0 10px 30px rgba(0,0,0,.28)",
  },
  optSearch: { background: "#ffffff", color: "#16191f", border: "1px solid #ffffff" },
  optHelp: {
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    border: "1px solid rgba(255,206,51,.55)",
  },
  optIco: {
    flex: "0 0 auto",
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef1f6",
    color: "#16191f",
  },
  optIcoHelp: { background: "rgba(255,206,51,.16)", color: "#ffce33" },
  optText: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: "1 1 auto" },
  optTitle: { fontSize: 17, fontWeight: 700, letterSpacing: "-.2px" },
  optDesc: { fontSize: 12.5, lineHeight: 1.35, opacity: 0.72 },
  optArrow: { flex: "0 0 auto", opacity: 0.55 },
  foot: {
    marginTop: 28,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  footText: { fontSize: 11.5, color: "#7b8398", textAlign: "center", letterSpacing: ".2px" },
};
