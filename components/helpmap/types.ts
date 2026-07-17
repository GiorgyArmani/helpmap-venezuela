// Local UI types for the HelpMap component tree. Domain types (Location, PatientPublic,
// Refugio, …) live in ./data; these are view/admin/draft shapes specific to the UI.

import type { Estatus, LocationType, Sexo, VzlaState } from "./data";

// Which full-screen overlay (if any) is open.
export type View =
  | null
  | "detail"
  | "share"
  | "report"
  | "reportMissing"
  | "admin"
  | "donate"
  | "volunteer"
  | "contact"
  | "contribute"
  | "rescued"
  | "refugios"
  | "refShare";

export type AdminTab =
  | "novedades"
  | "centros"
  | "personas"
  | "voluntarios"
  | "listas"
  | "donaciones"
  | "rescatados"
  | "reportes";

// One row of the activity/audit feed (db/audit_log.sql).
export type AuditEntry = {
  id: string;
  created_at: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
};

// A pending missing-person report (public "Reportar" flow → missing_reports table).
export type MissingReport = {
  id: string;
  apellidos: string;
  nombres: string;
  ci: string | null;
  edad: number | null;
  zona: string | null;
  descripcion: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  status: string;
  created_at: string;
};

export type EditType = null | "center" | "person" | "donation" | "rescatado" | "promote";

export interface Draft {
  // center
  canonical_name?: string;
  type?: LocationType;
  state?: VzlaState;
  municipality?: string;
  lat?: string;
  lng?: string;
  // person
  apellidos?: string;
  nombres?: string;
  ci?: string;
  edad?: string;
  sexo?: Sexo;
  location_id?: string;
  estatus?: Estatus;
  verified?: boolean;
  // donation
  don_name?: string;
  don_desc?: string;
  don_social?: string;
  don_url?: string;
  don_info?: string;
  // rescatado (field rescued report) — admin-only free-text + explicit minor toggle
  is_minor?: boolean;
  contacto?: string;
  rescue_site?: string;
  notas?: string;
  // refugio needs (shown when a center is type=shelter) — editable by staff
  ref_recibe?: string; // comma-separated in the form; split to text[] on save
  ref_necesita?: string;
  ref_horario?: string;
  ref_responsable?: string;
  ref_address?: string;
  ref_animal?: boolean;
}

export interface AuthUser {
  email: string | null;
}

export interface HelpMapProps {
  accent?: string;
  mapLabels?: boolean;
  showReport?: boolean;
}

// Structural type shared by patients and rescatados — both carry these fields and the
// same minor-photo rules, so Avatar/initials work for either.
export type PersonLike = {
  nombres: string;
  apellidos: string;
  foto_url: string | null;
  is_minor: boolean;
};
