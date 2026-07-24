import type { Metadata } from "next";
import Link from "next/link";
import { ESTADO_META, STATE_LABEL, TYPE_META, type RefugioEstado } from "@/components/helpmap/data";
import { estadoOf, refugioAgeDays, REFUGIO_STALE_DAYS } from "@/components/helpmap/helpers";
import { fetchCenter } from "./fetchCenter";
import CenterActions from "./CenterActions";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchCenter(id);
  if (!data) {
    return { title: "Centro no encontrado · HelpMap Venezuela" };
  }
  const { loc, ref } = data;
  const typeLabel = TYPE_META[loc.type].es;
  const place = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(", ");
  const title = `${loc.canonical_name} · ${typeLabel} · HelpMap Venezuela`;
  const need = (ref?.necesita || "").trim();
  const description = need
    ? `Necesita: ${need}. ${place} · Mapa de emergencia humanitario.`
    : `${typeLabel} en ${place}. Mapa de emergencia humanitario · Venezuela.`;
  // og:image is provided by ./opengraph-image.tsx automatically.
  return {
    title,
    description,
    // Unlike a patient ficha, a help point carries NO personal data — it's a public
    // service point, so indexing it (a googleable list of where to donate/shelter)
    // is beneficial, not a targeting vector.
    alternates: { canonical: `/c/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "HelpMap Venezuela",
      url: `/c/${id}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CenterPage({ params }: Params) {
  const { id } = await params;
  const data = await fetchCenter(id);

  if (!data) {
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <h1 style={S.h1}>Centro no encontrado</h1>
          <p style={S.muted}>Es posible que el enlace sea incorrecto o que el centro ya no esté disponible.</p>
          <Link href="/" style={S.primary}>
            Ir al mapa
          </Link>
        </div>
      </div>
    );
  }

  const { loc, ref } = data;
  const type = TYPE_META[loc.type];
  const place = [loc.municipality, STATE_LABEL[loc.state]].filter(Boolean).join(" · ");
  const recibe = ref?.recibe ?? [];
  // Operating status + how old the record is. A shared link outlives the moment it was
  // shared, so a page that omits "this point closed" / "this is 3 weeks old" is worse
  // than useless — it's confidently wrong (see db/refugios_estado.sql).
  const estado = estadoOf(ref);
  const updIso = ref?.updated_at || ref?.last_confirmed_at || null;
  const updDays = refugioAgeDays(ref);
  const stale = updDays != null && updDays >= REFUGIO_STALE_DAYS;
  const EST_STYLE: Record<RefugioEstado, React.CSSProperties> = {
    abierto: { color: "#065f46", background: "#d1fae5", borderColor: "#a7f3d0" },
    lleno: { color: "#92400e", background: "#fef3c7", borderColor: "#fcd34d" },
    cerrado: { color: "#7f1d1d", background: "#fee2e2", borderColor: "#fecaca" },
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.kicker}>{type.es.toUpperCase()} · HELPMAP</div>
        <div style={S.hero}>
          <h1 style={S.h1}>{loc.canonical_name}</h1>
          <span style={{ ...S.badge, color: type.color, borderColor: type.color }}>
            <span style={{ ...S.dot, background: type.color }} />
            {type.es}
          </span>
          {estado && (
            <span style={{ ...S.est, ...EST_STYLE[estado] }}>
              {ESTADO_META[estado].es.toUpperCase()}
            </span>
          )}
          {ref?.es_animal && <span style={S.animal}>🐾 Refugio animal</span>}
          {place && <div style={S.place}>📍 {place}</div>}
        </div>

        {/* Warnings BEFORE the needs: whether the point is still there outranks what it
            needs. Closed is red; full and "this data is old" are amber. */}
        {estado === "cerrado" && (
          <div style={{ ...S.warn, ...S.warnClosed }}>
            Este punto reportó estar CERRADO. No vayas sin confirmar antes.
          </div>
        )}
        {estado === "lleno" && (
          <div style={S.warn}>Este punto reportó estar LLENO / sin capacidad. Confirma antes de ir.</div>
        )}
        {estado !== "cerrado" && stale && (
          <div style={{ ...S.warn, ...S.warnSoft }}>
            Dato con varios días. Confirma por teléfono antes de ir.
          </div>
        )}

        {ref?.necesita && (
          <div style={{ ...S.needBox, borderColor: type.color }}>
            <div style={{ ...S.needLabel, color: type.color }}>NECESITA AHORA</div>
            <div style={S.needText}>{ref.necesita}</div>
          </div>
        )}

        {recibe.length > 0 && (
          <div style={S.block}>
            <div style={S.blockLabel}>RECIBE DONACIONES DE</div>
            <div style={S.chips}>
              {recibe.map((x, i) => (
                <span key={i} style={S.chip}>
                  {x.charAt(0).toUpperCase() + x.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}

        {(ref?.horario || ref?.responsable || ref?.address) && (
          <div style={S.rows}>
            {ref?.horario && (
              <div style={S.row}>
                <span style={S.muted}>Horario</span>
                <span style={S.val}>{ref.horario}</span>
              </div>
            )}
            {ref?.responsable && (
              <div style={S.row}>
                <span style={S.muted}>Responsable</span>
                <span style={S.val}>{ref.responsable}</span>
              </div>
            )}
            {ref?.address && (
              <div style={S.row}>
                <span style={S.muted}>Dirección</span>
                <span style={S.val}>{ref.address}</span>
              </div>
            )}
          </div>
        )}

        <CenterActions
          id={loc.location_id}
          name={loc.canonical_name}
          typeLabel={type.es}
          place={place}
          need={ref?.necesita ?? null}
          lat={loc.lat}
          lng={loc.lng}
          whatsapp={loc.contact_whatsapp}
          phone={loc.contact_phone}
        />

        {updIso && (
          <div style={{ ...S.updated, ...(stale ? S.updatedOld : null) }}>
            Actualizado{" "}
            {updDays === 0 ? "hoy" : updDays === 1 ? "hace 1 día" : `hace ${updDays} días`} ·{" "}
            {new Date(updIso).toLocaleDateString("es-VE")}
          </div>
        )}

        <a style={S.attrib} href="https://acopiove.org" target="_blank" rel="noopener noreferrer">
          Datos de refugios/acopios: AcopioVE (acopiove.org) · CC-BY 4.0
        </a>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", color: "#16191f" },
  card: { width: "100%", maxWidth: 460, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 22, boxShadow: "0 10px 34px rgba(16,20,28,.10)", marginTop: 24 },
  kicker: { fontSize: 9.5, letterSpacing: ".8px", color: "#7b818c", fontWeight: 700, marginBottom: 12 },
  hero: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, paddingBottom: 18 },
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: "-.5px", margin: 0 },
  badge: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 999, border: "1px solid", background: "#fff" },
  dot: { width: 7, height: 7, borderRadius: "50%" },
  animal: { fontSize: 12, fontWeight: 600, color: "#7b818c" },
  est: { display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 800, letterSpacing: ".4px", padding: "4px 11px", borderRadius: 999, border: "1px solid" },
  warn: { fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 13, padding: "11px 13px", marginBottom: 12 },
  warnClosed: { color: "#991b1b", background: "#fee2e2", borderColor: "#fca5a5" },
  warnSoft: { fontWeight: 600, color: "#6b5416", background: "#fffaeb", borderColor: "#f2e6c4" },
  updated: { marginTop: 14, textAlign: "center", fontSize: 11.5, color: "#9aa3af" },
  updatedOld: { color: "#b45309", fontWeight: 700 },
  place: { fontSize: 13.5, color: "#7b818c" },
  needBox: { border: "1px solid", borderRadius: 15, padding: "14px 16px", marginBottom: 12, background: "#fffdf7" },
  needLabel: { fontSize: 10.5, letterSpacing: ".8px", fontWeight: 700, marginBottom: 6 },
  needText: { fontSize: 15, fontWeight: 600, lineHeight: 1.35 },
  block: { marginBottom: 12 },
  blockLabel: { fontSize: 10.5, letterSpacing: ".8px", fontWeight: 700, color: "#7b818c", marginBottom: 8 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, background: "#f2f3f5", border: "1px solid #ebecef" },
  rows: { display: "flex", flexDirection: "column", border: "1px solid #ebecef", borderRadius: 15, overflow: "hidden", marginBottom: 4 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "13px 15px", borderBottom: "1px solid #ebecef" },
  muted: { fontSize: 13, color: "#7b818c" },
  val: { fontSize: 13.5, fontWeight: 600, textAlign: "right" },
  primary: { display: "inline-block", marginTop: 14, background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600 },
  attrib: { display: "block", textAlign: "center", marginTop: 14, fontSize: 11, color: "#9aa3af", textDecoration: "none" },
};
