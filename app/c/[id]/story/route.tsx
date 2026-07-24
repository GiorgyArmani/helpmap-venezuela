import { ImageResponse } from "next/og";
import { AYUDA_META, STATE_LABEL, TYPE_META, type LocationType } from "@/components/helpmap/data";
import { ayudaKeys } from "@/components/helpmap/helpers";
import { OG_FORMAT, parseOgFormat, trimText } from "@/lib/ogFormat";
import { fetchCenter } from "../fetchCenter";

// Social banner for a help point (refugio / centro de acopio / iniciativa): what it
// RECEIVES and what it NEEDS now, so the need can be shared to socials and people can
// act (CLAUDE.md §5 "visibilizar necesidades", AcopioVE CC-BY attribution).
// Renders in three canvases via `?f=`: story 1080×1920 (default), post 1080×1350
// (4:5 feed), square 1080×1080 — see lib/ogFormat.ts.
// No patient data here — a center is informational (db/refugios.sql).

const INK = "#0B0E13";
const HAIRLINE = "rgba(255,255,255,0.12)";

// Accent per type — hex (Satori/next/og doesn't reliably parse the oklch() values in
// TYPE_META). Kept visually close: refugio=amber, acopio=purple, comedor=teal,
// iniciativa=rosa.
const TYPE_COLOR: Record<LocationType, string> = {
  hospital: "#EF4444",
  shelter: "#F59E0B",
  morgue: "#B9BFC9",
  donation_centre: "#A78BFA",
  comedor: "#2DD4BF",
  iniciativa: "#EC4899",
};

// Operating status pill (AcopioVE's vocabulary). Green when open, amber when full, red
// when closed — the one place in this dark banner where red is warranted.
const ESTADO_TEXT = {
  abierto: { label: "ABIERTO", fg: "#065F46", bg: "#A7F3D0" },
  lleno: { label: "LLENO", fg: "#7C2D12", bg: "#FDE68A" },
  cerrado: { label: "CERRADO", fg: "#7F1D1D", bg: "#FECACA" },
} as const;

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

  const fmt = parseOgFormat(req.url);
  const F = OG_FORMAT[fmt];
  const W = F.w;
  const H = F.h;
  // T scales type/boxes, G scales the vertical rhythm.
  const T = (n: number) => Math.round(n * F.ts);
  const G = (n: number) => Math.round(n * F.gs);

  const { loc, ref } = data;
  const accent = TYPE_COLOR[loc.type];
  const typeLabel = TYPE_META[loc.type].es.toUpperCase();
  const place = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ");

  // Trim to what fits the chosen canvas cleanly (a feed post has ~30% less height).
  // A civic initiative usually states no "necesita" — the ways to help ARE the ask.
  // Operating status + record age. A shared image circulates for days, so a banner that
  // says "necesita agua" for a point that CLOSED is actively harmful — the status rides
  // along with the need (db/refugios_estado.sql).
  const estado = ref?.estado && ref.estado in ESTADO_TEXT ? (ref.estado as keyof typeof ESTADO_TEXT) : null;
  const updIso = ref?.updated_at || ref?.last_confirmed_at || null;
  const updDays = updIso ? Math.max(0, Math.floor((Date.now() - new Date(updIso).getTime()) / 86400000)) : null;
  const updLabel =
    updDays == null ? null : updDays === 0 ? "Actualizado hoy" : updDays === 1 ? "Actualizado hace 1 día" : `Actualizado hace ${updDays} días`;

  const necesita = trimText(
    (ref?.necesita || "").trim() || ayudaKeys(ref?.ayuda).map((k) => AYUDA_META[k].es).join(" · "),
    F.maxNeed
  );
  const recibe = (ref?.recibe || []).slice(0, F.maxRecibe);
  const contact = loc.contact_whatsapp || loc.contact_phone || "";

  const icon = await loadPhoto(new URL(req.url).origin + "/ico.png");

  const eyebrow = (
    <div style={{ display: "flex", alignItems: "center", gap: T(18) }}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} width={T(54)} height={T(54)} alt="" style={{ borderRadius: T(15) }} />
      ) : (
        <div
          style={{
            width: T(54),
            height: T(54),
            borderRadius: T(15),
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: INK,
            fontSize: T(30),
            fontWeight: 800,
          }}
        >
          H
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: T(30), fontWeight: 700, letterSpacing: 1, color: "#FFFFFF" }}>HELPMAP VENEZUELA</div>
        <div style={{ fontSize: T(19), letterSpacing: 4, color: "#9AA3AF" }}>PUNTO DE AYUDA</div>
      </div>
    </div>
  );

  const typePill = (
    <div style={{ display: "flex", alignItems: "center", gap: T(20) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: T(16),
          padding: `${T(14)}px ${T(30)}px`,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          border: `2px solid ${accent}`,
          fontSize: T(34),
          fontWeight: 700,
          letterSpacing: 1,
          color: "#FFFFFF",
        }}
      >
        <div style={{ width: T(20), height: T(20), borderRadius: T(10), background: accent, display: "flex" }} />
        {typeLabel}
      </div>
      {estado ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: `${T(12)}px ${T(26)}px`,
            borderRadius: 999,
            background: ESTADO_TEXT[estado].bg,
            color: ESTADO_TEXT[estado].fg,
            fontSize: T(30),
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          {ESTADO_TEXT[estado].label}
        </div>
      ) : null}
      {ref?.es_animal ? (
        <div style={{ display: "flex", alignItems: "center", fontSize: T(28), fontWeight: 600, color: "#9AA3AF" }}>
          🐾 Refugio animal
        </div>
      ) : null}
    </div>
  );

  const identity = (
    <div style={{ display: "flex", alignItems: "stretch", gap: T(26) }}>
      <div style={{ width: T(8), borderRadius: T(8), background: accent, display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: G(12) }}>
        <div style={{ fontSize: T(78), fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, color: "#FFFFFF" }}>
          {loc.canonical_name}
        </div>
        {place ? <div style={{ fontSize: T(34), color: "#9AA3AF", display: "flex" }}>📍 {place}</div> : null}
      </div>
    </div>
  );

  const needBlock = necesita ? (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: G(14),
        padding: T(34),
        borderRadius: T(26),
        background: "rgba(245,158,11,0.10)",
        border: `1px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: T(26), letterSpacing: 3, fontWeight: 700, color: accent, display: "flex" }}>NECESITA AHORA</div>
      <div style={{ fontSize: T(44), fontWeight: 600, lineHeight: 1.25, color: "#FFFFFF", display: "flex" }}>{necesita}</div>
    </div>
  ) : null;

  const receiveBlock = recibe.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: G(16) }}>
      <div style={{ fontSize: T(24), letterSpacing: 3, fontWeight: 700, color: "#9AA3AF", display: "flex" }}>RECIBE DONACIONES DE</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: T(14) }}>
        {recibe.map((x, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              padding: `${T(12)}px ${T(24)}px`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${HAIRLINE}`,
              fontSize: T(30),
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
    <div style={{ display: "flex", flexDirection: "column", gap: G(10) }}>
      {ref?.horario ? <div style={{ fontSize: T(28), color: "#C9D0D9", display: "flex" }}>🕒 {ref.horario}</div> : null}
      {contact ? <div style={{ fontSize: T(28), color: "#C9D0D9", display: "flex" }}>📞 {contact}</div> : null}
    </div>
  ) : null;

  const footer = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 1, background: HAIRLINE, marginBottom: G(26) }} />
      {/* When the data is from — the reader of a shared post has no other way to judge
          whether it still holds (AcopioVE prints the same on its cards). */}
      {updLabel ? (
        <div style={{ fontSize: T(24), color: updDays != null && updDays >= 10 ? "#F59E0B" : "#9AA3AF", display: "flex", marginBottom: G(14), fontWeight: 600 }}>
          {updLabel}
        </div>
      ) : null}
      <div style={{ fontSize: T(22), color: "#6B7280", display: "flex", marginBottom: G(24), maxWidth: 900, lineHeight: 1.3 }}>
        Datos de refugios/acopios: AcopioVE (acopiove.org) · CC-BY 4.0
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: G(8) }}>
          <div style={{ fontSize: T(24), letterSpacing: 3, color: "#9AA3AF" }}>COLABORA COMO PUEDAS</div>
          <div style={{ fontSize: T(52), fontWeight: 800, color: "#FFFFFF", letterSpacing: -1 }}>helpmapvzla.net</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: T(24), fontWeight: 700, color: "#9AA3AF", display: "flex" }}>@helpmapvzla</div>
          <div style={{ fontSize: T(22), color: "#6B7280", display: "flex" }}>Mapa humanitario</div>
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
        padding: F.pad,
        background: "linear-gradient(160deg, #161C26 0%, #0B0E13 62%)",
        fontFamily: "sans-serif",
      }}
    >
      {eyebrow}
      <div style={{ display: "flex", flexDirection: "column", gap: G(40) }}>
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
