import { ImageResponse } from "next/og";
import { SM, STATE_LABEL, TYPE_META, type Estatus } from "@/components/helpmap/data";
import { OG_FORMAT, parseOgFormat } from "@/lib/ogFormat";
import { fetchPatient } from "../fetchPatient";

// Social banner the user downloads/shares — the "share to story" flow (Instagram
// has no URL share intent, see CLAUDE.md §5). Renders in three canvases via `?f=`:
// story 1080×1920 (default), post 1080×1350 (4:5 feed), square 1080×1080.
// See lib/ogFormat.ts — the layout is one composition scaled to each ratio.
//
// PRIVACY (CLAUDE.md §2, §5): a photo may appear ONLY for an adult that is
// verified. Minors and unverified records NEVER show a photo. The DB view
// already nulls those, but we re-assert the guard here as a second lock.

const INK = "#0B0E13";
const HAIRLINE = "rgba(255,255,255,0.12)";

// Status accent — the one decisive color moment. FALLECIDO is a soft, respectful
// gray (never red/alarmist), per CLAUDE.md §2.
const ST_COLOR: Record<Estatus, string> = {
  INGRESADO: "#4F9CF9",
  ALTA: "#34D399",
  FALLECIDO: "#B9BFC9",
};

// Pre-fetch the photo into a data URI so we control failures (a broken image
// would otherwise crash the renderer mid-stream).
async function loadPhoto(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, ctx: RouteContext<"/p/[id]/story">) {
  const { id } = await ctx.params;
  const p = await fetchPatient(id);

  if (!p) {
    return new Response("Not found", { status: 404 });
  }

  const fmt = parseOgFormat(req.url);
  const F = OG_FORMAT[fmt];
  const W = F.w;
  const H = F.h;
  // T scales type/boxes, G scales the vertical rhythm.
  const T = (n: number) => Math.round(n * F.ts);
  const G = (n: number) => Math.round(n * F.gs);

  const name = `${p.nombres} ${p.apellidos}`;
  const accent = ST_COLOR[p.estatus];
  const statusLabel = SM[p.estatus].es;
  const initials = ((p.nombres[0] || "") + (p.apellidos[0] || "")).toUpperCase() || "··";
  const typeLabel = TYPE_META[p.location_type].es;
  const sub = `${typeLabel}${p.edad != null ? ` · ${p.edad} años` : ""}`;
  // Single text node — Satori requires divs with >1 child to be display:flex, so
  // we pre-join instead of rendering `{sub} · {STATE_LABEL[...]}` (3 children).
  const placeLine = `${sub} · ${STATE_LABEL[p.state]}`;

  // Second lock: never a photo for a minor or unverified record.
  const canShowPhoto = !p.is_minor && p.verified && !!p.foto_url;
  const photo = canShowPhoto ? await loadPhoto(p.foto_url) : null;

  // Real brand icon (public/ico.png) for the eyebrow — same mark as the app.
  const icon = await loadPhoto(new URL(req.url).origin + "/ico.png");

  // ---- Reusable pieces -----------------------------------------------------

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
        <div style={{ fontSize: T(19), letterSpacing: 4, color: "#9AA3AF" }}>REGISTRO HUMANITARIO</div>
      </div>
    </div>
  );

  const statusPill = (
    <div style={{ display: "flex", alignItems: "center", gap: T(24) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: T(16),
          padding: `${T(14)}px ${T(30)}px`,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          border: `2px solid ${accent}`,
          fontSize: T(36),
          fontWeight: 600,
          color: "#FFFFFF",
        }}
      >
        <div style={{ width: T(20), height: T(20), borderRadius: T(10), background: accent, display: "flex" }} />
        {statusLabel}
      </div>
      {p.verified ? (
        <div style={{ display: "flex", alignItems: "center", gap: T(12), fontSize: T(30), fontWeight: 600, color: "#34D399" }}>
          {/* drawn dot instead of a ✓ glyph — next/og's default font may lack it */}
          <div style={{ width: T(18), height: T(18), borderRadius: T(9), background: "#34D399", display: "flex" }} />
          Verificado
        </div>
      ) : null}
    </div>
  );

  const footer = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 1, background: HAIRLINE, marginBottom: G(26) }} />
      <div style={{ fontSize: T(22), color: "#6B7280", display: "flex", marginBottom: G(24), maxWidth: 900, lineHeight: 1.3 }}>
        Datos confirmados en campo por contactos en centros de salud.
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: G(8) }}>
          <div style={{ fontSize: T(24), letterSpacing: 3, color: "#9AA3AF" }}>BUSCA A TUS SERES QUERIDOS</div>
          <div style={{ fontSize: T(52), fontWeight: 800, color: "#FFFFFF", letterSpacing: -1 }}>helpmapvzla.net</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ fontSize: T(24), fontWeight: 700, color: "#9AA3AF", display: "flex" }}>@helpmapvzla</div>
          <div style={{ fontSize: T(22), color: "#6B7280", display: "flex" }}>Caracas · La Guaira · Miranda</div>
        </div>
      </div>
    </div>
  );

  // Name block with the status-colored seam to its left (the signature: a filed
  // humanitarian record, tied to status by one color).
  const identity = (
    <div style={{ display: "flex", flexDirection: "column", gap: G(26) }}>
      {statusPill}
      <div style={{ display: "flex", alignItems: "stretch", gap: T(26) }}>
        <div style={{ width: T(8), borderRadius: T(8), background: accent, display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: G(12) }}>
          <div style={{ fontSize: T(88), fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, color: "#FFFFFF" }}>{name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: T(40), fontWeight: 600, color: "#E5E8EC" }}>{p.location_name}</div>
            <div style={{ fontSize: T(30), color: "#9AA3AF" }}>{placeLine}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Two compositions ----------------------------------------------------

  const withPhoto = (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, fontFamily: "sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo!} alt="" width={W} height={F.photoH} style={{ position: "absolute", top: 0, left: 0, width: W, height: F.photoH, objectFit: "cover" }} />
      {/* top scrim for the eyebrow + bottom fade into ink */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: F.photoH,
          display: "flex",
          background: F.scrim,
        }}
      />
      <div style={{ position: "absolute", top: F.pad, left: F.pad, display: "flex" }}>{eyebrow}</div>
      <div
        style={{
          position: "absolute",
          left: F.pad,
          right: F.pad,
          bottom: G(80),
          display: "flex",
          flexDirection: "column",
          gap: G(48),
          width: W - F.pad * 2,
        }}
      >
        {identity}
        {footer}
      </div>
    </div>
  );

  const noPhoto = (
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: G(40) }}>
        <div
          style={{
            width: T(340),
            height: T(340),
            borderRadius: T(80),
            background: "linear-gradient(145deg, #20283600, #20283655), #161C26",
            border: `1px solid ${HAIRLINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: T(150),
            fontWeight: 700,
            color: "#C9D0D9",
          }}
        >
          {initials}
        </div>
        <div style={{ display: "flex" }}>{statusPill}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: G(12), textAlign: "center" }}>
          <div style={{ fontSize: T(88), fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, color: "#FFFFFF" }}>{name}</div>
          <div style={{ fontSize: T(40), fontWeight: 600, color: "#E5E8EC" }}>{p.location_name}</div>
          <div style={{ fontSize: T(30), color: "#9AA3AF" }}>{placeLine}</div>
        </div>
      </div>
      {footer}
    </div>
  );

  return new ImageResponse(photo ? withPhoto : noPhoto, { width: W, height: H });
}
