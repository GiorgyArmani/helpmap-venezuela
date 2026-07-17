"use client";

import { useState } from "react";
import Link from "next/link";
import {
  centerUrl,
  copyText,
  mapsDirectionsUrl,
  nativeShare,
  openShare,
  shareCenterStoryImage,
  telegramUrl,
  whatsappUrl,
} from "@/components/helpmap/share";

export default function CenterActions({
  id,
  name,
  typeLabel,
  place,
  need,
  lat,
  lng,
  whatsapp,
  phone,
}: {
  id: string;
  name: string;
  typeLabel: string;
  place: string;
  need: string | null;
  lat: number;
  lng: number;
  whatsapp: string | null;
  phone: string | null;
}) {
  const [toast, setToast] = useState("");
  const [building, setBuilding] = useState(false);
  const url = centerUrl(id);
  // The need is the message — links to the shareable center page (renders an OG card).
  const text =
    `🆘 ${name}${place ? " · " + place : ""} (${typeLabel}) necesita ayuda` +
    (need ? `:\n${need}` : "") +
    `\nColabora como puedas, donde puedas · HelpMap VE`;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };

  const share = async () => {
    const touchDevice =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 0);
    if (touchDevice) {
      const ok = await nativeShare({ title: name, text, url });
      if (ok) return;
    }
    const copied = await copyText(`${text}\n${url}`);
    flash(copied ? "Enlace copiado" : "No se pudo copiar");
  };

  const shareStory = async () => {
    if (building) return;
    setBuilding(true);
    const r = await shareCenterStoryImage(id, name);
    if (r === "shared") flash("Comparte la imagen en tu historia y agrega el sticker de enlace.");
    else if (r === "downloaded") flash("Abrimos la imagen en otra pestaña: guárdala y súbela a tu historia.");
    else flash("No se pudo crear la imagen. Intenta de nuevo.");
    setBuilding(false);
  };

  const waDigits = whatsapp ? whatsapp.replace(/[^0-9]/g, "") : "";

  return (
    <div style={S.box}>
      {/* Direct contact FIRST — the whole point of a shared center card is to move
          people from "reading the need" to "helping this place directly" (calling /
          messaging the person on the ground). Prominent, not buried under sharing. */}
      {(waDigits || phone) && (
        <div style={S.contact}>
          <div style={S.contactLabel}>CONTACTAR DIRECTAMENTE</div>
          {waDigits && (
            <a
              style={{ ...S.btn, ...S.wa }}
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              💬 Escribir por WhatsApp
            </a>
          )}
          {phone && (
            <a style={{ ...S.btn, ...S.call, marginTop: waDigits ? 10 : 0 }} href={`tel:${phone}`}>
              📞 Llamar{phone.trim() ? ` · ${phone.trim()}` : ""}
            </a>
          )}
        </div>
      )}
      <button style={{ ...S.btn, ...S.primary }} onClick={share}>
        Compartir necesidad
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
      <a style={{ ...S.btn, ...S.directions }} href={mapsDirectionsUrl(lat, lng)} target="_blank" rel="noopener noreferrer">
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
  contact: { border: "1px solid #cdeedd", background: "#f4fbf7", borderRadius: 15, padding: 14, marginBottom: 12 },
  contactLabel: { fontSize: 10.5, letterSpacing: ".8px", fontWeight: 700, color: "#12855a", marginBottom: 10 },
  wa: { display: "block", textAlign: "center", textDecoration: "none", background: "#25d366", color: "#fff" },
  call: { display: "block", textAlign: "center", textDecoration: "none", background: "#fff", color: "#12855a", border: "1px solid #25d366" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 },
  t: { display: "flex", alignItems: "center", gap: 10, border: "1px solid #ebecef", borderRadius: 13, padding: 13, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff", color: "#16191f", fontFamily: "inherit" },
  ti: { width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flex: "0 0 auto" },
  back: { display: "block", width: "100%", textAlign: "center", marginTop: 16, fontSize: 13, color: "#7b818c", textDecoration: "none" },
  toast: { position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)", background: "#15181d", color: "#fff", fontSize: 13, fontWeight: 600, padding: "12px 18px", borderRadius: 12, boxShadow: "0 8px 26px rgba(16,20,28,.34)", zIndex: 50, maxWidth: "calc(100vw - 28px)", textAlign: "center", lineHeight: 1.35 },
};
