import { ImageResponse } from "next/og";
import { AYUDA_META, STATE_LABEL, TYPE_META, type LocationType } from "@/components/helpmap/data";
import { ayudaKeys } from "@/components/helpmap/helpers";
import { fetchCenter } from "./fetchCenter";

export const alt = "HelpMap Venezuela";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TYPE_COLOR: Record<LocationType, string> = {
  hospital: "#EF4444",
  shelter: "#F59E0B",
  morgue: "#B9BFC9",
  donation_centre: "#A78BFA",
  comedor: "#2DD4BF",
  iniciativa: "#EC4899",
};

// Link-preview card for a help point (refugio/acopio). Shows the public need info so
// pasting the link into WhatsApp/Telegram renders a HelpMap card (CLAUDE.md §5).
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchCenter(id);

  const loc = data?.loc ?? null;
  const ref = data?.ref ?? null;
  const accent = loc ? TYPE_COLOR[loc.type] : "#F59E0B";
  const name = loc ? loc.canonical_name : "HelpMap Venezuela";
  const typeLabel = loc ? TYPE_META[loc.type].es.toUpperCase() : "PUNTO DE AYUDA";
  const place = loc ? [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ") : "Mapa de emergencia humanitario";
  // A civic initiative usually states no "necesita" — the ways to help ARE the ask.
  const need = ((ref?.necesita || "").trim() || ayudaKeys(ref?.ayuda).map((k) => AYUDA_META[k].es).join(" · ")).slice(0, 120);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#15181d",
          color: "#fff",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, color: "#cfd3d8", letterSpacing: 1 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: accent, display: "flex" }} />
          {typeLabel} · HELPMAP VENEZUELA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.03, letterSpacing: -1 }}>{name}</div>
          <div style={{ fontSize: 30, color: "#a7adb6", display: "flex" }}>{place}</div>
          {need ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, color: "#fff" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: accent, display: "flex" }}>NECESITA:</div>
              {need}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 22, color: "#9aa3af", maxWidth: 1000, lineHeight: 1.3 }}>
            Datos de refugios/acopios: AcopioVE · CC-BY 4.0
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#7b818c" }}>helpmapvzla.net · Colabora como puedas</div>
        </div>
      </div>
    ),
    size,
  );
}
