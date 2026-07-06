// Static config + label maps for the HelpMap UI. Kept out of the big component so it
// recompiles independently and stays easy to scan.

// Volunteer recruiting contact. ⚠️ Fill with the crew's real channel before launch.
// Leave `whatsapp` empty to hide the WhatsApp button (digits only, no +).
export const VOLUNTEER = {
  whatsapp: "", // e.g. "584120000000"
  email: "info@helpmapvzla.net",
};

// Official Instagram — the brand/logo links here (main channel in Venezuela).
export const INSTAGRAM_HANDLE = "helpmapvzla";
export const INSTAGRAM_URL = "https://www.instagram.com/" + INSTAGRAM_HANDLE + "/";

// Profiles we're recruiting — shown as a checklist in the volunteer panel.
export const VOLUNTEER_ROLES: { es: string; en: string }[] = [
  { es: "Médicos y médicas", en: "Doctors" },
  { es: "Enfermeros y enfermeras", en: "Nurses" },
  { es: "Personal de salud", en: "Health workers" },
  { es: "Rescatistas y Protección Civil", en: "Rescuers & Civil Protection" },
  { es: "Con acceso a información veraz y de primera mano", en: "With access to truthful, first-hand information" },
];

// Profile options for the volunteer signup form's "perfil" select.
export const VOL_PROFILES: { value: string; es: string; en: string }[] = [
  { value: "medico", es: "Médico/a", en: "Doctor" },
  { value: "enfermero", es: "Enfermero/a", en: "Nurse" },
  { value: "salud", es: "Personal de salud", en: "Health worker" },
  { value: "rescate", es: "Rescatista / Protección Civil", en: "Rescuer / Civil Protection" },
  { value: "otro", es: "Otro", en: "Other" },
];

// Human labels for each audit action (kept out of the big translations object).
export const AUDIT_LABEL: Record<string, { es: string; en: string }> = {
  contribution_new: { es: "Nuevo aporte", en: "New contribution" },
  contribution_approved: { es: "Aporte aprobado", en: "Contribution approved" },
  contribution_rejected: { es: "Aporte rechazado", en: "Contribution rejected" },
  patient_create: { es: "Alta de persona", en: "Person added" },
  patient_update: { es: "Edición de persona", en: "Person edited" },
  patient_status: { es: "Cambio de estatus", en: "Status changed" },
  patient_verify: { es: "Persona verificada", en: "Person verified" },
  patient_delete: { es: "Persona eliminada", en: "Person deleted" },
  rescatado_create: { es: "Nuevo rescatado", en: "New rescued person" },
  rescatado_update: { es: "Edición de rescatado", en: "Rescued edited" },
  rescatado_promote: { es: "Rescatado trasladado", en: "Rescued transferred" },
  rescatado_delete: { es: "Rescatado eliminado", en: "Rescued deleted" },
  center_create: { es: "Centro agregado", en: "Center added" },
  center_update: { es: "Centro editado", en: "Center edited" },
  center_delete: { es: "Centro eliminado", en: "Center deleted" },
  volunteer_apply: { es: "Nueva solicitud de voluntariado", en: "New volunteer application" },
  volunteer_approved: { es: "Voluntario aprobado", en: "Volunteer approved" },
  volunteer_rejected: { es: "Solicitud rechazada", en: "Application rejected" },
};

export const CACHE_KEY = "helpmap:data:v5";
// Bump the version when tour content changes so returning users see it once more.
export const TOUR_KEY = "helpmap:tour:v2";
// Staff onboarding tour — stored in sessionStorage so it shows once per browser session
// (reappears next session so volunteers get up to date again).
export const STAFF_TOUR_KEY = "helpmap:staff-tour";
