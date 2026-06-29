import type { Metadata } from "next";
import Link from "next/link";
import { SM, STATE_LABEL, TYPE_META } from "@/components/helpmap/data";
import { fetchPatient } from "./fetchPatient";
import PatientActions from "./PatientActions";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchPatient(id);
  if (!p) {
    return { title: "Registro no encontrado · HelpMap Venezuela" };
  }
  const name = `${p.nombres} ${p.apellidos}`;
  const status = SM[p.estatus].es;
  const title = `${name} · ${status} · HelpMap Venezuela`;
  const description = `${status} en ${p.location_name}. Mapa de emergencia humanitario · Caracas, La Guaira y Miranda.`;
  // og:image is provided by ./opengraph-image.tsx automatically.
  return {
    title,
    description,
    openGraph: { title, description, type: "profile", siteName: "HelpMap Venezuela" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PatientPage({ params }: Params) {
  const { id } = await params;
  const p = await fetchPatient(id);

  if (!p) {
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <h1 style={S.h1}>Registro no encontrado</h1>
          <p style={S.muted}>Es posible que el enlace sea incorrecto o que el registro ya no esté disponible.</p>
          <Link href="/" style={S.primary}>
            Ir al mapa
          </Link>
        </div>
      </div>
    );
  }

  const name = `${p.nombres} ${p.apellidos}`;
  const status = SM[p.estatus];
  const initials = ((p.nombres[0] || "") + (p.apellidos[0] || "")).toUpperCase() || "··";
  const rows: [string, string][] = [
    ["Estatus", status.es],
    ["Cédula", p.ci_display],
    ["Edad", p.edad != null ? `${p.edad} años` : "—"],
    ["Sexo", p.sexo === "F" ? "Femenino" : p.sexo === "M" ? "Masculino" : "—"],
    ["Centro", p.location_name],
    ["Tipo", TYPE_META[p.location_type].es],
    ["Municipio", p.municipality ?? "—"],
    ["Estado", STATE_LABEL[p.state]],
    ["Verificado", p.verified ? "Sí" : "No"],
  ];

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.kicker}>REGISTRO HUMANITARIO · HELPMAP</div>
        <div style={S.hero}>
          <div style={S.avatar}>
            {p.foto_url && !p.is_minor ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.foto_url} alt="" style={S.avatarImg} />
            ) : (
              initials
            )}
          </div>
          <h1 style={S.h1}>{name}</h1>
          <span style={{ ...S.badge, color: status.color, borderColor: status.color }}>
            <span style={{ ...S.dot, background: status.color }} />
            {status.es}
          </span>
          {p.verified && <span style={S.verified}>✓ Verificado</span>}
        </div>

        <div style={S.rows}>
          {rows.map(([label, value]) => (
            <div key={label} style={S.row}>
              <span style={S.muted}>{label}</span>
              <span style={S.val}>{value}</span>
            </div>
          ))}
        </div>

        <PatientActions id={p.id} name={name} statusLabel={status.es} locationName={p.location_name} lat={p.lat} lng={p.lng} />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100dvh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: "#f7f8f9", padding: 20, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", color: "#16191f" },
  card: { width: "100%", maxWidth: 460, background: "#fff", border: "1px solid #ebecef", borderRadius: 18, padding: 22, boxShadow: "0 10px 34px rgba(16,20,28,.10)", marginTop: 24 },
  kicker: { fontSize: 9.5, letterSpacing: ".8px", color: "#7b818c", fontWeight: 700, marginBottom: 12 },
  hero: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, paddingBottom: 18 },
  avatar: { width: 92, height: 92, borderRadius: 24, background: "#eef0f2", border: "1px solid #ebecef", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 600, overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: "-.5px", margin: 0 },
  badge: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 999, border: "1px solid", background: "#fff" },
  dot: { width: 7, height: 7, borderRadius: "50%" },
  verified: { fontSize: 12, fontWeight: 600, color: "#15803d" },
  rows: { display: "flex", flexDirection: "column", border: "1px solid #ebecef", borderRadius: 15, overflow: "hidden", marginBottom: 4 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "13px 15px", borderBottom: "1px solid #ebecef" },
  muted: { fontSize: 13, color: "#7b818c" },
  val: { fontSize: 13.5, fontWeight: 600, textAlign: "right" },
  primary: { display: "inline-block", marginTop: 14, background: "#15181d", color: "#fff", textDecoration: "none", padding: "13px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600 },
};
