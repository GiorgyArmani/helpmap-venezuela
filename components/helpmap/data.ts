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
export type LocationType = "hospital" | "shelter" | "morgue" | "donation_centre" | "comedor";
export type Estatus = "INGRESADO" | "ALTA" | "FALLECIDO";
export type Sexo = "M" | "F";
export type Lang = "es" | "en" | "pt";

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

// `refugios` table — companion (1:1 by location_id) to a `locations` row of
// type=shelter. Holds the editable, shelter-specific info AcopioVE provides: what the
// shelter RECEIVES (recibe) and what it NEEDS now (necesita). No sensitive fields, so
// anon reads it directly; staff (volunteer OR admin) edit it. See db/refugios.sql.
export interface Refugio {
  location_id: string;
  recibe: string[];
  necesita: string | null;
  horario: string | null;
  responsable: string | null;
  fuente: string | null;
  address: string | null;
  external_id: string | null;
  es_animal: boolean;
  last_confirmed_at: string | null;
  updated_at?: string;
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

// `volunteer_requests` — public volunteer applications an admin reviews. Read by admins
// only (the public can submit but never read the queue). See db/volunteer_requests.sql.
export interface VolunteerRequest {
  id: string;
  nombre: string;
  email: string;
  perfil: string | null;
  fuentes: string | null;
  telefono: string | null;
  created_at: string;
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
  pt: string;
  hasPatients: boolean;
  // Pin color is driven by the location TYPE, not by patient status — otherwise a
  // hospital whose worst record is FALLECIDO would paint its pin the gray of the
  // "fallecido" filter and misread as a death toll. Type colors are chosen to be
  // distinct from the status-filter colors in SM (blue/green/gray).
  color: string;
}

export const TYPE_META: Record<LocationType, TypeMeta> = {
  hospital: { es: "Hospital", en: "Hospital", pt: "Hospital", hasPatients: true, color: "oklch(0.58 0.15 25)" },
  shelter: { es: "Refugio", en: "Shelter", pt: "Abrigo", hasPatients: true, color: "oklch(0.68 0.15 70)" },
  morgue: { es: "Morgue", en: "Morgue", pt: "Necrotério", hasPatients: true, color: "oklch(0.5 0.03 280)" },
  donation_centre: {
    es: "Centro de acopio",
    en: "Donation centre",
    pt: "Centro de doação",
    hasPatients: false,
    color: "oklch(0.6 0.15 300)",
  },
  // Comedor = free community kitchen (e.g. World Central Kitchen). Informational pin,
  // no patients — like donation_centre. Teal color: distinct from the status filters
  // (blue/green/gray in SM) AND the other type colors (red/amber/gray/purple).
  comedor: { es: "Comedor", en: "Free kitchen", pt: "Cozinha", hasPatients: false, color: "oklch(0.64 0.12 190)" },
};

export interface StatusMeta {
  es: string;
  en: string;
  pt: string;
  cls: string;
  dotCls: string;
  color: string;
}

export const SM: Record<Estatus, StatusMeta> = {
  INGRESADO: { es: "Ingresado", en: "Admitted", pt: "Internado", cls: "st-adm", dotCls: "cdot-adm", color: "oklch(0.62 0.13 250)" },
  ALTA: { es: "De alta", en: "Discharged", pt: "Alta", cls: "st-ok", dotCls: "cdot-ok", color: "oklch(0.66 0.11 155)" },
  FALLECIDO: { es: "Fallecido", en: "Deceased", pt: "Falecido", cls: "st-dec", dotCls: "cdot-dec", color: "oklch(0.52 0.03 280)" },
};

export const ESTATUS_ORDER: Estatus[] = ["INGRESADO", "ALTA", "FALLECIDO"];

export interface Strings {
  appName: string; tagline: string; search: string; all: string; allStates: string; allCenters: string;
  report: string; people: string; yrs: string; noResults: string; browseHint: string; female: string; male: string;
  ci: string; edad: string; sexo: string; ubic: string; type: string; municipality: string; state: string;
  verified: string; verifiedYes: string; verifiedNo: string; verifiedInfo: string; updated: string; share: string; seeMap: string;
  listFreshness: string; listFreshnessNamed: string;
  detailTitle: string; reportTitle: string; whatsapp: string; call: string;
  noPatientsHere: string; donationInfo: string; allTypes: string; centerSearch: string; staleData: string;
  comedorTitle: string; comedorDesc: string; comedorHours: string; comedorDonate: string;
  f_ape: string; f_nom: string; f_ci: string; f_edad: string; f_sexo: string; f_ubic: string;
  f_photo: string; f_photoHint: string; selectHosp: string; submit: string; note: string; sent: string;
  shareTitle: string; shareDesc: string; cardKicker: string; copyLink: string; copied: string; updatedAgo: string;
  adminTitle: string; tabCenters: string; tabPeople: string; addCenter: string; addPerson: string;
  editCenter: string; editPerson: string; save: string; cancel: string; del: string;
  f_name: string; f_city: string; f_parish: string; f_lat: string; f_lng: string; f_status: string; f_center: string;
  hasPhoto: string; yes: string; no: string; savedC: string; savedP: string; deleted: string; records: string;
  login: string; loginTitle: string; email: string; password: string; signIn: string; signOut: string;
  loginError: string; loginHint: string; adminLocalNote: string; loggedInAs: string;
  forgotPass: string; recoverHint: string; sendLink: string; recoverSent: string; backToLogin: string;
  f_contact: string; f_minor: string; queuedOffline: string; pendingSync: string; synced: string; reqNameLoc: string;
  igCopied: string; noteMinors: string;
  f_address: string; geoSearch: string; geoSearching: string; geoFound: string; geoNotFound: string; geoHint: string; geoPick: string;
  geoPickMap: string; geoPickHint: string; geoPickBanner: string; geoPickDone: string;
  photoBusy: string; photoError: string; removePhoto: string;
  f_procedencia: string; f_procedenciaPh: string; f_procedenciaHint: string;
  f_dataDate: string; f_dataDateHint: string;
  storyBuilding: string; storyShared: string; storyDownloaded: string; storyError: string;
  donate: string; donateTitle: string; donateSub: string; donateCta: string; donateNote: string;
  saveError: string; delBlocked: string;
  directions: string;
  damageLayer: string; damageLess: string; damageMore: string;
  feltIntensity: string; intLeve: string; intSevera: string; aftershocks: string; damagePreliminary: string;
  locateMe: string; locateDenied: string; locateUnsupported: string; locateFailed: string;
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
  tabNews: string; newsEmpty: string; newsRefresh: string; newsPublic: string; newsSystem: string;
  newsPendingContribs: string; newsPendingVols: string;
  addVolunteer: string; volPass: string; volGenerate: string; volCreate: string;
  volCreated: string; volCreatedNoMail: string; volCreateErr: string;
  volRevoke: string; volRevoked: string; volNone: string; volReviewNote: string; staffGuide: string;
  listTitle: string; listHint: string; listPick: string; listSending: string;
  listSent: string; listSentN: string; listSentPartial: string; listError: string; listNote: string;
  listDate: string; listDateHint: string;
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
  contribPublishConfirm: string; contribPublishTitle: string;
  maintBanner: string; maintTitle: string; maintHint: string;
  maintActive: string; maintInactive: string; maintOn: string; maintOff: string;
  tabRescued: string; rescuedListTitle: string; rescuedListSub: string; rescuedNone: string;
  rescuedStatus: string; rescuedOpen: string; addRescued: string; rescuedReviewNote: string;
  rescuedFieldNote: string; savedRescued: string; rescuedDeleted: string; rescuedReqName: string;
  rescuedPublicNote: string; promote: string; promoteTitle: string; promoteHint: string; promoted: string;
  f_rescueSite: string; f_rescueSiteHint: string; f_notas: string; f_notasHint: string;
  admSearchPh: string; admSearchNone: string;
  volSignupCta: string; volSignupTitle: string; volSignupSub: string; f_volName: string;
  f_volProfile: string; f_volProfilePh: string; f_volSources: string; f_volSourcesPh: string;
  f_volPhone: string; volSignupSend: string; volSignupSending: string; volSignupNote: string;
  volSignupReq: string; volSignupDoneTitle: string; volSignupDoneBody: string;
  volRequests: string; volReqNone: string; volApprove: string; volReject: string;
  volApproved: string; volRejected: string; volReqReviewNote: string;
  volSignupPass: string; volSignupPassHint: string; volPassShort: string; volEmailTaken: string;
  volReqWhy: string;
  fabCta: string;
  menuReportTitle: string; menuReportSub: string; menuContribTitle: string; menuContribSub: string;
  rmTitle: string; rmIntro: string; rmWho: string; rmZona: string; rmZonaPh: string;
  rmDesc: string; rmDescPh: string; rmReporter: string; rmContact: string; rmContactHint: string;
  rmSubmit: string; rmNote: string; rmReqName: string; rmSent: string;
  rmDoneTitle: string; rmDoneBody: string; rmDoneClose: string;
  tabReports: string; reportsNone: string; newsPendingReports: string;
  reportMarkReviewed: string; reportCloseAction: string; reportReporter: string;
  reportZonaLabel: string; reportUpdated: string;
  updatedTitle: string; cardDisclaimer: string;
  refShelterInfo: string; refReceives: string; refNeeds: string; refSchedule: string;
  refManager: string; refConfirmed: string; refSource: string; refAnimal: string;
  refNoNeeds: string;
  refEditTitle: string; f_refRecibe: string; f_refRecibeHint: string; f_refNecesita: string;
  f_refNecesitaHint: string; f_refHorario: string; f_refResponsable: string; f_refAddress: string;
  f_refAnimal: string;
  refNeedBar: string; refListTitle: string; refListSub: string; refListEmpty: string;
  refShareCta: string; refShareTag: string; refHelpHow: string; refAttrib: string;
}

export const T: Record<Lang, Strings> = {
  es: {
    appName: "HelpMap VE", tagline: "OSINT humanitario",
    search: "Buscar por nombre, apellido o cédula", all: "Todos", allStates: "Todos los estados", allCenters: "Todos los centros",
    report: "Reportar", people: "personas", yrs: "años", noResults: "Sin resultados. Intenta con otro nombre o filtro.",
    browseHint: "Busca un nombre o cédula, o toca un centro en el mapa para ver la lista.",
    female: "Femenino", male: "Masculino", ci: "Cédula", edad: "Edad", sexo: "Sexo", ubic: "Centro", type: "Tipo",
    municipality: "Municipio", state: "Estado", verified: "Verificado", verifiedYes: "Verificado", verifiedNo: "Sin verificar",
    verifiedInfo: "Nuestro equipo confirmó este dato directamente con el centro o la familia. \"Sin verificar\" viene de fuentes automatizadas y puede tener errores.",
    listFreshness: "Lista actualizada {time}", listFreshnessNamed: "Datos de {name} actualizados {time}",
    updated: "Actualizado", share: "Compartir", seeMap: "Ver en el mapa", detailTitle: "Ficha de la persona",
    reportTitle: "Aportar datos", whatsapp: "WhatsApp", call: "Llamar",
    noPatientsHere: "Aún no hay personas registradas en este centro.",
    donationInfo: "Centro de acopio · información de contacto",
    allTypes: "Todos los tipos",
    centerSearch: "Buscar centro…",
    comedorTitle: "Comedor gratuito",
    comedorDesc:
      "Administrado por World Central Kitchen. Comida caliente y gratuita para quien la necesite; no hace falta registrarse ni buscar a nadie en una lista.",
    comedorHours: "Comida servida de 12:00 a 1:30 p. m. (hora local).",
    comedorDonate: "Apoyar a World Central Kitchen",
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
    forgotPass: "¿Olvidaste tu contraseña?",
    recoverHint: "Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.",
    sendLink: "Enviar enlace",
    recoverSent: "Si ese correo tiene una cuenta, te enviamos un enlace de recuperación. Revisa tu bandeja de entrada (y la carpeta de spam).",
    backToLogin: "← Volver a iniciar sesión",
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
    geoFound: "Ubicación encontrada. Verifica el pin en el mapa", geoNotFound: "No se encontró. Abre el sitio en Google Maps, copia el enlace o las coordenadas y pégalas aquí.",
    geoHint: "Escribe el nombre del centro o una dirección. ¿No aparece? Usa \"Ubicar en el mapa\" y toca el sitio, o pega el enlace/coordenadas de Google Maps. Verifica siempre el pin.",
    geoPick: "Varias coincidencias, elige la correcta:",
    geoPickMap: "Ubicar tocando el mapa",
    geoPickHint: "¿No hay coordenadas ni sale en la búsqueda? Toca este botón y marca el punto en el mapa. Luego puedes arrastrar el pin para ajustarlo.",
    geoPickBanner: "Toca el mapa en el lugar del centro",
    geoPickDone: "Listo",
    photoBusy: "Procesando foto…",
    photoError: "No se pudo procesar la imagen. Intenta con otra.",
    removePhoto: "Quitar foto",
    f_procedencia: "Procedencia",
    f_procedenciaPh: "Zona o sector de origen",
    f_procedenciaHint: "Solo para el equipo de verificación. No se muestra públicamente.",
    f_dataDate: "Fecha del dato",
    f_dataDateHint: "¿De cuándo es esta información? Puede diferir de la fecha de hoy.",
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
    locateMe: "Mi ubicación",
    locateDenied: "Activa el permiso de ubicación en tu navegador para verte en el mapa.",
    locateUnsupported: "Tu navegador no admite geolocalización.",
    locateFailed: "No se pudo obtener tu ubicación. Intenta de nuevo.",
    volunteer: "Ayudar",
    volunteerTitle: "Súmate para ayudar",
    volunteerSub:
      "HelpMap es un esfuerzo ciudadano que se construye con personal de salud y rescate en el terreno. Mientras más datos podamos confirmar, más rápido llenamos el mapa y más familias se reúnen.",
    volunteerAsk:
      "¿Quieres ayudar? Escríbenos con tu perfil y tus fuentes de información para darte acceso. Verificamos a cada persona antes de habilitarla: así protegemos la veracidad de los datos.",
    volunteerWa: "Escríbenos por WhatsApp",
    volunteerEmail: "Escríbenos por correo",
    volunteerWaMsg: "Hola, quiero ayudar con HelpMap VE. Mi perfil es: (ej. médico, enfermero, rescatista) ___. Mis fuentes de información son: ___.",
    volunteerEmailSubj: "Quiero ayudar en HelpMap VE (perfil y fuentes)",
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
    trustLine: "Datos confirmados en campo. Nuestro compromiso es ser una fuente verídica. Ayúdanos a clarificar aún más.",
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
    contactSegVol: "Ayudar",
    contactSegDon: "Donaciones",
    tabVolunteers: "Voluntarios",
    tabLists: "Subir listas",
    tabNews: "Novedades",
    newsEmpty: "Sin actividad reciente todavía.",
    newsRefresh: "Actualizar",
    newsPublic: "Público",
    newsSystem: "Sistema (n8n)",
    newsPendingContribs: "{n} aporte(s) por revisar",
    newsPendingVols: "{n} solicitud(es) de voluntariado",
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
    volReviewNote: "Tus cambios se publican de inmediato. Eres parte del equipo de confianza. Actúa con responsabilidad; podemos revocar el acceso en cualquier momento.",
    staffGuide: "Ver guía del equipo",
    listTitle: "Subir foto de lista",
    listHint:
      "Fotografía una o varias listas de pacientes (manuscritas o impresas). Puedes elegir varias fotos del mismo centro a la vez. Se envían al equipo para procesar (OCR) y revisar antes de publicarse.",
    listPick: "Tomar / elegir fotos",
    listSending: "Enviando…",
    listSent: "Lista enviada para procesamiento.",
    listSentN: "{n} listas enviadas para procesamiento.",
    listSentPartial: "{ok} de {total} enviadas. Reintenta las que fallaron.",
    listError: "No se pudo enviar la lista. Intenta de nuevo.",
    listNote: "Nota (opcional)",
    listDate: "Fecha del dato",
    listDateHint: "¿De cuándo es esta lista? Puede diferir de la fecha de hoy.",
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
    contribPublishConfirm:
      "Esta persona ya está VERIFICADA, así que aprobar esta foto la hará pública de inmediato (sin paso adicional). ¿Confirmas que la foto es correcta y puede mostrarse públicamente?",
    contribPublishTitle: "Publicar foto",
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
    volSignupCta: "Quiero ayudar",
    volSignupTitle: "Regístrate para ayudar",
    volSignupSub: "Crea tu acceso. La cuenta queda inactiva hasta que un administrador apruebe tu solicitud.",
    f_volName: "Nombre y apellido",
    f_volProfile: "Tu perfil",
    f_volProfilePh: "Selecciona tu perfil",
    f_volSources: "Tus fuentes de información / por qué darte acceso",
    f_volSourcesPh: "Cuéntanos tu rol y de dónde sacas información veraz…",
    f_volPhone: "Teléfono / WhatsApp (opcional)",
    volSignupSend: "Enviar solicitud",
    volSignupSending: "Enviando…",
    volSignupNote: "Verificamos cada colaborador antes de habilitarlo: así protegemos la veracidad de los datos.",
    volSignupReq: "Agrega tu nombre y un correo válido.",
    volSignupDoneTitle: "¡Solicitud enviada!",
    volSignupDoneBody: "Tu cuenta quedó creada pero inactiva. Cuando un administrador apruebe tu solicitud, podrás entrar en /login con el correo y la contraseña que elegiste.",
    volRequests: "Solicitudes pendientes",
    volReqNone: "No hay solicitudes pendientes.",
    volApprove: "Aprobar",
    volReject: "Rechazar",
    volApproved: "Voluntario aprobado y notificado por correo",
    volRejected: "Solicitud rechazada",
    volReqReviewNote: "Solicitudes públicas de voluntariado. La cuenta ya existe (sin acceso); al aprobar se le activa el rol. Rechazar elimina la cuenta.",
    volSignupPass: "Crea tu contraseña",
    volSignupPassHint: "Mínimo 6 caracteres. La usarás para entrar una vez aprobada tu solicitud.",
    volPassShort: "La contraseña debe tener al menos 6 caracteres.",
    volEmailTaken: "Ese correo ya está registrado.",
    volReqWhy: "Por qué darle acceso / sus fuentes",
    fabCta: "Colaborar",
    menuReportTitle: "Reportar desaparecido",
    menuReportSub: "Buscas a alguien que no aparece en la lista",
    menuContribTitle: "Aportar datos",
    menuContribSub: "Tienes información de alguien en un centro",
    rmTitle: "Reportar desaparecido",
    rmIntro: "Cuéntanos a quién buscas. El equipo revisará la base de datos y te contactará si hay información. No se publica en el mapa.",
    rmWho: "¿A quién buscas?",
    rmZona: "Última zona o centro conocido",
    rmZonaPh: "Ej. Catia, Hospital Vargas…",
    rmDesc: "Detalles (señas, circunstancias)",
    rmDescPh: "Todo lo que ayude a identificar o ubicar a la persona…",
    rmReporter: "Tu nombre",
    rmContact: "Tu contacto (WhatsApp / correo)",
    rmContactHint: "Para que el equipo pueda comunicarse contigo. No se muestra públicamente.",
    rmSubmit: "Enviar reporte",
    rmNote: "El equipo revisa cada reporte y busca en la base de datos. Te contactaremos si hay novedades.",
    rmReqName: "Indica al menos el nombre o el apellido de la persona.",
    rmSent: "Reporte enviado. Gracias.",
    rmDoneTitle: "Reporte recibido",
    rmDoneBody: "Gracias. El equipo revisará la base de datos y te contactará por el medio que dejaste si hay información.",
    rmDoneClose: "Entendido",
    tabReports: "Reportes",
    reportsNone: "No hay reportes pendientes.",
    newsPendingReports: "{n} reportes de desaparecidos",
    reportMarkReviewed: "Revisado",
    reportCloseAction: "Cerrar",
    reportReporter: "Reporta",
    reportZonaLabel: "Última zona",
    reportUpdated: "Reporte actualizado.",
    updatedTitle: "Última actualización",
    cardDisclaimer:
      "Los datos reflejan el último registro disponible y su fecha. En una emergencia hay múltiples traslados: esta lista no garantiza que la persona siga en ese centro, pero sí la veracidad y la fecha del dato publicado. La información se actualiza a medida que llegan nuevos aportes. Úsala como herramienta de búsqueda, consulta y colaboración ciudadana.",
    refShelterInfo: "Refugio · información y necesidades",
    refReceives: "Recibe donaciones de",
    refNeeds: "Necesita ahora",
    refSchedule: "Horario",
    refManager: "Responsable",
    refConfirmed: "Confirmado",
    refSource: "Fuente",
    refAnimal: "Refugio de animales",
    refNoNeeds: "Este refugio aún no ha reportado necesidades específicas. Puedes contactarlo para saber cómo ayudar.",
    refEditTitle: "Necesidades del refugio",
    f_refRecibe: "Recibe (tipos de donación)",
    f_refRecibeHint: "Separa cada tipo con una coma (ej.: Agua, Medicamentos, Pañales).",
    f_refNecesita: "Necesita ahora",
    f_refNecesitaHint: "Qué hace falta con urgencia. Actualízalo cuando cambie.",
    f_refHorario: "Horario",
    f_refResponsable: "Responsable / contacto",
    f_refAddress: "Dirección / referencia",
    f_refAnimal: "¿Es refugio de animales?",
    refNeedBar: "{n} refugios necesitan ayuda",
    refListTitle: "Refugios · cómo colaborar",
    refListSub: "Necesidades reportadas por refugios y puntos de acopio. Colabora como puedas, donde puedas: acércales lo que necesitan, o comparte para que llegue a más gente.",
    refListEmpty: "Aún no hay necesidades reportadas. Vuelve pronto.",
    refShareCta: "Compartir necesidad",
    refShareTag: "Colabora como puedas, donde puedas · HelpMap VE",
    refHelpHow: "Cómo ayudar",
    refAttrib: "Datos de refugios: AcopioVE (acopiove.org) · CC-BY 4.0",
  },
  en: {
    appName: "HelpMap VE", tagline: "Humanitarian OSINT",
    search: "Search by name, surname or ID", all: "All", allStates: "All states", allCenters: "All centers",
    report: "Report", people: "people", yrs: "yrs", noResults: "No results. Try another name or filter.",
    browseHint: "Search a name or ID, or tap a center on the map to see the list.",
    female: "Female", male: "Male", ci: "ID (CI)", edad: "Age", sexo: "Sex", ubic: "Center", type: "Type",
    municipality: "Municipality", state: "State", verified: "Verified", verifiedYes: "Verified", verifiedNo: "Unverified",
    verifiedInfo: "Our team confirmed this directly with the center or the family. \"Unverified\" comes from automated sources and may contain errors.",
    listFreshness: "List updated {time}", listFreshnessNamed: "{name} data updated {time}",
    updated: "Updated", share: "Share", seeMap: "See on map", detailTitle: "Person record",
    reportTitle: "Add data", whatsapp: "WhatsApp", call: "Call",
    noPatientsHere: "No people registered at this center yet.",
    donationInfo: "Donation centre · contact information",
    allTypes: "All types",
    centerSearch: "Search center…",
    comedorTitle: "Free community kitchen",
    comedorDesc:
      "Run by World Central Kitchen. Free hot meals for anyone who needs them — no registration and no searching a list.",
    comedorHours: "Meals served 12:00–1:30 p.m. (local time).",
    comedorDonate: "Support World Central Kitchen",
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
    forgotPass: "Forgot your password?",
    recoverHint: "Enter your email and we'll send you a link to set a new password.",
    sendLink: "Send link",
    recoverSent: "If that email has an account, we sent a recovery link. Check your inbox (and spam folder).",
    backToLogin: "← Back to sign in",
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
    geoFound: "Location found. Verify the pin on the map", geoNotFound: "Not found. Open the place in Google Maps, copy the link or its coordinates and paste them here.",
    geoHint: "Type the center's name or an address. Not showing? Use \"Pin on the map\" and tap the spot, or paste the Google Maps link/coordinates. Always verify the pin.",
    geoPick: "Several matches, pick the right one:",
    geoPickMap: "Pin it on the map",
    geoPickHint: "No coordinates and not in search? Tap this button and mark the spot on the map. You can then drag the pin to fine-tune.",
    geoPickBanner: "Tap the map where the center is",
    geoPickDone: "Done",
    photoBusy: "Processing photo…",
    photoError: "Couldn't process the image. Try another one.",
    removePhoto: "Remove photo",
    f_procedencia: "Home origin",
    f_procedenciaPh: "Neighborhood or area of origin",
    f_procedenciaHint: "Verification team only. Never shown publicly.",
    f_dataDate: "Date of the data",
    f_dataDateHint: "When is this information from? It may differ from today's date.",
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
    locateMe: "My location",
    locateDenied: "Turn on location permission in your browser to see yourself on the map.",
    locateUnsupported: "Your browser doesn't support geolocation.",
    locateFailed: "Couldn't get your location. Try again.",
    volunteer: "Help",
    volunteerTitle: "Join in and help",
    volunteerSub:
      "HelpMap is a citizen effort built with health and rescue staff on the ground. The more data we can confirm, the faster we fill the map and the more families reunite.",
    volunteerAsk:
      "Want to help? Message us with your profile and your information sources so we can grant you access. Every volunteer is vetted before being enabled. That's how we protect the accuracy of the data.",
    volunteerWa: "Message us on WhatsApp",
    volunteerEmail: "Email us",
    volunteerWaMsg: "Hi, I'd like to help with HelpMap VE. My profile is: (e.g. doctor, nurse, rescuer) ___. My information sources are: ___.",
    volunteerEmailSubj: "I want to help at HelpMap VE (profile and sources)",
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
    trustLine: "Field-confirmed data. Our commitment is to be a truthful source. Help us clarify it further.",
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
    contactSegVol: "Help",
    contactSegDon: "Donations",
    tabVolunteers: "Volunteers",
    tabLists: "Upload lists",
    tabNews: "Activity",
    newsEmpty: "No recent activity yet.",
    newsRefresh: "Refresh",
    newsPublic: "Public",
    newsSystem: "System (n8n)",
    newsPendingContribs: "{n} contribution(s) to review",
    newsPendingVols: "{n} volunteer application(s)",
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
    volReviewNote: "Your changes publish immediately. You're trusted team, so act responsibly; access can be revoked at any time.",
    staffGuide: "View team guide",
    listTitle: "Upload list photo",
    listHint:
      "Photograph one or more patient lists (handwritten or printed). You can pick several photos from the same center at once. They're sent to the team to process (OCR) and review before publishing.",
    listPick: "Take / choose photos",
    listSending: "Sending…",
    listSent: "List sent for processing.",
    listSentN: "{n} lists sent for processing.",
    listSentPartial: "{ok} of {total} sent. Retry the ones that failed.",
    listError: "Couldn't send the list. Try again.",
    listNote: "Note (optional)",
    listDate: "Date of the data",
    listDateHint: "When is this list from? It may differ from today's date.",
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
    contribPublishConfirm:
      "This person is already VERIFIED, so approving this photo publishes it immediately (no extra step). Confirm the photo is correct and may be shown publicly?",
    contribPublishTitle: "Publish photo",
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
    volSignupCta: "I want to help",
    volSignupTitle: "Register to help",
    volSignupSub: "Create your access. The account stays inactive until an admin approves your application.",
    f_volName: "Full name",
    f_volProfile: "Your profile",
    f_volProfilePh: "Select your profile",
    f_volSources: "Your information sources / why grant you access",
    f_volSourcesPh: "Tell us your role and where your truthful info comes from…",
    f_volPhone: "Phone / WhatsApp (optional)",
    volSignupSend: "Send application",
    volSignupSending: "Sending…",
    volSignupNote: "We verify every collaborator before enabling them. That's how we protect the data's accuracy.",
    volSignupReq: "Add your name and a valid email.",
    volSignupDoneTitle: "Application sent!",
    volSignupDoneBody: "Your account is created but inactive. Once an admin approves your application, you can sign in at /login with the email and password you chose.",
    volRequests: "Pending applications",
    volReqNone: "No pending applications.",
    volApprove: "Approve",
    volReject: "Reject",
    volApproved: "Volunteer approved and emailed",
    volRejected: "Application rejected",
    volReqReviewNote: "Public volunteer applications. The account already exists (no access); approving grants the role. Rejecting deletes the account.",
    volSignupPass: "Create your password",
    volSignupPassHint: "At least 6 characters. You'll use it to sign in once your application is approved.",
    volPassShort: "Password must be at least 6 characters.",
    volEmailTaken: "That email is already registered.",
    volReqWhy: "Why grant access / their sources",
    fabCta: "Contribute",
    menuReportTitle: "Report a missing person",
    menuReportSub: "You're looking for someone not on the list",
    menuContribTitle: "Add data",
    menuContribSub: "You have info about someone at a center",
    rmTitle: "Report a missing person",
    rmIntro: "Tell us who you're looking for. The team will check the database and contact you if there's information. It is not published on the map.",
    rmWho: "Who are you looking for?",
    rmZona: "Last known area or center",
    rmZonaPh: "e.g. Catia, Hospital Vargas…",
    rmDesc: "Details (description, circumstances)",
    rmDescPh: "Anything that helps identify or locate the person…",
    rmReporter: "Your name",
    rmContact: "Your contact (WhatsApp / email)",
    rmContactHint: "So the team can reach you. Never shown publicly.",
    rmSubmit: "Send report",
    rmNote: "The team reviews every report and searches the database. We'll contact you if there's news.",
    rmReqName: "Enter at least the person's first or last name.",
    rmSent: "Report sent. Thank you.",
    rmDoneTitle: "Report received",
    rmDoneBody: "Thank you. The team will check the database and contact you through the details you left if there's information.",
    rmDoneClose: "Got it",
    tabReports: "Reports",
    reportsNone: "No pending reports.",
    newsPendingReports: "{n} missing-person reports",
    reportMarkReviewed: "Reviewed",
    reportCloseAction: "Close",
    reportReporter: "Reported by",
    reportZonaLabel: "Last area",
    reportUpdated: "Report updated.",
    updatedTitle: "Last updated",
    cardDisclaimer:
      "The data reflects the latest available record and its date. In an emergency there are multiple transfers: this list does not guarantee the person is still at that center, but it does guarantee the veracity and date of the published data. Information is updated as new contributions arrive. Use it as a tool for searching, consultation and citizen collaboration.",
    refShelterInfo: "Shelter · info & needs",
    refReceives: "Accepts donations of",
    refNeeds: "Needs right now",
    refSchedule: "Hours",
    refManager: "Contact person",
    refConfirmed: "Confirmed",
    refSource: "Source",
    refAnimal: "Animal shelter",
    refNoNeeds: "This shelter hasn't reported specific needs yet. You can contact them to ask how to help.",
    refEditTitle: "Shelter needs",
    f_refRecibe: "Accepts (donation types)",
    f_refRecibeHint: "Separate each type with a comma (e.g. Water, Medicine, Diapers).",
    f_refNecesita: "Needs right now",
    f_refNecesitaHint: "What's urgently needed. Update it when it changes.",
    f_refHorario: "Hours",
    f_refResponsable: "Contact person",
    f_refAddress: "Address / reference",
    f_refAnimal: "Is it an animal shelter?",
    refNeedBar: "{n} shelters need help",
    refListTitle: "Shelters · how to help",
    refListSub: "Needs reported by shelters and donation points. Help however you can, wherever you can: bring them what they need, or share so it reaches more people.",
    refListEmpty: "No needs reported yet. Check back soon.",
    refShareCta: "Share this need",
    refShareTag: "Help however you can, wherever you can · HelpMap VE",
    refHelpHow: "How to help",
    refAttrib: "Shelter data: AcopioVE (acopiove.org) · CC-BY 4.0",
  },
  pt: {
    appName: "HelpMap VE", tagline: "OSINT humanitário",
    search: "Buscar por nome, sobrenome ou CI", all: "Todos", allStates: "Todos os estados", allCenters: "Todos os centros",
    report: "Reportar", people: "pessoas", yrs: "anos", noResults: "Sem resultados. Tente outro nome ou filtro.",
    browseHint: "Busque um nome ou CI, ou toque em um centro no mapa para ver a lista.",
    female: "Feminino", male: "Masculino", ci: "CI (documento)", edad: "Idade", sexo: "Sexo", ubic: "Centro", type: "Tipo",
    municipality: "Município", state: "Estado", verified: "Verificado", verifiedYes: "Verificado", verifiedNo: "Não verificado",
    verifiedInfo: "Nossa equipe confirmou este dado diretamente com o centro ou a família. \"Não verificado\" vem de fontes automatizadas e pode conter erros.",
    listFreshness: "Lista atualizada {time}", listFreshnessNamed: "Dados de {name} atualizados {time}",
    updated: "Atualizado", share: "Compartilhar", seeMap: "Ver no mapa", detailTitle: "Ficha da pessoa",
    reportTitle: "Contribuir com dados", whatsapp: "WhatsApp", call: "Ligar",
    noPatientsHere: "Ainda não há pessoas registradas neste centro.",
    donationInfo: "Centro de doação · informações de contato",
    allTypes: "Todos os tipos",
    centerSearch: "Buscar centro…",
    comedorTitle: "Cozinha",
    comedorDesc:
      "Administrada pela World Central Kitchen. Refeições quentes e gratuitas para quem precisar; não é necessário se cadastrar nem procurar ninguém em uma lista.",
    comedorHours: "Refeições servidas das 12h00 às 13h30 (horário local).",
    comedorDonate: "Apoiar a World Central Kitchen",
    staleData: "Dados possivelmente desatualizados (sem conexão)",
    f_ape: "Sobrenomes", f_nom: "Nomes", f_ci: "CI (documento)", f_edad: "Idade", f_sexo: "Sexo",
    f_ubic: "Centro / local", f_photo: "Foto", f_photoHint: "Toque para enviar uma foto (somente adultos)",
    selectHosp: "Selecione um centro", submit: "Enviar para revisão",
    note: "Cada reporte é revisado por nossa equipe e contatos médicos antes de ser publicado. Não é publicado imediatamente.",
    sent: "Recebido para revisão. Obrigado.", shareTitle: "Compartilhar ficha",
    shareDesc: "É assim que o link aparece ao colar no WhatsApp, Telegram ou Instagram.", cardKicker: "MAPA DE EMERGÊNCIA",
    copyLink: "Copiar link", copied: "Link copiado", updatedAgo: "Atualizado",
    adminTitle: "Painel de administração", tabCenters: "Centros", tabPeople: "Pessoas", addCenter: "Adicionar centro",
    addPerson: "Adicionar pessoa", editCenter: "Editar centro", editPerson: "Editar pessoa", save: "Salvar",
    cancel: "Cancelar", del: "Excluir", f_name: "Nome do centro", f_city: "Estado", f_parish: "Município",
    f_lat: "Latitude", f_lng: "Longitude", f_status: "Status", f_center: "Centro", hasPhoto: "Tem foto?",
    yes: "Sim", no: "Não", savedC: "Centro salvo", savedP: "Pessoa salva", deleted: "Excluído", records: "registros",
    login: "Entrar", loginTitle: "Acesso de administração", email: "E-mail", password: "Senha",
    signIn: "Entrar", signOut: "Sair", loginError: "Credenciais inválidas.",
    loginHint: "Somente pessoal autorizado. Acesso protegido por Supabase Auth.",
    forgotPass: "Esqueceu sua senha?",
    recoverHint: "Digite seu e-mail e enviaremos um link para criar uma nova senha.",
    sendLink: "Enviar link",
    recoverSent: "Se esse e-mail tiver uma conta, enviamos um link de recuperação. Verifique sua caixa de entrada (e a pasta de spam).",
    backToLogin: "← Voltar para entrar",
    adminLocalNote: "As alterações são salvas no banco de dados. O registro de auditoria (quem mudou o quê) é a próxima fase.",
    loggedInAs: "Sessão",
    f_contact: "Contato (WhatsApp/telefone, opcional)",
    f_minor: "É menor de idade?",
    queuedOffline: "Sem conexão. Salvo: será enviado quando a internet voltar.",
    pendingSync: "pendente(s) para enviar quando a conexão voltar",
    synced: "Envios sincronizados com a equipe.",
    reqNameLoc: "Informe ao menos o nome ou sobrenome e o centro.",
    igCopied: "Link copiado. Cole no seu story ou perfil do Instagram.",
    noteMinors: "As informações de menores de idade são estritamente protegidas: nunca mostramos suas fotos. A visualização completa é limitada exclusivamente à equipe médica e aos familiares.",
    f_address: "Buscar por nome ou endereço", geoSearch: "Buscar", geoSearching: "Buscando…",
    geoFound: "Local encontrado. Verifique o pin no mapa", geoNotFound: "Não encontrado. Abra o local no Google Maps, copie o link ou as coordenadas e cole aqui.",
    geoHint: "Digite o nome do centro ou um endereço. Não aparece? Use \"Marcar no mapa\" e toque no local, ou cole o link/coordenadas do Google Maps. Sempre verifique o pin.",
    geoPick: "Várias correspondências, escolha a correta:",
    geoPickMap: "Marcar tocando no mapa",
    geoPickHint: "Não há coordenadas nem aparece na busca? Toque neste botão e marque o ponto no mapa. Depois você pode arrastar o pin para ajustar.",
    geoPickBanner: "Toque no mapa no local do centro",
    geoPickDone: "Pronto",
    photoBusy: "Processando foto…",
    photoError: "Não foi possível processar a imagem. Tente outra.",
    removePhoto: "Remover foto",
    f_procedencia: "Procedência",
    f_procedenciaPh: "Bairro ou zona de origem",
    f_procedenciaHint: "Somente para a equipe de verificação. Não é exibido publicamente.",
    f_dataDate: "Data do dado",
    f_dataDateHint: "De quando é esta informação? Pode ser diferente da data de hoje.",
    storyBuilding: "Gerando imagem para seu story…",
    storyShared: "Escolha Instagram → Story e adicione o sticker de link.",
    storyDownloaded: "Abrimos a imagem em outra aba: salve-a e envie para seu story do Instagram.",
    storyError: "Não foi possível criar a imagem. Tente novamente.",
    donate: "Doar",
    donateTitle: "Doar",
    donateSub: "Apoie as organizações que estão ajudando no local.",
    donateCta: "Doar",
    donateNote: "As doações vão diretamente para cada organização. O HelpMap não recebe nem administra fundos.",
    saveError: "Não foi possível salvar no banco de dados. Tente novamente.",
    delBlocked: "Não foi possível excluir. Pode haver pessoas registradas neste centro.",
    directions: "Como chegar",
    damageLayer: "Danos",
    damageLess: "Menos",
    damageMore: "Mais",
    feltIntensity: "Intensidade sentida",
    intLeve: "Leve",
    intSevera: "Severa",
    aftershocks: "réplicas",
    damagePreliminary: "Dados preliminares",
    locateMe: "Minha localização",
    locateDenied: "Ative a permissão de localização no seu navegador para se ver no mapa.",
    locateUnsupported: "Seu navegador não é compatível com geolocalização.",
    locateFailed: "Não foi possível obter sua localização. Tente novamente.",
    volunteer: "Ajudar",
    volunteerTitle: "Junte-se para ajudar",
    volunteerSub:
      "HelpMap é um esforço cidadão construído com profissionais de saúde e resgate no terreno. Quanto mais dados pudermos confirmar, mais rápido preenchemos o mapa e mais famílias se reencontram.",
    volunteerAsk:
      "Quer ajudar? Escreva para nós com seu perfil e suas fontes de informação para liberarmos seu acesso. Verificamos cada pessoa antes de habilitá-la: assim protegemos a veracidade dos dados.",
    volunteerWa: "Fale conosco pelo WhatsApp",
    volunteerEmail: "Fale conosco por e-mail",
    volunteerWaMsg: "Olá, quero ajudar com o HelpMap VE. Meu perfil é: (ex. médico, enfermeiro, resgatista) ___. Minhas fontes de informação são: ___.",
    volunteerEmailSubj: "Quero ajudar no HelpMap VE (perfil e fontes)",
    volunteerNote:
      "Verificamos cada colaborador. Os dados são sempre confirmados com profissionais antes de serem publicados.",
    donateJoin: "Ajuda com comida ou remédios?",
    donateJoinSub:
      "Se você distribui refeições ou doações de remédios verificáveis, podemos adicioná-lo a esta lista para que mais pessoas o encontrem. Fale conosco.",
    donateJoinCta: "Quero aparecer aqui",
    infoNeededTitle: "Precisamos da sua ajuda com informações",
    infoNeeded:
      "Buscamos especialmente dados verificáveis de Morón, San Felipe e do estado de Yaracuy, além de mais hospitais nas áreas afetadas. Qualquer contribuição ajuda.",
    shareDisclosure:
      "O HelpMap trabalha para que somente dados confirmados em campo por contatos em centros de saúde cheguem ao aplicativo.",
    trustLine: "Dados confirmados em campo. Nosso compromisso é ser uma fonte verídica. Ajude-nos a esclarecer ainda mais.",
    trustCta: "Colaborar",
    contact: "Contato",
    contactTitle: "Fale conosco",
    contactSub: "Envie-nos uma mensagem. Você pode anexar imagens (por exemplo, listas ou documentos).",
    contactName: "Seu nome (opcional)",
    contactEmailLabel: "Seu e-mail (para responder)",
    contactMsg: "Mensagem",
    contactPhotos: "Imagens (opcional)",
    contactAddPhoto: "Anexar imagem",
    contactSend: "Enviar mensagem",
    contactSending: "Enviando…",
    contactSent: "Mensagem enviada. Obrigado.",
    contactError: "Não foi possível enviar. Tente novamente.",
    contactAckTitle: "Recebemos sua mensagem!",
    contactAckBody:
      "Estamos avaliando sua solicitação e entraremos em contato o quanto antes. Se você deixou seu e-mail, também enviamos esta confirmação para lá. Obrigado por participar.",
    contactAckClose: "Entendido",
    contactSegVol: "Ajudar",
    contactSegDon: "Doações",
    tabVolunteers: "Voluntários",
    tabLists: "Enviar listas",
    tabNews: "Novidades",
    newsEmpty: "Ainda sem atividade recente.",
    newsRefresh: "Atualizar",
    newsPublic: "Público",
    newsSystem: "Sistema (n8n)",
    newsPendingContribs: "{n} contribuição(ões) para revisar",
    newsPendingVols: "{n} solicitação(ões) de voluntariado",
    addVolunteer: "Novo voluntário",
    volPass: "Senha temporária",
    volGenerate: "Gerar",
    volCreate: "Criar voluntário",
    volCreated: "Voluntário criado e notificado por e-mail.",
    volCreatedNoMail: "Voluntário criado (e-mail não configurado).",
    volCreateErr: "Não foi possível criar o voluntário.",
    volRevoke: "Revogar",
    volRevoked: "Acesso revogado.",
    volNone: "Ainda não há voluntários.",
    volReviewNote: "Suas alterações são publicadas imediatamente. Você faz parte da equipe de confiança. Aja com responsabilidade; podemos revogar o acesso a qualquer momento.",
    staffGuide: "Ver guia da equipe",
    listTitle: "Enviar foto de lista",
    listHint:
      "Fotografe uma ou várias listas de pacientes (manuscritas ou impressas). Você pode escolher várias fotos do mesmo centro de uma vez. Elas são enviadas à equipe para processar (OCR) e revisar antes de publicar.",
    listPick: "Tirar / escolher fotos",
    listSending: "Enviando…",
    listSent: "Lista enviada para processamento.",
    listSentN: "{n} listas enviadas para processamento.",
    listSentPartial: "{ok} de {total} enviadas. Tente novamente as que falharam.",
    listError: "Não foi possível enviar a lista. Tente novamente.",
    listNote: "Observação (opcional)",
    listDate: "Data do dado",
    listDateHint: "De quando é esta lista? Pode ser diferente da data de hoje.",
    tabDonations: "Doações",
    addDonation: "Adicionar iniciativa",
    editDonation: "Editar iniciativa",
    savedDon: "Iniciativa salva",
    f_donName: "Nome da iniciativa",
    f_donDesc: "Descrição curta (opcional)",
    f_donSocial: "Link de rede social (opcional)",
    f_donUrl: "Link de doação (opcional)",
    f_donInfo: "Dados para receber doações",
    f_donInfoHint: "Pago Móvil, conta, Zelle, Binance… (opcional)",
    donCopy: "Copiar dados",
    donData: "Dados para doar",
    donFollow: "Rede social",
    donNone: "Ainda não há iniciativas. Adicione a primeira.",
    contribCta: "Contribuir com foto / info",
    contribTitle: "Contribuir com informação",
    contribFor: "Sobre",
    contribSub: "Conhece esta pessoa? Ajude-nos a dar um rosto a ela e confirmar seus dados. Sua contribuição é enviada à equipe para revisão antes de ser publicada.",
    contribDescLabel: "O que você sabe? (descrição)",
    contribDescPh: "Ex.: é meu irmão, eu o vi na terça-feira na área de emergência…",
    contribPhoto: "Foto da pessoa",
    contribSend: "Enviar contribuição",
    contribSending: "Enviando…",
    contribNote: "Sua contribuição NÃO é publicada imediatamente. A equipe a revisa e verifica antes de exibi-la.",
    contribMinorNote: "Por proteção, fotos de menores de idade não são aceitas.",
    contribAckTitle: "Obrigado pela sua contribuição!",
    contribAckBody: "Estamos revisando. Se confirmada, ajudará a reunir esta pessoa com sua família.",
    contribAckClose: "Fechar",
    contribReq: "Adicione uma foto ou uma descrição.",
    contribContact: "Seu contato (opcional)",
    tabContribs: "Contribuições",
    contribApprove: "Aprovar",
    contribReject: "Rejeitar",
    contribApproved: "Contribuição aprovada",
    contribRejected: "Contribuição rejeitada",
    contribNone: "Não há contribuições pendentes.",
    contribPublishConfirm:
      "Esta pessoa já está VERIFICADA, então aprovar esta foto a tornará pública imediatamente (sem etapa adicional). Confirma que a foto está correta e pode ser exibida publicamente?",
    contribPublishTitle: "Publicar foto",
    contribReviewNote: "Contribuições do público para registros existentes. Ao aprovar uma foto, ela é anexada à pessoa (só aparece publicamente se o registro estiver verificado).",
    maintBanner: "Site em manutenção: estamos reverificando os dados. Alguns registros podem não aparecer. Volte em breve.",
    maintTitle: "Modo manutenção",
    maintHint: "Exibe um aviso a todos os visitantes (os dados estão sendo reverificados e podem estar incompletos).",
    maintActive: "Ativo",
    maintInactive: "Inativo",
    maintOn: "Modo manutenção ativado",
    maintOff: "Modo manutenção desativado",
    tabRescued: "Resgatados",
    rescuedListTitle: "Pessoas resgatadas",
    rescuedListSub: "Resgatadas em campo, ainda não transferidas para um centro. Informação preliminar das equipes no local.",
    rescuedNone: "Ainda não há pessoas resgatadas reportadas.",
    rescuedStatus: "Resgatado",
    rescuedOpen: "Resgatados",
    addRescued: "Reportar resgatado",
    rescuedReviewNote: "Pessoas resgatadas em campo que ainda não foram transferidas para um centro. Ao atribuir localização e status clínico, passam a ser pacientes no mapa.",
    rescuedFieldNote: "Registre quem foi resgatado com os dados que tiver. Aparece na lista pública de resgatados (sem foto até verificação). Não vai para o mapa até que um centro seja atribuído.",
    savedRescued: "Resgatado salvo",
    rescuedDeleted: "Resgatado excluído",
    rescuedReqName: "Adicione ao menos um nome ou sobrenome.",
    rescuedPublicNote: "Público: sobrenomes, nomes, idade, sexo e CI (adultos). Nunca procedência, contato ou sinais.",
    promote: "Transferir para um centro",
    promoteTitle: "Transferir para paciente",
    promoteHint: "Atribua o centro e o status clínico. O registro passa a ser paciente e aparece no mapa.",
    promoted: "Transferido para paciente",
    f_rescueSite: "Onde foi resgatado?",
    f_rescueSiteHint: "Referência do local ou desabamento (uso interno, não é exibido publicamente).",
    f_notas: "Sinais / condição",
    f_notasHint: "Descrição para identificação (uso interno, não é exibido publicamente).",
    admSearchPh: "Buscar nesta seção…",
    admSearchNone: "Sem correspondências.",
    volSignupCta: "Quero ajudar",
    volSignupTitle: "Cadastre-se para ajudar",
    volSignupSub: "Crie seu acesso. A conta fica inativa até que um administrador aprove sua solicitação.",
    f_volName: "Nome e sobrenome",
    f_volProfile: "Seu perfil",
    f_volProfilePh: "Selecione seu perfil",
    f_volSources: "Suas fontes de informação / por que conceder acesso",
    f_volSourcesPh: "Conte-nos seu papel e de onde vem sua informação confiável…",
    f_volPhone: "Telefone / WhatsApp (opcional)",
    volSignupSend: "Enviar solicitação",
    volSignupSending: "Enviando…",
    volSignupNote: "Verificamos cada colaborador antes de habilitá-lo: assim protegemos a veracidade dos dados.",
    volSignupReq: "Adicione seu nome e um e-mail válido.",
    volSignupDoneTitle: "Solicitação enviada!",
    volSignupDoneBody: "Sua conta foi criada, mas está inativa. Quando um administrador aprovar sua solicitação, você poderá entrar em /login com o e-mail e a senha escolhidos.",
    volRequests: "Solicitações pendentes",
    volReqNone: "Não há solicitações pendentes.",
    volApprove: "Aprovar",
    volReject: "Rejeitar",
    volApproved: "Voluntário aprovado e notificado por e-mail",
    volRejected: "Solicitação rejeitada",
    volReqReviewNote: "Solicitações públicas de voluntariado. A conta já existe (sem acesso); ao aprovar, o papel é ativado. Rejeitar exclui a conta.",
    volSignupPass: "Crie sua senha",
    volSignupPassHint: "Mínimo de 6 caracteres. Você a usará para entrar assim que sua solicitação for aprovada.",
    volPassShort: "A senha deve ter pelo menos 6 caracteres.",
    volEmailTaken: "Esse e-mail já está registrado.",
    volReqWhy: "Por que conceder acesso / suas fontes",
    fabCta: "Colaborar",
    menuReportTitle: "Reportar desaparecido",
    menuReportSub: "Você está procurando alguém que não aparece na lista",
    menuContribTitle: "Contribuir com dados",
    menuContribSub: "Você tem informações de alguém em um centro",
    rmTitle: "Reportar desaparecido",
    rmIntro: "Conte-nos quem você está procurando. A equipe verificará o banco de dados e entrará em contato se houver informações. Não é publicado no mapa.",
    rmWho: "Quem você está procurando?",
    rmZona: "Última área ou centro conhecido",
    rmZonaPh: "Ex. Catia, Hospital Vargas…",
    rmDesc: "Detalhes (sinais, circunstâncias)",
    rmDescPh: "Tudo que ajude a identificar ou localizar a pessoa…",
    rmReporter: "Seu nome",
    rmContact: "Seu contato (WhatsApp / e-mail)",
    rmContactHint: "Para que a equipe possa entrar em contato com você. Não é exibido publicamente.",
    rmSubmit: "Enviar reporte",
    rmNote: "A equipe revisa cada reporte e busca no banco de dados. Entraremos em contato se houver novidades.",
    rmReqName: "Informe ao menos o nome ou o sobrenome da pessoa.",
    rmSent: "Reporte enviado. Obrigado.",
    rmDoneTitle: "Reporte recebido",
    rmDoneBody: "Obrigado. A equipe verificará o banco de dados e entrará em contato pelo meio que você deixou, caso haja informações.",
    rmDoneClose: "Entendido",
    tabReports: "Reportes",
    reportsNone: "Não há reportes pendentes.",
    newsPendingReports: "{n} reportes de desaparecidos",
    reportMarkReviewed: "Revisado",
    reportCloseAction: "Fechar",
    reportReporter: "Reportado por",
    reportZonaLabel: "Última área",
    reportUpdated: "Reporte atualizado.",
    updatedTitle: "Última atualização",
    cardDisclaimer:
      "Os dados refletem o último registro disponível e sua data. Em uma emergência há múltiplas transferências: esta lista não garante que a pessoa continue naquele centro, mas garante a veracidade e a data do dado publicado. A informação é atualizada à medida que chegam novas contribuições. Use-a como ferramenta de busca, consulta e colaboração cidadã.",
    refShelterInfo: "Abrigo · informações e necessidades",
    refReceives: "Recebe doações de",
    refNeeds: "Necessita agora",
    refSchedule: "Horário",
    refManager: "Responsável",
    refConfirmed: "Confirmado",
    refSource: "Fonte",
    refAnimal: "Abrigo de animais",
    refNoNeeds: "Este abrigo ainda não reportou necessidades específicas. Você pode entrar em contato para saber como ajudar.",
    refEditTitle: "Necessidades do abrigo",
    f_refRecibe: "Recebe (tipos de doação)",
    f_refRecibeHint: "Separe cada tipo com uma vírgula (ex.: Água, Remédios, Fraldas).",
    f_refNecesita: "Necessita agora",
    f_refNecesitaHint: "O que é urgentemente necessário. Atualize quando mudar.",
    f_refHorario: "Horário",
    f_refResponsable: "Responsável / contato",
    f_refAddress: "Endereço / referência",
    f_refAnimal: "É abrigo de animais?",
    refNeedBar: "{n} abrigos precisam de ajuda",
    refListTitle: "Abrigos · como colaborar",
    refListSub: "Necessidades reportadas por abrigos e pontos de arrecadação. Colabore como puder, onde puder: leve o que precisam, ou compartilhe para alcançar mais gente.",
    refListEmpty: "Ainda não há necessidades reportadas. Volte em breve.",
    refShareCta: "Compartilhar necessidade",
    refShareTag: "Colabore como puder, onde puder · HelpMap VE",
    refHelpHow: "Como ajudar",
    refAttrib: "Dados de abrigos: AcopioVE (acopiove.org) · CC-BY 4.0",
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
