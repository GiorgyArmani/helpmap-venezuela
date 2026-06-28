import { ImageResponse } from "next/og";
import { SM, STATE_LABEL, TYPE_META, type Estatus } from "@/components/helpmap/data";
import { fetchPatient } from "../fetchPatient";

// Instagram story banner (1080×1920) the user downloads/shares to their story —
// the "share to story" flow (Instagram has no URL share intent, see CLAUDE.md §5).
//
// PRIVACY (CLAUDE.md §2, §5): a photo may appear ONLY for an adult that is
// verified. Minors and unverified records NEVER show a photo. The DB view
// already nulls those, but we re-assert the guard here as a second lock.
const W = 1080;
const H = 1920;

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

export async function GET(_req: Request, ctx: RouteContext<"/p/[id]/story">) {
  const { id } = await ctx.params;
  const p = await fetchPatient(id);

  if (!p) {
    return new Response("Not found", { status: 404 });
  }

  const name = `${p.nombres} ${p.apellidos}`;
  const accent = ST_COLOR[p.estatus];
  const statusLabel = SM[p.estatus].es;
  const initials = ((p.nombres[0] || "") + (p.apellidos[0] || "")).toUpperCase() || "··";
  const typeLabel = TYPE_META[p.location_type].es;
  const sub = `${typeLabel}${p.edad != null ? ` · ${p.edad} años` : ""}`;

  // Second lock: never a photo for a minor or unverified record.
  const canShowPhoto = !p.is_minor && p.verified && !!p.foto_url;
  const photo = canShowPhoto ? await loadPhoto(p.foto_url) : null;

  // ---- Reusable pieces -----------------------------------------------------

  const eyebrow = (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 14,
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
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 1, color: "#FFFFFF" }}>HELPMAP VENEZUELA</div>
        <div style={{ fontSize: 19, letterSpacing: 4, color: "#9AA3AF" }}>REGISTRO HUMANITARIO</div>
      </div>
    </div>
  );

  const statusPill = (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 30px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          border: `2px solid ${accent}`,
          fontSize: 36,
          fontWeight: 600,
          color: "#FFFFFF",
        }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 10, background: accent, display: "flex" }} />
        {statusLabel}
      </div>
      {p.verified ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 30, fontWeight: 600, color: "#34D399" }}>
          ✓ Verificado
        </div>
      ) : null}
    </div>
  );

  const footer = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ height: 1, background: HAIRLINE, marginBottom: 26 }} />
      <div style={{ fontSize: 22, color: "#6B7280", display: "flex", marginBottom: 24, maxWidth: 900, lineHeight: 1.3 }}>
        Datos confirmados en campo por contactos en centros de salud.
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 24, letterSpacing: 3, color: "#9AA3AF" }}>BUSCA A TUS SERES QUERIDOS</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#FFFFFF", letterSpacing: -1 }}>helpmapvzla.net</div>
        </div>
        <div style={{ fontSize: 24, color: "#6B7280", display: "flex" }}>Caracas · La Guaira · Miranda</div>
      </div>
    </div>
  );

  // Name block with the status-colored seam to its left (the signature: a filed
  // humanitarian record, tied to status by one color).
  const identity = (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {statusPill}
      <div style={{ display: "flex", alignItems: "stretch", gap: 26 }}>
        <div style={{ width: 8, borderRadius: 8, background: accent, display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, color: "#FFFFFF" }}>{name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 40, fontWeight: 600, color: "#E5E8EC" }}>{p.location_name}</div>
            <div style={{ fontSize: 30, color: "#9AA3AF" }}>
              {sub} · {STATE_LABEL[p.state]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- Two compositions ----------------------------------------------------

  const withPhoto = (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, fontFamily: "sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo!} alt="" width={W} height={1260} style={{ position: "absolute", top: 0, left: 0, width: W, height: 1260, objectFit: "cover" }} />
      {/* top scrim for the eyebrow + bottom fade into ink */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: W,
          height: 1260,
          display: "flex",
          background:
            "linear-gradient(180deg, rgba(11,14,19,0.55) 0%, rgba(11,14,19,0) 24%, rgba(11,14,19,0) 50%, rgba(11,14,19,0.7) 80%, #0B0E13 100%)",
        }}
      />
      <div style={{ position: "absolute", top: 72, left: 72, display: "flex" }}>{eyebrow}</div>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 80, display: "flex", flexDirection: "column", gap: 48, width: W - 144 }}>
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
        padding: 72,
        background: "linear-gradient(160deg, #161C26 0%, #0B0E13 62%)",
        fontFamily: "sans-serif",
      }}
    >
      {eyebrow}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            width: 340,
            height: 340,
            borderRadius: 80,
            background: "linear-gradient(145deg, #20283600, #20283655), #161C26",
            border: `1px solid ${HAIRLINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 150,
            fontWeight: 700,
            color: "#C9D0D9",
          }}
        >
          {initials}
        </div>
        <div style={{ display: "flex" }}>{statusPill}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, color: "#FFFFFF" }}>{name}</div>
          <div style={{ fontSize: 40, fontWeight: 600, color: "#E5E8EC" }}>{p.location_name}</div>
          <div style={{ fontSize: 30, color: "#9AA3AF" }}>
            {sub} · {STATE_LABEL[p.state]}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );

  return new ImageResponse(photo ? withPhoto : noPhoto, { width: W, height: H });
}
