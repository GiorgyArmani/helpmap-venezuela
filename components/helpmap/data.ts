// Domain types aligned to the Supabase schema (db.sql).
// The app reads the privacy-filtered `patients_public` VIEW and the `locations`
// table only — never the base `patients` table. See CLAUDE.md §2, §4.

export type VzlaState =
  | "distrito_capital"
  | "la_guaira"
  | "miranda"
  | "yaracuy"
  | "falcon"
  | "carabobo"
  | "aragua";
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

// `donations` table — community orgs/initiatives shown in the "Donar" panel.
// Public reads (anon) see active rows; staff add/edit, admin deletes (db/donations.sql).
export interface Donation {
  id: string;
  name: string;
  description: string | null;
  social_url: string | null;
  donate_url: string | null;
  donate_info: string | null;
  sort: number;
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

// `rescatados_public` view — a rescued person not yet transferred to a center, so no
// location/estatus yet. Same privacy filtering as patients_public (no procedencia/etc.,
// ci_display "MENOR" for minors, foto_url null unless verified adult). Promoted rows
// (already turned into patients) are excluded by the view.
export interface RescatadoPublic {
  id: string;
  apellidos: string;
  nombres: string;
  ci_display: string;
  is_minor: boolean;
  edad: number | null;
  sexo: Sexo | null;
  foto_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// `rescatados` BASE table — what staff read/write in the admin panel (full fields,
// incl. the admin-only ones the public view strips). Never expose procedencia/contacto/
// rescue_site/notas to the public app.
export interface Rescatado {
  id: string;
  apellidos: string;
  nombres: string;
  ci: string | null;
  is_minor: boolean;
  edad: number | null;
  sexo: Sexo | null;
  foto_url: string | null;
  procedencia: string | null;
  contacto: string | null;
  rescue_site: string | null;
  notas: string | null;
  verified: boolean;
  promoted: boolean;
  patient_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const STATE_LABEL: Record<VzlaState, string> = {
  distrito_capital: "Distrito Capital",
  la_guaira: "La Guaira",
  miranda: "Miranda",
  yaracuy: "Yaracuy",
  falcon: "Falcón",
  carabobo: "Carabobo",
  aragua: "Aragua",
};

export interface TypeMeta {
  es: string;
  en: string;
  hasPatients: boolean;
  // Pin color is driven by the location TYPE, not by patient status — otherwise a
  // hospital whose worst record is FALLECIDO would paint its pin the gray of the
  // "fallecido" filter and misread as a death toll. Type colors are chosen to be
  // distinct from the status-filter colors in SM (blue/green/gray).
  color: string;
}

export const TYPE_META: Record<LocationType, TypeMeta> = {
  hospital: { es: "Hospital", en: "Hospital", hasPatients: true, color: "oklch(0.58 0.15 25)" },
  shelter: { es: "Refugio", en: "Shelter", hasPatients: true, color: "oklch(0.68 0.15 70)" },
  morgue: { es: "Morgue", en: "Morgue", hasPatients: true, color: "oklch(0.5 0.03 280)" },
  donation_centre: { es: "Centro de acopio", en: "Donation centre", hasPatients: false, color: "oklch(0.6 0.15 300)" },
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
  igCopied: string; noteMinors: string;
  f_address: string; geoSearch: string; geoSearching: string; geoFound: string; geoNotFound: string; geoHint: string; geoPick: string;
  photoBusy: string; photoError: string; removePhoto: string;
  f_procedencia: string; f_procedenciaPh: string; f_procedenciaHint: string;
  storyBuilding: string; storyShared: string; storyDownloaded: string; storyError: string;
  donate: string; donateTitle: string; donateSub: string; donateCta: string; donateNote: string;
  saveError: string; delBlocked: string;
  directions: string;
  damageLayer: string; damageLess: string; damageMore: string;
  feltIntensity: string; intLeve: string; intSevera: string; aftershocks: string; damagePreliminary: string;
  volunteer: string; volunteerTitle: string; volunteerSub: string; volunteerAsk: string;
  volunteerWa: string; volunteerEmail: string; volunteerWaMsg: string; volunteerEmailSubj: string;
  volunteerNote: string;
  donateJoin: string; donateJoinSub: string; donateJoinCta: string;
  infoNeededTitle: string; infoNeeded: string;
  shareDisclosure: string;
  trustLine: string; trustCta: string;
  contact: string; contactTitle: string; contactSub: string; contactName: string;
  contactEmailLabel: string; contactMsg: string; contactPhotos: string; contactAddPhoto: string;
  contactSend: string; contactSending: string; contactSent: string; contactError: string;
  contactAckTitle: string; contactAckBody: string; contactAckClose: string;
  contactSegVol: string; contactSegDon: string;
  tabVolunteers: string; tabLists: string;
  addVolunteer: string; volPass: string; volGenerate: string; volCreate: string;
  volCreated: string; volCreatedNoMail: string; volCreateErr: string;
  volRevoke: string; volRevoked: string; volNone: string; volReviewNote: string; staffGuide: string;
  listTitle: string; listHint: string; listPick: string; listSending: string;
  listSent: string; listError: string; listNote: string;
  tabDonations: string; addDonation: string; editDonation: string; savedDon: string;
  f_donName: string; f_donDesc: string; f_donSocial: string; f_donUrl: string;
  f_donInfo: string; f_donInfoHint: string; donCopy: string; donData: string;
  donFollow: string; donNone: string;
  contribCta: string; contribTitle: string; contribFor: string; contribSub: string;
  contribDescLabel: string; contribDescPh: string; contribPhoto: string;
  contribSend: string; contribSending: string; contribNote: string; contribMinorNote: string;
  contribAckTitle: string; contribAckBody: string; contribAckClose: string; contribReq: string;
  contribContact: string; tabContribs: string; contribApprove: string; contribReject: string;
  contribApproved: string; contribRejected: string; contribNone: string; contribReviewNote: string;
  maintBanner: string; maintTitle: string; maintHint: string;
  maintActive: string; maintInactive: string; maintOn: string; maintOff: string;
  tabRescued: string; rescuedListTitle: string; rescuedListSub: string; rescuedNone: string;
  rescuedStatus: string; rescuedOpen: string; addRescued: string; rescuedReviewNote: string;
  rescuedFieldNote: string; savedRescued: string; rescuedDeleted: string; rescuedReqName: string;
  rescuedPublicNote: string; promote: string; promoteTitle: string; promoteHint: string; promoted: string;
  f_rescueSite: string; f_rescueSiteHint: string; f_notas: string; f_notasHint: string;
  admSearchPh: string; admSearchNone: string;
}

export const T: Record<Lang, Strings> = {
  es: {
    appName: "HelpMap VE", tagline: "OSINT humanitario",
    search: "Buscar por nombre, apellido o cédula", all: "Todos", allStates: "Todos los estados", allCenters: "Todos los centros",
    report: "Reportar", people: "personas", yrs: "años", noResults: "Sin resultados. Intenta con otro nombre o filtro.",
    female: "Femenino", male: "Masculino", ci: "Cédula", edad: "Edad", sexo: "Sexo", ubic: "Centro", type: "Tipo",
    municipality: "Municipio", state: "Estado", verified: "Verificado", verifiedYes: "Verificado", verifiedNo: "Sin verificar",
    updated: "Actualizado", share: "Compartir", seeMap: "Ver en el mapa", detailTitle: "Ficha de la persona",
    reportTitle: "Subir información", whatsapp: "WhatsApp", call: "Llamar",
    noPatientsHere: "Aún no hay personas registradas en este centro.",
    donationInfo: "Centro de acopio · información de contacto",
    staleData: "Datos posiblemente desactualizados (sin conexión)",
    f_ape: "Apellidos", f_nom: "Nombres", f_ci: "Cédula (CI)", f_edad: "Edad", f_sexo: "Sexo",
    f_ubic: "Centro / ubicación", f_photo: "Foto", f_photoHint: "Toca para subir una foto (solo adultos)",
    selectHosp: "Selecciona un centro", submit: "Enviar para revisión",
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
    adminLocalNote: "Los cambios se guardan en la base de datos. El registro de auditoría (quién cambió qué) es la próxima fase.",
    loggedInAs: "Sesión",
    f_contact: "Contacto (WhatsApp/teléfono, opcional)",
    f_minor: "¿Es menor de edad?",
    queuedOffline: "Sin conexión. Guardado: se enviará al volver el internet.",
    pendingSync: "pendiente(s) por enviar cuando vuelva la conexión",
    synced: "Envíos sincronizados con el equipo.",
    reqNameLoc: "Indica al menos nombre o apellido y el centro.",
    igCopied: "Enlace copiado. Pégalo en tu historia o perfil de Instagram.",
    noteMinors: "La información de menores de edad está estrictamente protegida: nunca mostramos sus fotos. Su visualización completa se limita exclusivamente a personal médico y familiares.",
    f_address: "Buscar por nombre o dirección", geoSearch: "Buscar", geoSearching: "Buscando…",
    geoFound: "Ubicación encontrada — verifica el pin en el mapa", geoNotFound: "No se encontró. Prueba con el nombre del centro o ingresa lat/lng a mano.",
    geoHint: "Escribe el nombre del centro (ej. \"Hospital Central San Felipe\") o una dirección y pulsa Buscar. Verifica siempre el pin.",
    geoPick: "Varias coincidencias — elige la correcta:",
    photoBusy: "Procesando foto…",
    photoError: "No se pudo procesar la imagen. Intenta con otra.",
    removePhoto: "Quitar foto",
    f_procedencia: "Procedencia",
    f_procedenciaPh: "Zona o sector de origen",
    f_procedenciaHint: "Solo para el equipo de verificación. No se muestra públicamente.",
    storyBuilding: "Generando imagen para tu historia…",
    storyShared: "Elige Instagram → Historia y agrega el sticker de enlace.",
    storyDownloaded: "Abrimos la imagen en otra pestaña: guárdala y súbela a tu historia de Instagram.",
    storyError: "No se pudo crear la imagen. Intenta de nuevo.",
    donate: "Donar",
    donateTitle: "Donar",
    donateSub: "Apoya a las organizaciones que están ayudando en el terreno.",
    donateCta: "Donar",
    donateNote: "Las donaciones van directo a cada organización. HelpMap no recibe ni administra fondos.",
    saveError: "No se pudo guardar en la base de datos. Intenta de nuevo.",
    delBlocked: "No se pudo eliminar. Puede que haya personas registradas en este centro.",
    directions: "Cómo llegar",
    damageLayer: "Daños",
    damageLess: "Menos",
    damageMore: "Más",
    feltIntensity: "Intensidad sentida",
    intLeve: "Leve",
    intSevera: "Severa",
    aftershocks: "réplicas",
    damagePreliminary: "Datos preliminares",
    volunteer: "Voluntariado",
    volunteerTitle: "Súmate al voluntariado",
    volunteerSub:
      "HelpMap es un esfuerzo ciudadano que se construye con personal de salud y rescate en el terreno. Mientras más datos podamos confirmar, más rápido llenamos el mapa y más familias se reúnen.",
    volunteerAsk:
      "¿Quieres colaborar? Escríbenos con tu perfil y tus fuentes de información para darte acceso. Cada voluntario se verifica antes de habilitarlo: así protegemos la veracidad de los datos.",
    volunteerWa: "Escríbenos por WhatsApp",
    volunteerEmail: "Escríbenos por correo",
    volunteerWaMsg: "Hola, quiero colaborar como voluntario/a de HelpMap VE. Mi perfil es: (ej. médico, enfermero, rescatista) ___. Mis fuentes de información son: ___.",
    volunteerEmailSubj: "Quiero ser voluntario/a — HelpMap VE (perfil y fuentes)",
    volunteerNote:
      "Verificamos a cada colaborador. Los datos siempre se confirman con profesionales antes de publicarse.",
    donateJoin: "¿Ayudas con comida o medicamentos?",
    donateJoinSub:
      "Si entregas comidas o donaciones de medicamentos verificables, podemos sumarte a esta lista para que más gente te encuentre. Escríbenos.",
    donateJoinCta: "Quiero aparecer aquí",
    infoNeededTitle: "Necesitamos tu ayuda con información",
    infoNeeded:
      "Buscamos especialmente datos verificables de Morón, San Felipe y el estado Yaracuy, y de más hospitales en las zonas afectadas. Cualquier aporte suma.",
    shareDisclosure:
      "HelpMap trabaja para que solo datos confirmados en campo por contactos en centros de salud lleguen a la app.",
    trustLine: "Datos confirmados en campo. Nuestro compromiso es ser una fuente verídica — ayúdanos a clarificar aún más.",
    trustCta: "Colaborar",
    contact: "Contacto",
    contactTitle: "Escríbenos",
    contactSub: "Envíanos un mensaje. Puedes adjuntar imágenes (por ejemplo, listas o documentos).",
    contactName: "Tu nombre (opcional)",
    contactEmailLabel: "Tu correo (para responderte)",
    contactMsg: "Mensaje",
    contactPhotos: "Imágenes (opcional)",
    contactAddPhoto: "Adjuntar imagen",
    contactSend: "Enviar mensaje",
    contactSending: "Enviando…",
    contactSent: "Mensaje enviado. Gracias.",
    contactError: "No se pudo enviar. Intenta de nuevo.",
    contactAckTitle: "¡Recibimos tu mensaje!",
    contactAckBody:
      "Estamos evaluando tu solicitud y nos pondremos en contacto contigo tan pronto como sea posible. Si dejaste tu correo, también te enviamos esta confirmación allí. Gracias por sumarte.",
    contactAckClose: "Entendido",
    contactSegVol: "Voluntariado",
    contactSegDon: "Donaciones",
    tabVolunteers: "Voluntarios",
    tabLists: "Subir listas",
    addVolunteer: "Nuevo voluntario",
    volPass: "Contraseña temporal",
    volGenerate: "Generar",
    volCreate: "Crear voluntario",
    volCreated: "Voluntario creado y notificado por correo.",
    volCreatedNoMail: "Voluntario creado (correo no configurado).",
    volCreateErr: "No se pudo crear el voluntario.",
    volRevoke: "Revocar",
    volRevoked: "Acceso revocado.",
    volNone: "Aún no hay voluntarios.",
    volReviewNote: "Tus cambios se publican de inmediato. Eres parte del equipo de confianza — actúa con responsabilidad; podemos revocar el acceso en cualquier momento.",
    staffGuide: "Ver guía del equipo",
    listTitle: "Subir foto de lista",
    listHint:
      "Fotografía una lista de pacientes (manuscrita o impresa). Se envía al equipo para procesar (OCR) y revisar antes de publicarse.",
    listPick: "Tomar / elegir foto",
    listSending: "Enviando…",
    listSent: "Lista enviada para procesamiento.",
    listError: "No se pudo enviar la lista. Intenta de nuevo.",
    listNote: "Nota (opcional)",
    tabDonations: "Donaciones",
    addDonation: "Agregar iniciativa",
    editDonation: "Editar iniciativa",
    savedDon: "Iniciativa guardada",
    f_donName: "Nombre de la iniciativa",
    f_donDesc: "Descripción corta (opcional)",
    f_donSocial: "Link de red social (opcional)",
    f_donUrl: "Link de donación (opcional)",
    f_donInfo: "Datos para recibir donativos",
    f_donInfoHint: "Pago Móvil, cuenta, Zelle, Binance… (opcional)",
    donCopy: "Copiar datos",
    donData: "Datos para donar",
    donFollow: "Red social",
    donNone: "Aún no hay iniciativas. Agrega la primera.",
    contribCta: "Aportar foto / info",
    contribTitle: "Aportar información",
    contribFor: "Sobre",
    contribSub: "¿Conoces a esta persona? Ayúdanos a ponerle cara y confirmar sus datos. Tu aporte se envía al equipo para revisión antes de publicarse.",
    contribDescLabel: "¿Qué sabes? (descripción)",
    contribDescPh: "Ej.: es mi hermano, lo vi el martes en el área de emergencias…",
    contribPhoto: "Foto de la persona",
    contribSend: "Enviar aporte",
    contribSending: "Enviando…",
    contribNote: "Tu aporte NO se publica de inmediato. El equipo lo revisa y verifica antes de mostrarlo.",
    contribMinorNote: "Por protección, no se aceptan fotos de menores de edad.",
    contribAckTitle: "¡Gracias por tu aporte!",
    contribAckBody: "Lo estamos revisando. Si se confirma, ayudará a reunir a esta persona con su familia.",
    contribAckClose: "Cerrar",
    contribReq: "Agrega una foto o una descripción.",
    contribContact: "Tu contacto (opcional)",
    tabContribs: "Aportes",
    contribApprove: "Aprobar",
    contribReject: "Rechazar",
    contribApproved: "Aporte aprobado",
    contribRejected: "Aporte rechazado",
    contribNone: "No hay aportes pendientes.",
    contribReviewNote: "Aportes del público a registros existentes. Al aprobar una foto se adjunta a la persona (solo se ve en público si el registro está verificado).",
    maintBanner: "Sitio en mantenimiento: estamos re-verificando los datos. Algunos registros pueden no aparecer. Vuelve pronto.",
    maintTitle: "Modo mantenimiento",
    maintHint: "Muestra un aviso a todos los visitantes (los datos se están re-verificando y pueden estar incompletos).",
    maintActive: "Activo",
    maintInactive: "Inactivo",
    maintOn: "Modo mantenimiento activado",
    maintOff: "Modo mantenimiento desactivado",
    tabRescued: "Rescatados",
    rescuedListTitle: "Personas rescatadas",
    rescuedListSub: "Rescatadas en campo, aún sin trasladar a un centro. Información preliminar de equipos en sitio.",
    rescuedNone: "Aún no hay personas rescatadas reportadas.",
    rescuedStatus: "Rescatado",
    rescuedOpen: "Rescatados",
    addRescued: "Reportar rescatado",
    rescuedReviewNote: "Personas rescatadas en campo que aún no han sido trasladadas a un centro. Al agregarles ubicación y estatus clínico, pasan a ser pacientes en el mapa.",
    rescuedFieldNote: "Registra a quien se ha rescatado con los datos que tengas. Aparece en la lista pública de rescatados (sin foto hasta verificar). No va al mapa hasta asignarle un centro.",
    savedRescued: "Rescatado guardado",
    rescuedDeleted: "Rescatado eliminado",
    rescuedReqName: "Agrega al menos un nombre o apellido.",
    rescuedPublicNote: "Público: apellidos, nombres, edad, sexo y cédula (adultos). Nunca procedencia, contacto ni señas.",
    promote: "Trasladar a un centro",
    promoteTitle: "Trasladar a paciente",
    promoteHint: "Asigna el centro y el estatus clínico. El registro pasa a ser paciente y aparece en el mapa.",
    promoted: "Trasladado a paciente",
    f_rescueSite: "¿Dónde fue rescatado?",
    f_rescueSiteHint: "Referencia del sitio o derrumbe (uso interno, no se muestra en público).",
    f_notas: "Señas / condición",
    f_notasHint: "Descripción para identificar (uso interno, no se muestra en público).",
    admSearchPh: "Buscar en esta sección…",
    admSearchNone: "Sin coincidencias.",
  },
  en: {
    appName: "HelpMap VE", tagline: "Humanitarian OSINT",
    search: "Search by name, surname or ID", all: "All", allStates: "All states", allCenters: "All centers",
    report: "Report", people: "people", yrs: "yrs", noResults: "No results. Try another name or filter.",
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
    adminLocalNote: "Changes are saved to the database. The audit log (who changed what) is the next phase.",
    loggedInAs: "Session",
    f_contact: "Contact (WhatsApp/phone, optional)",
    f_minor: "Is a minor?",
    queuedOffline: "Offline. Saved. It will be sent when you're back online.",
    pendingSync: "pending to send when the connection returns",
    synced: "Submissions synced with the team.",
    reqNameLoc: "Enter at least a first/last name and the center.",
    igCopied: "Link copied. Paste it in your Instagram story or profile.",
    noteMinors: "Minors' information is strictly protected: we never show their photos. Full visibility is limited exclusively to medical staff and family members.",
    f_address: "Search by name or address", geoSearch: "Search", geoSearching: "Searching…",
    geoFound: "Location found — verify the pin on the map", geoNotFound: "Not found. Try the center's name or enter lat/lng manually.",
    geoHint: "Type the center's name (e.g. \"Hospital Central San Felipe\") or an address and tap Search. Always verify the pin.",
    geoPick: "Several matches — pick the right one:",
    photoBusy: "Processing photo…",
    photoError: "Couldn't process the image. Try another one.",
    removePhoto: "Remove photo",
    f_procedencia: "Home origin",
    f_procedenciaPh: "Neighborhood or area of origin",
    f_procedenciaHint: "Verification team only. Never shown publicly.",
    storyBuilding: "Generating image for your story…",
    storyShared: "Pick Instagram → Story and add the link sticker.",
    storyDownloaded: "We opened the image in a new tab: save it and upload it to your Instagram story.",
    storyError: "Couldn't create the image. Try again.",
    donate: "Donate",
    donateTitle: "Donate",
    donateSub: "Support the organizations helping on the ground.",
    donateCta: "Donate",
    donateNote: "Donations go directly to each organization. HelpMap neither receives nor manages funds.",
    saveError: "Couldn't save to the database. Try again.",
    delBlocked: "Couldn't delete. There may be people registered at this center.",
    directions: "Get directions",
    damageLayer: "Damage",
    damageLess: "Less",
    damageMore: "More",
    feltIntensity: "Felt intensity",
    intLeve: "Light",
    intSevera: "Severe",
    aftershocks: "aftershocks",
    damagePreliminary: "Preliminary data",
    volunteer: "Volunteer",
    volunteerTitle: "Join the volunteers",
    volunteerSub:
      "HelpMap is a citizen effort built with health and rescue staff on the ground. The more data we can confirm, the faster we fill the map and the more families reunite.",
    volunteerAsk:
      "Want to help? Message us with your profile and your information sources so we can grant you access. Every volunteer is vetted before being enabled — that's how we protect the accuracy of the data.",
    volunteerWa: "Message us on WhatsApp",
    volunteerEmail: "Email us",
    volunteerWaMsg: "Hi, I'd like to volunteer with HelpMap VE. My profile is: (e.g. doctor, nurse, rescuer) ___. My information sources are: ___.",
    volunteerEmailSubj: "I want to volunteer — HelpMap VE (profile and sources)",
    volunteerNote:
      "We vet every collaborator. Data is always confirmed with professionals before it's published.",
    donateJoin: "Helping with food or medicine?",
    donateJoinSub:
      "If you provide meals or verifiable medication donations, we can add you to this list so more people can find you. Get in touch.",
    donateJoinCta: "Add my organization",
    infoNeededTitle: "We need your help with information",
    infoNeeded:
      "We're especially looking for verifiable data from Morón, San Felipe and Yaracuy state, and from more hospitals in the affected areas. Every contribution helps.",
    shareDisclosure:
      "HelpMap works so that only data confirmed in the field by health-center contacts reaches the app.",
    trustLine: "Field-confirmed data. Our commitment is to be a truthful source — help us clarify it further.",
    trustCta: "Help out",
    contact: "Contact",
    contactTitle: "Write to us",
    contactSub: "Send us a message. You can attach images (e.g. lists or documents).",
    contactName: "Your name (optional)",
    contactEmailLabel: "Your email (so we can reply)",
    contactMsg: "Message",
    contactPhotos: "Images (optional)",
    contactAddPhoto: "Attach image",
    contactSend: "Send message",
    contactSending: "Sending…",
    contactSent: "Message sent. Thank you.",
    contactError: "Couldn't send. Try again.",
    contactAckTitle: "We got your message!",
    contactAckBody:
      "We're reviewing your request and will get in touch as soon as possible. If you left your email, we also sent this confirmation there. Thank you for reaching out.",
    contactAckClose: "Got it",
    contactSegVol: "Volunteer",
    contactSegDon: "Donations",
    tabVolunteers: "Volunteers",
    tabLists: "Upload lists",
    addVolunteer: "New volunteer",
    volPass: "Temp password",
    volGenerate: "Generate",
    volCreate: "Create volunteer",
    volCreated: "Volunteer created and emailed.",
    volCreatedNoMail: "Volunteer created (email not configured).",
    volCreateErr: "Couldn't create the volunteer.",
    volRevoke: "Revoke",
    volRevoked: "Access revoked.",
    volNone: "No volunteers yet.",
    volReviewNote: "Your changes publish immediately. You're trusted team — act responsibly; access can be revoked at any time.",
    staffGuide: "View team guide",
    listTitle: "Upload list photo",
    listHint:
      "Photograph a patient list (handwritten or printed). It's sent to the team to process (OCR) and review before publishing.",
    listPick: "Take / choose photo",
    listSending: "Sending…",
    listSent: "List sent for processing.",
    listError: "Couldn't send the list. Try again.",
    listNote: "Note (optional)",
    tabDonations: "Donations",
    addDonation: "Add initiative",
    editDonation: "Edit initiative",
    savedDon: "Initiative saved",
    f_donName: "Initiative name",
    f_donDesc: "Short description (optional)",
    f_donSocial: "Social link (optional)",
    f_donUrl: "Donation link (optional)",
    f_donInfo: "How to donate (details)",
    f_donInfoHint: "Pago Móvil, account, Zelle, Binance… (optional)",
    donCopy: "Copy details",
    donData: "How to donate",
    donFollow: "Social",
    donNone: "No initiatives yet. Add the first one.",
    contribCta: "Contribute photo / info",
    contribTitle: "Contribute information",
    contribFor: "About",
    contribSub: "Do you know this person? Help us put a face to the record and confirm their details. Your contribution is sent to the team for review before it appears.",
    contribDescLabel: "What do you know? (description)",
    contribDescPh: "E.g.: he's my brother, I saw him Tuesday in the ER…",
    contribPhoto: "Photo of the person",
    contribSend: "Send contribution",
    contribSending: "Sending…",
    contribNote: "Your contribution is NOT published immediately. The team reviews and verifies it before showing it.",
    contribMinorNote: "For their protection, photos of minors are not accepted.",
    contribAckTitle: "Thank you for your contribution!",
    contribAckBody: "We're reviewing it. If confirmed, it will help reunite this person with their family.",
    contribAckClose: "Close",
    contribReq: "Add a photo or a description.",
    contribContact: "Your contact (optional)",
    tabContribs: "Contributions",
    contribApprove: "Approve",
    contribReject: "Reject",
    contribApproved: "Contribution approved",
    contribRejected: "Contribution rejected",
    contribNone: "No pending contributions.",
    contribReviewNote: "Public contributions to existing records. Approving a photo attaches it to the person (it only shows publicly if the record is verified).",
    maintBanner: "Site under maintenance: we're re-verifying the data. Some records may not appear. Check back soon.",
    maintTitle: "Maintenance mode",
    maintHint: "Shows a notice to all visitors (data is being re-verified and may be incomplete).",
    maintActive: "On",
    maintInactive: "Off",
    maintOn: "Maintenance mode enabled",
    maintOff: "Maintenance mode disabled",
    tabRescued: "Rescued",
    rescuedListTitle: "Rescued people",
    rescuedListSub: "Rescued in the field, not yet transferred to a center. Preliminary info from on-site teams.",
    rescuedNone: "No rescued people reported yet.",
    rescuedStatus: "Rescued",
    rescuedOpen: "Rescued",
    addRescued: "Report rescued person",
    rescuedReviewNote: "People rescued in the field, not yet transferred to a center. Adding a location and clinical status turns them into patients on the map.",
    rescuedFieldNote: "Log who has been rescued with whatever data you have. It appears in the public rescued list (no photo until verified). It does not hit the map until a center is assigned.",
    savedRescued: "Rescued person saved",
    rescuedDeleted: "Rescued person deleted",
    rescuedReqName: "Add at least a first name or surname.",
    rescuedPublicNote: "Public: surname, first names, age, sex and ID (adults). Never home origin, contact or notes.",
    promote: "Transfer to a center",
    promoteTitle: "Transfer to patient",
    promoteHint: "Assign the center and clinical status. The record becomes a patient and shows on the map.",
    promoted: "Transferred to patient",
    f_rescueSite: "Where were they rescued?",
    f_rescueSiteHint: "Site or collapse reference (internal use, not shown publicly).",
    f_notas: "Notes / condition",
    f_notasHint: "Description to help identify (internal use, not shown publicly).",
    admSearchPh: "Search in this section…",
    admSearchNone: "No matches.",
  },
};

// Extra protection layer for minors (defense in depth). The DB `patients_public`
// view already nulls minor photos/CI, but the client must NEVER trust a single
// source: apply this to every patient record entering the app (view fetch, cached
// reads, admin inserts). If a record is a minor — by flag OR by age < 18 — we hard
// strip the photo and force CI to "MENOR", regardless of what arrived. See CLAUDE.md §2.
export function protectMinor(p: PatientPublic): PatientPublic {
  const minor = p.is_minor || (p.edad != null && p.edad < 18);
  if (!minor) return p;
  if (p.foto_url === null && p.ci_display === "MENOR" && p.is_minor) return p; // already clean
  return { ...p, is_minor: true, ci_display: "MENOR", foto_url: null };
}

// Same defense-in-depth for rescatados (no location/estatus, same privacy rules).
export function protectMinorRescatado(r: RescatadoPublic): RescatadoPublic {
  const minor = r.is_minor || (r.edad != null && r.edad < 18);
  if (!minor) return r;
  if (r.foto_url === null && r.ci_display === "MENOR" && r.is_minor) return r; // already clean
  return { ...r, is_minor: true, ci_display: "MENOR", foto_url: null };
}

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
