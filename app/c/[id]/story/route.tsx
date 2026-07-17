import { ImageResponse } from "next/og";
import { STATE_LABEL, TYPE_META, type LocationType } from "@/components/helpmap/data";
import { fetchCenter } from "../fetchCenter";

// Instagram story banner (1080×1920) for a help point (refugio / centro de acopio):
// what it RECEIVES and what it NEEDS now, so the need can be shared to socials and
// people can act (CLAUDE.md §5 "visibilizar necesidades", AcopioVE CC-BY attribution).
// No patient data here — a center is informational (db/refugios.sql).
const W = 1080;
const H = 1920;

const INK = "#0B0E13";
const HAIRLINE = "rgba(255,255,255,0.12)";

// Accent per type — hex (Satori/next/og doesn't reliably parse the oklch() values in
// TYPE_META). Kept visually close: refugio=amber, acopio=purple, comedor=teal.
const TYPE_COLOR: Record<LocationType, string> = {
  hospital: "#EF4444",
  shelter: "#F59E0B",
  morgue: "#B9BFC9",
  donation_centre: "#A78BFA",
  comedor: "#2DD4BF",
};

async function loadPhoto(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const data = await fetchCenter(id);
  if (!data) return new Response("Not found", { status: 404 });

  const { loc, ref } = data;
  const accent = TYPE_COLOR[loc.type];
  const typeLabel = TYPE_META[loc.type].es.toUpperCase();
  const place = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ");

  // Trim to what fits a story cleanly.
  const necesita = (ref?.necesita || "").trim().slice(0, 220);
  const recibe = (ref?.recibe || []).slice(0, 6);
  const contact = loc.contact_whatsapp || loc.contact_phone || "";

  const icon = await loadPhoto(new URL(req.url).origin + "/ico.png");

  const eyebrow = (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} width={54} height={54} alt="" style={{ borderRadius: 15 }} />
      ) : (
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: INK,
            fontSize: 30,
            fontWeight: 800,
          }}
        >
          H
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 1, color: "#FFFFFF" }}>HELPMAP VENEZUELA</div>
        <div style={{ fontSize: 19, letterSpacing: 4, color: "#9AA3AF" }}>PUNTO DE AYUDA</div>
      </div>
    </div>
  );

  const typePill = (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 30px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          border: `2px solid ${accent}`,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 1,
          color: "#FFFFFF",
        }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 10, background: accent, display: "flex" }} />
        {typeLabel}
      </div>
      {ref?.es_animal ? (
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 600, color: "#9AA3AF" }}>
          🐾 Refugio animal
        </div>
      ) : null}
    </div>
  );

  const identity = (
    <div style={{ display: "flex", alignItems: "stretch", gap: 26 }}>
      <div style={{ width: 8, borderRadius: 8, background: accent, display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: "#FFFFFF" }}>
          {loc.canonical_name}
        </div>
        {place ? <div style={{ fontSize: 34, color: "#9AA3AF", display: "flex" }}>📍 {place}</div> : null}
      </div>
    </div>
  );

  const needBlock = necesita ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 34,
        borderRadius: 26,
        background: "rgba(245,158,11,0.10)",
        border: `1px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 26, letterSpacing: 3, fontWeight: 700, color: accent, display: "flex" }}>NECESITA AHORA</div>
      <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.25, color: "#FFFFFF", display: "flex" }}>{necesita}</div>
    </div>
  ) : null;

  const receiveBlock = recibe.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 24, letterSpacing: 3, fontWeight: 700, color: "#9AA3AF", display: "flex" }}>RECIBE DONACIONES DE</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {recibe.map((x, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${HAIRLINE}`,
              fontSize: 30,
              fontWeight: 600,
              color: "#E5E8EC",
            }}
          >
            {x.charAt(0).toUpperCase() + x.slice(1)}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const meta = (ref?.horario || contact) ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ref?.horario ? <div style={{ fontSize: 28, color: "#C9D0D9", display: "flex" }}>🕒 {ref.horario}</div> : null}
      {contact ? <div style={{ fontSize: 28, color: "#C9D0D9", display: "flex" }}>📞 {contact}</div> : null}
    </div>
  ) : null;

  const footer = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 1, background: HAIRLINE, marginBottom: 26 }} />
      <div style={{ fontSize: 22, color: "#6B7280", display: "flex", marginBottom: 24, maxWidth: 900, lineHeight: 1.3 }}>
        Datos de refugios/acopios: AcopioVE (acopiove.org) · CC-BY 4.0
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 24, letterSpacing: 3, color: "#9AA3AF" }}>COLABORA COMO PUEDAS</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#FFFFFF", letterSpacing: -1 }}>helpmapvzla.net</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#9AA3AF", display: "flex" }}>@helpmapvzla</div>
          <div style={{ fontSize: 22, color: "#6B7280", display: "flex" }}>Mapa humanitario</div>
        </div>
      </div>
    </div>
  );

  const doc = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(160deg, #161C26 0%, #0B0E13 62%)",
        fontFamily: "sans-serif",
      }}
    >
      {eyebrow}
      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {typePill}
        {identity}
        {needBlock}
        {receiveBlock}
        {meta}
      </div>
      {footer}
    </div>
  );

  return new ImageResponse(doc, { width: W, height: H });
}
