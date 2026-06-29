"use client";

import { useState } from "react";
import Link from "next/link";
import {
  copyText,
  mapsDirectionsUrl,
  nativeShare,
  openShare,
  patientUrl,
  shareStoryImage,
  shareText,
  telegramUrl,
  whatsappUrl,
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
  const [building, setBuilding] = useState(false);
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

  // Generates the 1080×1920 story banner server-side, then opens the native
  // share sheet (picks Instagram → "Historia") or downloads it as fallback.
  const shareStory = async () => {
    if (building) return;
    setBuilding(true);
    const r = await shareStoryImage(id, name);
    if (r === "shared") flash("Comparte la imagen en tu historia y agrega el sticker de enlace.");
    else if (r === "downloaded") flash("Abrimos la imagen en otra pestaña: guárdala y súbela a tu historia.");
    else flash("No se pudo crear la imagen. Intenta de nuevo.");
    setBuilding(false);
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
        <button style={S.t} onClick={shareStory} disabled={building}>
          <span style={{ ...S.ti, background: "#e1306c" }}>IG</span>
          {building ? "Creando…" : "Historia IG"}
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
  back: { display: "block", width: "100%", textAlign: "center", marginTop: 16, fontSize: 13, color: "#7b818c", textDecoration: "none" },
  toast: { position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", background: "#15181d", color: "#fff", fontSize: 13, fontWeight: 600, padding: "12px 18px", borderRadius: 12, boxShadow: "0 8px 26px rgba(16,20,28,.34)", zIndex: 50, maxWidth: "calc(100vw - 28px)", textAlign: "center", lineHeight: 1.35 },
};
