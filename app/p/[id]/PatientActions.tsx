"use client";

import { useState } from "react";
import Link from "next/link";
import {
  copyText,
  IG_FORMATS,
  mapsDirectionsUrl,
  nativeShare,
  openShare,
  patientUrl,
  shareStoryImage,
  shareText,
  telegramUrl,
  whatsappUrl,
  type ShareFormat,
} from "@/components/helpmap/share";

export default function PatientActions({
  id,
  name,
  statusLabel,
  locationName,
  lat,
  lng,
}: {
  id: string;
  name: string;
  statusLabel: string;
  locationName: string;
  lat: number;
  lng: number;
}) {
  const [toast, setToast] = useState("");
  const [building, setBuilding] = useState<ShareFormat | null>(null);
  // One "Instagram" button → picks the canvas (story 9:16 / post 4:5 / square 1:1).
  const [igPick, setIgPick] = useState(false);
  const url = patientUrl(id);
  const text = shareText(name, statusLabel, locationName);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };

  const share = async () => {
    // Phones/tablets: native OS share sheet. Desktop: copy the link (the
    // WhatsApp/Telegram/copy buttons are already shown right below, and the
    // OS "Share link" dialog is awkward on desktop).
    const touchDevice =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 0);
    if (touchDevice) {
      const ok = await nativeShare({ title: name, text, url });
      if (ok) return;
    }
    const copied = await copyText(url);
    flash(copied ? "Enlace copiado" : "No se pudo copiar");
  };

  // Generates the banner server-side, then opens the native share sheet (picks
  // Instagram → "Historia"/"Publicación") or downloads it as fallback. Three canvases:
  // 1080×1920 for a story, 1080×1350 (4:5) / 1080×1080 for a feed post — a story image
  // gets cropped in the feed (lib/ogFormat.ts).
  const shareStory = async (fmt: ShareFormat) => {
    if (building) return;
    setIgPick(false);
    setBuilding(fmt);
    const r = await shareStoryImage(id, name, fmt);
    const where = fmt === "story" ? "historia" : "publicación";
    if (r === "shared")
      flash(
        fmt === "story"
          ? "Comparte la imagen en tu historia y agrega el sticker de enlace."
          : "Elige Instagram → Publicación y pega el enlace en la descripción."
      );
    else if (r === "downloaded") flash(`Abrimos la imagen en otra pestaña: guárdala y súbela como ${where}.`);
    else flash("No se pudo crear la imagen. Intenta de nuevo.");
    setBuilding(null);
  };

  return (
    <div style={S.box}>
      <button style={{ ...S.btn, ...S.primary }} onClick={share}>
        Compartir
      </button>
      <div style={S.grid}>
        <button style={S.t} onClick={() => openShare(whatsappUrl(url, text))}>
          <span style={{ ...S.ti, background: "#25d366" }}>WA</span>WhatsApp
        </button>
        <button style={S.t} onClick={() => openShare(telegramUrl(url, text))}>
          <span style={{ ...S.ti, background: "#229ed9" }}>TG</span>Telegram
        </button>
        <button style={S.t} onClick={() => setIgPick((v) => !v)} disabled={!!building} aria-expanded={igPick}>
          <span style={{ ...S.ti, background: "#e1306c" }}>IG</span>
          {building ? "Creando…" : "Instagram"}
        </button>
        <button
          style={S.t}
          onClick={async () => {
            const ok = await copyText(url);
            flash(ok ? "Enlace copiado" : "No se pudo copiar");
          }}
        >
          <span style={{ ...S.ti, background: "#15181d" }}>↗</span>Copiar enlace
        </button>
      </div>
      {igPick && (
        <div style={S.pick}>
          <div style={S.pickLabel}>ELIGE EL FORMATO</div>
          <div style={S.pickRow}>
            {IG_FORMATS.map((f) => (
              <button key={f.fmt} style={S.pickBtn} onClick={() => shareStory(f.fmt)}>
                <span style={{ ...S.pickRatio, width: f.w, height: f.h }} />
                {f.es}
              </button>
            ))}
          </div>
        </div>
      )}
      <a
        style={{ ...S.btn, ...S.directions }}
        href={mapsDirectionsUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
      >
        📍 Cómo llegar
      </a>
      <Link href="/" style={S.back}>
        ← Ver en el mapa
      </Link>
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  box: { marginTop: 18, position: "relative" },
  btn: { width: "100%", borderRadius: 13, padding: 15, fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none" },
  primary: { background: "#15181d", color: "#fff" },
  directions: { display: "block", textAlign: "center", textDecoration: "none", marginTop: 10, background: "#fff", color: "#16191f", border: "1px solid #ebecef" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },
  t: { display: "flex", alignItems: "center", gap: 10, border: "1px solid #ebecef", borderRadius: 13, padding: 13, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff", color: "#16191f", fontFamily: "inherit" },
  ti: { width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flex: "0 0 auto" },
  pick: { marginTop: 10, padding: 12, border: "1px solid #ebecef", borderRadius: 13, background: "#fff" },
  pickLabel: { fontSize: 10.5, letterSpacing: ".6px", fontWeight: 700, color: "#7b818c", marginBottom: 10 },
  pickRow: { display: "flex", gap: 8 },
  pickBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "1px solid #ebecef", borderRadius: 11, padding: "12px 6px", fontSize: 12, fontWeight: 600, background: "#fff", color: "#16191f", cursor: "pointer", fontFamily: "inherit", lineHeight: 1.25, textAlign: "center" },
  pickRatio: { display: "block", borderRadius: 3, background: "linear-gradient(140deg,#e1306c,#f77737)", flex: "0 0 auto" },
  back: { display: "block", width: "100%", textAlign: "center", marginTop: 16, fontSize: 13, color: "#7b818c", textDecoration: "none" },
  toast: { position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", background: "#15181d", color: "#fff", fontSize: 13, fontWeight: 600, padding: "12px 18px", borderRadius: 12, boxShadow: "0 8px 26px rgba(16,20,28,.34)", zIndex: 50, maxWidth: "calc(100vw - 28px)", textAlign: "center", lineHeight: 1.35 },
};
