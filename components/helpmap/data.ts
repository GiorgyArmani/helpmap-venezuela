// Domain types aligned to the Supabase schema (db.sql).
// The app reads the privacy-filtered `patients_public` VIEW and the `locations`
// table only — never the base `patients` table. See CLAUDE.md §2, §4.

export type VzlaState = "distrito_capital" | "la_guaira" | "miranda";
export type LocationType = "hospital" | "shelter" | "morgue" | "donation_centre";
export type Estatus = "INGRESADO" | "ALTA" | "FALLECIDO";
export type Sexo = "M" | "F";
export type Lang = "es" | "en";

// `locations` table.
export interface Location {
  location_id: string;
  canonical_name: string;
  type: LocationType;
  municipality: string | null;
  state: VzlaState;
  lat: number;
  lng: number;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  active: boolean;
}

// `patients_public` view — already privacy-filtered at the DB layer:
// no procedencia/servicio, ci_display = "MENOR" for minors, foto_url null
// unless the record is an adult AND verified.
export interface PatientPublic {
  id: string;
  apellidos: string;
  nombres: string;
  ci_display: string;
  is_minor: boolean;
  edad: number | null;
  sexo: Sexo | null;
  location_id: string;
  location_name: string;
  location_type: LocationType;
  municipality: string | null;
  state: VzlaState;
  lat: number;
  lng: number;
  estatus: Estatus;
  foto_url: string | null;
  verified: boolean;
  updated_at: string;
}

export const STATE_LABEL: Record<VzlaState, string> = {
  distrito_capital: "Distrito Capital",
  la_guaira: "La Guaira",
  miranda: "Miranda",
};

export interface TypeMeta {
  es: string;
  en: string;
  hasPatients: boolean;
}

export const TYPE_META: Record<LocationType, TypeMeta> = {
  hospital: { es: "Hospital", en: "Hospital", hasPatients: true },
  shelter: { es: "Refugio", en: "Shelter", hasPatients: true },
  morgue: { es: "Morgue", en: "Morgue", hasPatients: true },
  donation_centre: { es: "Centro de acopio", en: "Donation centre", hasPatients: false },
};

export interface StatusMeta {
  es: string;
  en: string;
  cls: string;
  dotCls: string;
  color: string;
}

export const SM: Record<Estatus, StatusMeta> = {
  INGRESADO: { es: "Ingresado", en: "Admitted", cls: "st-adm", dotCls: "cdot-adm", color: "oklch(0.62 0.13 250)" },
  ALTA: { es: "De alta", en: "Discharged", cls: "st-ok", dotCls: "cdot-ok", color: "oklch(0.66 0.11 155)" },
  FALLECIDO: { es: "Fallecido", en: "Deceased", cls: "st-dec", dotCls: "cdot-dec", color: "oklch(0.52 0.03 280)" },
};

export const ESTATUS_ORDER: Estatus[] = ["INGRESADO", "ALTA", "FALLECIDO"];

export interface Strings {
  appName: string; tagline: string; search: string; all: string; allStates: string; allCenters: string;
  report: string; people: string; yrs: string; noResults: string; female: string; male: string;
  ci: string; edad: string; sexo: string; ubic: string; type: string; municipality: string; state: string;
  verified: string; verifiedYes: string; verifiedNo: string; updated: string; share: string; seeMap: string;
  detailTitle: string; reportTitle: string; whatsapp: string; call: string;
  noPatientsHere: string; donationInfo: string; staleData: string;
  f_ape: string; f_nom: string; f_ci: string; f_edad: string; f_sexo: string; f_ubic: string;
  f_photo: string; f_photoHint: string; selectHosp: string; submit: string; note: string; sent: string;
  shareTitle: string; shareDesc: string; cardKicker: string; copyLink: string; copied: string; updatedAgo: string;
  adminTitle: string; tabCenters: string; tabPeople: string; addCenter: string; addPerson: string;
  editCenter: string; editPerson: string; save: string; cancel: string; del: string;
  f_name: string; f_city: string; f_parish: string; f_lat: string; f_lng: string; f_status: string; f_center: string;
  hasPhoto: string; yes: string; no: string; savedC: string; savedP: string; deleted: string; records: string;
  login: string; loginTitle: string; email: string; password: string; signIn: string; signOut: string;
  loginError: string; loginHint: string; adminLocalNote: string; loggedInAs: string;
  f_contact: string; f_minor: string; queuedOffline: string; pendingSync: string; synced: string; reqNameLoc: string;
  igCopied: string;
}

export const T: Record<Lang, Strings> = {
  es: {
    appName: "HelpMap Venezuela", tagline: "Mapa de emergencia · Caracas, La Guaira y Miranda",
    search: "Buscar por nombre, apellido o cédula", all: "Todos", allStates: "Todos los estados", allCenters: "Todos los centros",
    report: "Subir info", people: "personas", yrs: "años", noResults: "Sin resultados. Probá con otro nombre o filtro.",
    female: "Femenino", male: "Masculino", ci: "Cédula", edad: "Edad", sexo: "Sexo", ubic: "Centro", type: "Tipo",
    municipality: "Municipio", state: "Estado", verified: "Verificado", verifiedYes: "Verificado", verifiedNo: "Sin verificar",
    updated: "Actualizado", share: "Compartir", seeMap: "Ver en el mapa", detailTitle: "Ficha de la persona",
    reportTitle: "Subir información", whatsapp: "WhatsApp", call: "Llamar",
    noPatientsHere: "Aún no hay personas registradas en este centro.",
    donationInfo: "Centro de acopio · información de contacto",
    staleData: "Datos posiblemente desactualizados (sin conexión)",
    f_ape: "Apellidos", f_nom: "Nombres", f_ci: "Cédula (CI)", f_edad: "Edad", f_sexo: "Sexo",
    f_ubic: "Centro / ubicación", f_photo: "Foto", f_photoHint: "Tocá para subir una foto (solo adultos)",
    selectHosp: "Seleccioná un centro", submit: "Enviar para revisión",
    note: "Cada reporte es revisado por nuestro equipo y contactos médicos antes de publicarse. No se publica de inmediato.",
    sent: "Recibido para revisión. Gracias.", shareTitle: "Compartir ficha",
    shareDesc: "Así se verá el enlace al pegarlo en WhatsApp, Telegram o Instagram.", cardKicker: "MAPA DE EMERGENCIA",
    copyLink: "Copiar enlace", copied: "Enlace copiado", updatedAgo: "Actualizado",
    adminTitle: "Panel de administración", tabCenters: "Centros", tabPeople: "Personas", addCenter: "Agregar centro",
    addPerson: "Agregar persona", editCenter: "Editar centro", editPerson: "Editar persona", save: "Guardar",
    cancel: "Cancelar", del: "Eliminar", f_name: "Nombre del centro", f_city: "Estado", f_parish: "Municipio",
    f_lat: "Latitud", f_lng: "Longitud", f_status: "Estatus", f_center: "Centro", hasPhoto: "¿Tiene foto?",
    yes: "Sí", no: "No", savedC: "Centro guardado", savedP: "Persona guardada", deleted: "Eliminado", records: "registros",
    login: "Ingresar", loginTitle: "Acceso de administración", email: "Correo", password: "Contraseña",
    signIn: "Iniciar sesión", signOut: "Cerrar sesión", loginError: "Credenciales inválidas.",
    loginHint: "Sólo personal autorizado. Acceso protegido por Supabase Auth.",
    adminLocalNote: "Los cambios son locales en esta sesión. La escritura a la base de datos con registro de auditoría es la próxima fase.",
    loggedInAs: "Sesión",
    f_contact: "Contacto (WhatsApp/teléfono, opcional)",
    f_minor: "¿Es menor de edad?",
    queuedOffline: "Sin conexión. Guardado: se enviará al volver el internet.",
    pendingSync: "pendiente(s) por enviar cuando vuelva la conexión",
    synced: "Envíos sincronizados con el equipo.",
    reqNameLoc: "Indicá al menos nombre o apellido y el centro.",
    igCopied: "Enlace copiado. Pegalo en tu historia o perfil de Instagram.",
  },
  en: {
    appName: "HelpMap Venezuela", tagline: "Emergency map · Caracas, La Guaira & Miranda",
    search: "Search by name, surname or ID", all: "All", allStates: "All states", allCenters: "All centers",
    report: "Upload info", people: "people", yrs: "yrs", noResults: "No results. Try another name or filter.",
    female: "Female", male: "Male", ci: "ID (CI)", edad: "Age", sexo: "Sex", ubic: "Center", type: "Type",
    municipality: "Municipality", state: "State", verified: "Verified", verifiedYes: "Verified", verifiedNo: "Unverified",
    updated: "Updated", share: "Share", seeMap: "See on map", detailTitle: "Person record",
    reportTitle: "Upload information", whatsapp: "WhatsApp", call: "Call",
    noPatientsHere: "No people registered at this center yet.",
    donationInfo: "Donation centre · contact information",
    staleData: "Data may be out of date (offline)",
    f_ape: "Surname", f_nom: "First names", f_ci: "ID (CI)", f_edad: "Age", f_sexo: "Sex",
    f_ubic: "Center / location", f_photo: "Photo", f_photoHint: "Tap to upload a photo (adults only)",
    selectHosp: "Select a center", submit: "Submit for review",
    note: "Every report is reviewed by our team and medical contacts before publishing. It is not published immediately.",
    sent: "Received for review. Thank you.", shareTitle: "Share record",
    shareDesc: "This is how the link looks when pasted into WhatsApp, Telegram or Instagram.", cardKicker: "EMERGENCY MAP",
    copyLink: "Copy link", copied: "Link copied", updatedAgo: "Updated",
    adminTitle: "Admin panel", tabCenters: "Centers", tabPeople: "People", addCenter: "Add center",
    addPerson: "Add person", editCenter: "Edit center", editPerson: "Edit person", save: "Save", cancel: "Cancel",
    del: "Delete", f_name: "Center name", f_city: "State", f_parish: "Municipality", f_lat: "Latitude",
    f_lng: "Longitude", f_status: "Status", f_center: "Center", hasPhoto: "Has photo?", yes: "Yes", no: "No",
    savedC: "Center saved", savedP: "Person saved", deleted: "Deleted", records: "records",
    login: "Sign in", loginTitle: "Admin access", email: "Email", password: "Password", signIn: "Sign in",
    signOut: "Sign out", loginError: "Invalid credentials.",
    loginHint: "Authorized staff only. Protected by Supabase Auth.",
    adminLocalNote: "Changes are local to this session. Writing to the database with an audit log is the next phase.",
    loggedInAs: "Session",
    f_contact: "Contact (WhatsApp/phone, optional)",
    f_minor: "Is a minor?",
    queuedOffline: "Offline. Saved — it will be sent when you're back online.",
    pendingSync: "pending to send when the connection returns",
    synced: "Submissions synced with the team.",
    reqNameLoc: "Enter at least a first/last name and the center.",
    igCopied: "Link copied. Paste it in your Instagram story or profile.",
  },
};

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(DIACRITICS, "");

export const slug = (s: string) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const worst = (list: PatientPublic[]): Estatus => {
  if (list.some((p) => p.estatus === "FALLECIDO")) return "FALLECIDO";
  if (list.some((p) => p.estatus === "INGRESADO")) return "INGRESADO";
  return "ALTA";
};
