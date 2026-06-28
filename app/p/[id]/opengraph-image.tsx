import { ImageResponse } from "next/og";
import { SM, STATE_LABEL } from "@/components/helpmap/data";
import { fetchPatient } from "./fetchPatient";

export const alt = "HelpMap Venezuela";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Neutral, privacy-safe link-preview card. Shows only public fields (name,
// estatus, location) and NEVER a photo — minors/unverified must never leak via
// an OG image (CLAUDE.md §5).
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchPatient(id);

  const name = p ? `${p.nombres} ${p.apellidos}` : "HelpMap Venezuela";
  const status = p ? SM[p.estatus] : null;
  const place = p ? `${p.location_name} · ${STATE_LABEL[p.state]}` : "Mapa de emergencia humanitario";

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
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, color: "#cfd3d8", letterSpacing: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", display: "flex" }} />
          REGISTRO HUMANITARIO · HELPMAP VENEZUELA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
          {status && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, color: "#e7e9ec" }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: status.color, display: "flex" }} />
              {status.es}
            </div>
          )}
          <div style={{ fontSize: 32, color: "#a7adb6" }}>{place}</div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#7b818c" }}>
          helpmap.ve — Caracas · La Guaira · Miranda
        </div>
      </div>
    ),
    size,
  );
}
