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
export const VOLUNTEER_ROLES: { es: string; en: string; pt: string }[] = [
  { es: "Médicos y médicas", en: "Doctors", pt: "Médicos e médicas" },
  { es: "Enfermeros y enfermeras", en: "Nurses", pt: "Enfermeiros e enfermeiras" },
  { es: "Personal de salud", en: "Health workers", pt: "Profissionais de saúde" },
  { es: "Rescatistas y Protección Civil", en: "Rescuers & Civil Protection", pt: "Resgatistas e Defesa Civil" },
  {
    es: "Con acceso a información veraz y de primera mano",
    en: "With access to truthful, first-hand information",
    pt: "Com acesso a informação confiável e em primeira mão",
  },
];

// Profile options for the volunteer signup form's "perfil" select.
export const VOL_PROFILES: { value: string; es: string; en: string; pt: string }[] = [
  { value: "medico", es: "Médico/a", en: "Doctor", pt: "Médico/a" },
  { value: "enfermero", es: "Enfermero/a", en: "Nurse", pt: "Enfermeiro/a" },
  { value: "salud", es: "Personal de salud", en: "Health worker", pt: "Profissional de saúde" },
  { value: "rescate", es: "Rescatista / Protección Civil", en: "Rescuer / Civil Protection", pt: "Resgatista / Defesa Civil" },
  { value: "otro", es: "Otro", en: "Other", pt: "Outro" },
];

// Human labels for each audit action (kept out of the big translations object).
export const AUDIT_LABEL: Record<string, { es: string; en: string; pt: string }> = {
  contribution_new: { es: "Nuevo aporte", en: "New contribution", pt: "Nova contribuição" },
  contribution_approved: { es: "Aporte aprobado", en: "Contribution approved", pt: "Contribuição aprovada" },
  contribution_rejected: { es: "Aporte rechazado", en: "Contribution rejected", pt: "Contribuição rejeitada" },
  patient_create: { es: "Alta de persona", en: "Person added", pt: "Pessoa adicionada" },
  patient_update: { es: "Edición de persona", en: "Person edited", pt: "Pessoa editada" },
  patient_status: { es: "Cambio de estatus", en: "Status changed", pt: "Status alterado" },
  patient_verify: { es: "Persona verificada", en: "Person verified", pt: "Pessoa verificada" },
  patient_delete: { es: "Persona eliminada", en: "Person deleted", pt: "Pessoa excluída" },
  rescatado_create: { es: "Nuevo rescatado", en: "New rescued person", pt: "Novo resgatado" },
  rescatado_update: { es: "Edición de rescatado", en: "Rescued edited", pt: "Resgatado editado" },
  rescatado_promote: { es: "Rescatado trasladado", en: "Rescued transferred", pt: "Resgatado transferido" },
  rescatado_delete: { es: "Rescatado eliminado", en: "Rescued deleted", pt: "Resgatado excluído" },
  center_create: { es: "Centro agregado", en: "Center added", pt: "Centro adicionado" },
  center_update: { es: "Centro editado", en: "Center edited", pt: "Centro editado" },
  center_delete: { es: "Centro eliminado", en: "Center deleted", pt: "Centro excluído" },
  volunteer_apply: { es: "Nueva solicitud de voluntariado", en: "New volunteer application", pt: "Nova solicitação de voluntariado" },
  volunteer_approved: { es: "Voluntario aprobado", en: "Volunteer approved", pt: "Voluntário aprovado" },
  volunteer_rejected: { es: "Solicitud rechazada", en: "Application rejected", pt: "Solicitação rejeitada" },
};

export const CACHE_KEY = "helpmap:data:v5";
// Bump the version when tour content changes so returning users see it once more.
export const TOUR_KEY = "helpmap:tour:v2";
// Staff onboarding tour — stored in sessionStorage so it shows once per browser session
// (reappears next session so volunteers get up to date again).
export const STAFF_TOUR_KEY = "helpmap:staff-tour";
