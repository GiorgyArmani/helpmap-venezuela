// Content for the documentation pages (rendered by app/docs/[slug]/page.tsx).
// Bilingual (Spanish base, English secondary). Faithful to CLAUDE.md, the in-app
// copy and the SOPs — does not over-claim. The roadmap is a separate custom page
// (app/docs/roadmap); these are the text/bullet docs.

import type { LS } from "./roadmap";

export interface DocBlock {
  label?: LS;
  text?: LS;
  bullets?: LS[];
}

export interface DocSection {
  heading: LS;
  blocks: DocBlock[];
}

export interface DocPage {
  slug: string;
  title: LS;
  intro: LS;
  sections: DocSection[];
}

export const DOCS: DocPage[] = [
  // ---------------------------------------------------------------- Guía de uso
  // Full user manual. Covers every public-facing feature, but ordered by what a
  // frightened person needs FIRST — the essentials are sections 1-4; everything
  // after is reference. Labels are quoted verbatim from data.ts (T.es) so the doc
  // matches the UI; if you rename a control there, rename it here too.
  {
    slug: "guia",
    title: { es: "Guía de uso", en: "Usage guide" },
    intro: {
      es: "Todo lo que HelpMap VE puede hacer, explicado paso a paso. No hace falta leerlo completo: con los primeros cuatro apartados ya puedes buscar a alguien. El resto está aquí para cuando lo necesites.",
      en: "Everything HelpMap VE can do, explained step by step. You don't need to read it all: the first four sections are enough to search for someone. The rest is here for when you need it.",
    },
    sections: [
      {
        heading: { es: "Lo esencial en un minuto", en: "The essentials in one minute" },
        blocks: [
          {
            bullets: [
              { es: "Para buscar a una persona: escribe su nombre o su cédula arriba.", en: "To search for a person: type their name or ID number at the top." },
              { es: "Para ver quién está en un lugar: toca ese punto en el mapa.", en: "To see who is at a place: tap that point on the map." },
              { es: "Para ayudar a que la encuentren: abre su ficha y toca \"Compartir\".", en: "To help someone be found: open their record and tap \"Compartir\" (Share)." },
            ],
          },
          {
            label: { es: "Ojo", en: "Note" },
            text: {
              es: "Al abrir la app no verás ninguna lista todavía. Es a propósito: la pantalla dice \"Busca un nombre o cédula, o toca un centro en el mapa para ver la lista\". La lista aparece cuando buscas algo o eliges un centro.",
              en: "When you open the app you won't see a list yet. That's on purpose: the screen says to search for a name or tap a centre. The list appears once you search or pick a centre.",
            },
          },
        ],
      },
      {
        heading: { es: "1. Buscar a una persona", en: "1. Search for a person" },
        blocks: [
          {
            text: {
              es: "Arriba está la barra \"Buscar por nombre, apellido o cédula\". Escribe y la lista se filtra sola mientras tecleas. La búsqueda mira los tres datos: nombres, apellidos y cédula. No busca por hospital, municipio ni edad.",
              en: "At the top is the \"Search by name, surname or ID\" bar. Type and the list filters as you go. The search looks at three fields: first names, surnames and ID number. It does not search by hospital, municipality or age.",
            },
          },
          {
            bullets: [
              { es: "No importan los acentos ni las mayúsculas: \"jose\" encuentra a \"José\".", en: "Accents and capitals don't matter: \"jose\" finds \"José\"." },
              { es: "Puedes escribir solo una parte: \"gonz\" encuentra a \"González\".", en: "You can type just a fragment: \"gonz\" finds \"González\"." },
              { es: "Si no seleccionaste ningún centro, busca en todos a la vez.", en: "If you haven't selected a centre, it searches across all of them at once." },
            ],
          },
          {
            label: { es: "Si buscas por cédula", en: "If you search by ID" },
            text: {
              es: "Escribe los números reales. En pantalla la cédula aparece tapada por seguridad (V-••••••789), pero eso es solo lo que se muestra: la búsqueda necesita los dígitos completos, no los puntos.",
              en: "Type the real digits. On screen the ID is shown masked for safety (V-••••••789), but that's only the display: the search needs the full digits, not the dots.",
            },
          },
          {
            label: { es: "Si no aparece", en: "If nothing appears" },
            text: {
              es: "Prueba solo el apellido, o solo el nombre. Si escribes dos palabras, ponlas en el orden nombre y luego apellido. Si aun así no está, no significa que le haya pasado algo: puede que ese centro todavía no nos haya pasado su lista. Usa \"Reportar desaparecido\" (apartado 10) para que el equipo la busque por ti.",
              en: "Try just the surname, or just the first name. If you type two words, put the first name before the surname. If they're still not there it doesn't mean something happened to them: that centre may simply not have sent us its list yet. Use \"Report a missing person\" (section 10) so the team searches for you.",
            },
          },
        ],
      },
      {
        heading: { es: "2. Leer la lista de resultados", en: "2. Reading the results list" },
        blocks: [
          {
            text: {
              es: "Cada persona aparece en una tarjeta con su foto o sus iniciales, su nombre, la edad y el sexo, el centro donde está y su estatus. Las más recientemente actualizadas salen de primero.",
              en: "Each person appears on a card with their photo or initials, name, age and sex, the centre they're at and their status. The most recently updated ones come first.",
            },
          },
          {
            label: { es: "Los tres estatus", en: "The three statuses" },
            bullets: [
              { es: "Ingresado (azul): está en el centro.", en: "Admitted (blue): they are at the centre." },
              { es: "De alta (verde): ya salió.", en: "Discharged (green): they have been released." },
              { es: "Fallecido (gris): usamos un gris sobrio, nunca rojo ni alarmante, y solo se publica cuando está confirmado.", en: "Deceased (grey): we use a sober grey, never red or alarming, and it is only published once confirmed." },
            ],
          },
          {
            label: { es: "El visto verde", en: "The green check" },
            text: {
              es: "Un check verde junto al nombre significa que nuestro equipo confirmó ese dato directamente con el centro o con la familia. Si no lo tiene, el dato viene de una fuente automatizada y todavía puede tener errores.",
              en: "A green check next to the name means our team confirmed that record directly with the centre or the family. Without it, the record comes from an automated source and may still contain errors.",
            },
          },
          {
            label: { es: "Arriba de la lista", en: "Above the list" },
            text: {
              es: "Verás cuántas personas hay y una línea como \"Lista actualizada hace 6 h\". Esa hora es la del dato más reciente de toda la lista, no la de cada persona: la fecha exacta de una persona está en su ficha.",
              en: "You'll see how many people there are and a line like \"List updated 6 h ago\". That time refers to the most recent record in the whole list, not to each person: an individual's exact date is on their record card.",
            },
          },
        ],
      },
      {
        heading: { es: "3. La ficha de la persona", en: "3. The person's record card" },
        blocks: [
          {
            text: {
              es: "Toca una tarjeta y se abre la ficha completa. Lo primero que verás, en grande, es cuándo se actualizó ese dato por última vez. Lo pusimos de primero a propósito: en una emergencia hay traslados constantes y la fecha es tan importante como el dato.",
              en: "Tap a card and the full record opens. The first thing you'll see, in large type, is when that record was last updated. We put it first on purpose: in an emergency there are constant transfers, and the date matters as much as the data.",
            },
          },
          {
            text: {
              es: "Debajo están los datos: estatus, cédula, edad, sexo, centro, tipo de centro, municipio, estado y si está verificado. Si el dato salió de una lista con fecha propia, verás también \"Fecha de la lista\". Junto a \"Verificado\" hay un botón de información que explica qué significa.",
              en: "Below are the details: status, ID, age, sex, centre, centre type, municipality, state and whether it's verified. If the record came from a dated list, you'll also see \"List date\". Next to \"Verified\" there's an info button explaining what it means.",
            },
          },
          {
            label: { es: "Lo que la ficha promete y lo que no", en: "What the record does and doesn't promise" },
            text: {
              es: "Al final hay un aviso que conviene leer una vez: esta lista NO garantiza que la persona siga en ese centro, porque puede haber sido trasladada. Lo que sí garantizamos es que el dato publicado es veraz y que su fecha es la que dice. Úsala como herramienta de búsqueda, no como una certeza.",
              en: "At the bottom there's a notice worth reading once: this list does NOT guarantee the person is still at that centre, since they may have been transferred. What we do guarantee is that the published record is truthful and its date is accurate. Use it as a search tool, not as a certainty.",
            },
          },
          {
            label: { es: "Los botones", en: "The buttons" },
            bullets: [
              { es: "Compartir: manda la ficha por WhatsApp, Telegram o Instagram.", en: "Share: send the record via WhatsApp, Telegram or Instagram." },
              { es: "Aportar foto / info: si conoces a esa persona y puedes agregar algo (apartado 11).", en: "Contribute photo / info: if you know that person and can add something (section 11)." },
              { es: "Ver en el mapa: te lleva al punto donde está el centro.", en: "See on the map: takes you to the centre's location." },
              { es: "Cómo llegar: abre la ruta en Google Maps.", en: "Directions: opens the route in Google Maps." },
              { es: "WhatsApp y Llamar: aparecen solo si ese centro nos dio un número de contacto.", en: "WhatsApp and Call: these appear only if that centre gave us a contact number." },
            ],
          },
        ],
      },
      {
        heading: { es: "4. El mapa", en: "4. The map" },
        blocks: [
          {
            text: {
              es: "Cada punto es un centro. Toca uno y verás abajo quién está reportado ahí; tócalo otra vez para soltarlo. Los hospitales llevan su nombre escrito al lado.",
              en: "Each pin is a centre. Tap one and you'll see who is reported there; tap it again to deselect. Hospitals show their name beside the pin.",
            },
          },
          {
            label: { es: "El color es el tipo de lugar, no la gravedad", en: "The colour means the type of place, not severity" },
            text: {
              es: "Rojo es hospital, ámbar refugio, morado centro de acopio, verde azulado comedor, rosa iniciativa civil y gris morgue. El color nunca indica qué tan grave está la gente adentro. Los botones de tipo que están debajo del buscador te sirven de leyenda: cada uno tiene el color de su tipo.",
              en: "Red is hospital, amber shelter, purple donation centre, teal free kitchen, rose civic initiative and grey morgue. The colour never indicates how serious things are inside. The type buttons under the search bar double as the legend: each carries its type's colour.",
            },
          },
          {
            label: { es: "El número dentro del punto", en: "The number inside the pin" },
            text: {
              es: "Es cuántas personas de ese centro cumplen con lo que estás filtrando en ese momento. Si cambias la búsqueda o los filtros, el número cambia. Cuando un punto queda en cero se ve más tenue.",
              en: "It's how many people at that centre match what you're currently filtering. If you change the search or the filters, the number changes. A pin that drops to zero fades out.",
            },
          },
          {
            label: { es: "El corazón", en: "The heart" },
            text: {
              es: "Los refugios, comedores, centros de acopio e iniciativas muestran un corazón en vez de un número. No llevan lista de personas, y un \"0\" haría parecer que están cerrados o vacíos cuando no lo están.",
              en: "Shelters, free kitchens, donation centres and initiatives show a heart instead of a number. They don't keep a list of people, and a \"0\" would make them look closed or empty when they aren't.",
            },
          },
          {
            label: { es: "Puntos agrupados", en: "Grouped pins" },
            text: {
              es: "Cuando hay muchos centros juntos, el mapa los agrupa en un punto más grande con la cantidad. Tócalo y se abre acercando el mapa. A partir de cierto acercamiento siempre verás los puntos uno por uno.",
              en: "When many centres sit close together the map groups them into a larger pin with a count. Tap it and the map zooms in. Past a certain zoom level you'll always see the pins individually.",
            },
          },
          {
            text: {
              es: "En el teléfono el mapa se acerca y se aleja con los dedos; en computadora hay botones + y −.",
              en: "On a phone you pinch to zoom; on a computer there are + and − buttons.",
            },
          },
        ],
      },
      {
        heading: { es: "5. Filtrar lo que ves", en: "5. Filtering what you see" },
        blocks: [
          {
            label: { es: "Por estado", en: "By state" },
            text: {
              es: "El selector \"Todos los estados\" mueve el mapa hacia el estado que elijas y limita la lista a ese estado. No borra los puntos de los demás estados: los deja visibles pero apagados, para que no pierdas la referencia de dónde estás.",
              en: "The \"All states\" picker moves the map to the state you choose and limits the list to it. It doesn't remove the other states' pins: it leaves them visible but dimmed so you keep your bearings.",
            },
          },
          {
            label: { es: "Por centro", en: "By centre" },
            text: {
              es: "El selector \"Todos los centros\" tiene su propio buscador y agrupa los lugares por tipo. Al elegir uno, el mapa vuela hasta él y la lista se limita a ese lugar.",
              en: "The \"All centres\" picker has its own search box and groups places by type. Pick one and the map flies to it, limiting the list to that place.",
            },
          },
          {
            label: { es: "Por tipo de lugar", en: "By type of place" },
            text: {
              es: "Los botones de colores (Hospital, Refugio, Morgue, Centro de acopio, Comedor, Iniciativa civil) sí esconden puntos del mapa. Puedes activar varios a la vez. Si no activas ninguno, se ven todos; toca otra vez uno activo para apagarlo.",
              en: "The coloured buttons (Hospital, Shelter, Morgue, Donation centre, Free kitchen, Civic initiative) do hide pins from the map. You can turn on several at once. With none active you see them all; tap an active one again to turn it off.",
            },
          },
          {
            label: { es: "Por estatus", en: "By status" },
            text: {
              es: "Los botones Todos / Ingresado / De alta / Fallecido aparecen solo cuando tienes seleccionado un hospital, que es donde tienen sentido. Si cambias a un refugio o un centro de acopio, el filtro se quita solo para que no esconda resultados sin que te des cuenta.",
              en: "The All / Admitted / Discharged / Deceased buttons appear only when a hospital is selected, which is where they make sense. If you switch to a shelter or donation centre the filter clears itself so it can't hide results without you noticing.",
            },
          },
        ],
      },
      {
        heading: { es: "6. Mi ubicación y la capa de daños", en: "6. My location and the damage layer" },
        blocks: [
          {
            label: { es: "Mi ubicación", en: "My location" },
            text: {
              es: "El botón redondo con la mira te centra el mapa donde estás y pinta un punto azul con un círculo alrededor (ese círculo es el margen de error del GPS). Solo funciona si tocas el botón: la app nunca te ubica sola. Si tu navegador tiene el permiso bloqueado, te lo avisará.",
              en: "The round crosshair button centres the map on you and draws a blue dot with a circle around it (that circle is the GPS margin of error). It only runs when you tap it: the app never locates you on its own. If your browser has the permission blocked, it will tell you.",
            },
          },
          {
            label: { es: "Daños", en: "Damage" },
            text: {
              es: "El botón \"Daños\" enciende una capa de calor que muestra en qué zona se sintió más fuerte el sismo, y marca las réplicas registradas. Viene apagada. La leyenda \"Intensidad sentida\" va de Leve a Severa, e indica de dónde salieron los datos: del servicio sismológico USGS, o \"Datos preliminares\" cuando todavía usamos nuestra estimación inicial.",
              en: "The \"Damage\" button turns on a heat layer showing where the quake was felt most strongly, and marks the recorded aftershocks. It starts off. The \"Felt intensity\" legend runs from Mild to Severe and states where the data came from: the USGS seismic service, or \"Preliminary data\" when we're still using our initial estimate.",
            },
          },
          {
            text: {
              es: "Es una capa de contexto, no un censo de daños: te ayuda a entender qué zona buscar, no cuántas casas se cayeron.",
              en: "It's a context layer, not a damage census: it helps you understand which area to search, not how many buildings fell.",
            },
          },
        ],
      },
      {
        heading: { es: "7. Refugios, acopios e iniciativas: cómo ayudar", en: "7. Shelters, collection points and initiatives: how to help" },
        blocks: [
          {
            text: {
              es: "Estos lugares no tienen lista de personas: tienen necesidades. Al tocar uno verás qué recibe, qué necesita ahora mismo, su horario, quién responde y su dirección.",
              en: "These places don't have a list of people: they have needs. Tap one and you'll see what it receives, what it needs right now, its hours, who's in charge and its address.",
            },
          },
          {
            text: {
              es: "Cuando ninguno está seleccionado, abajo aparece una barra ámbar que dice cuántos centros necesitan ayuda. Al tocarla se abre la lista completa, ordenada para que los que tienen una necesidad concreta salgan de primeros. Desde ahí puedes llegar, escribir por WhatsApp o compartir esa necesidad.",
              en: "When none is selected, an amber bar at the bottom says how many centres need help. Tapping it opens the full list, sorted so the ones with a concrete need come first. From there you can get directions, message via WhatsApp, or share that need.",
            },
          },
          {
            label: { es: "Cómo puedes ayudar", en: "Ways to help" },
            text: {
              es: "Algunas iniciativas indican de qué forma se les puede ayudar: ir a ayudar en persona, donar insumos, oficios y servicios, difundir o aporte económico.",
              en: "Some initiatives state how you can help: volunteering on site, donating supplies, trades and services, spreading the word, or financial support.",
            },
          },
          {
            text: {
              es: "Buena parte de la información de refugios y acopios viene de AcopioVE (acopiove.org), y así lo indicamos en cada ficha que proviene de ahí.",
              en: "Much of the shelter and collection-point information comes from AcopioVE (acopiove.org), and we credit it on every record sourced from there.",
            },
          },
        ],
      },
      {
        heading: { es: "8. Personas rescatadas", en: "8. Rescued people" },
        blocks: [
          {
            text: {
              es: "Es una lista aparte, a la que se entra desde abajo. Son personas que los equipos sacaron con vida pero que todavía no sabemos a qué centro fueron trasladadas. Existe para que una familia sepa cuanto antes que su pariente está vivo, aunque falte el resto de la información.",
              en: "This is a separate list, reached from the bottom of the screen. These are people rescue teams pulled out alive but whose destination centre we don't know yet. It exists so a family can learn as early as possible that their relative is alive, even while the rest is missing.",
            },
          },
          {
            text: {
              es: "Por eso no tienen punto en el mapa (no sabemos dónde ubicarlas todavía) y no salen en el buscador principal. Cuando se confirma a qué centro llegaron, pasan a la lista normal y aparecen en el mapa.",
              en: "That's why they have no map pin (we don't know where to place them yet) and don't appear in the main search. Once their centre is confirmed they move to the normal list and appear on the map.",
            },
          },
        ],
      },
      {
        heading: { es: "9. Compartir", en: "9. Sharing" },
        blocks: [
          {
            text: {
              es: "Compartir es la función que más ayuda a que alguien sea encontrado: mientras más circula una ficha, más probable es que la vea quien la reconoce.",
              en: "Sharing is the feature that most helps someone be found: the more a record circulates, the likelier it reaches someone who recognises them.",
            },
          },
          {
            text: {
              es: "Desde el teléfono, \"Compartir\" abre directamente el menú de tu sistema y eliges la app. Desde la computadora se abre una pantalla que te muestra cómo se verá el enlace al pegarlo, con cuatro opciones: WhatsApp, Telegram, Instagram y copiar el enlace.",
              en: "On a phone, \"Share\" opens your system's share menu directly and you pick the app. On a computer it opens a screen previewing how the link will look when pasted, with four options: WhatsApp, Telegram, Instagram and copy link.",
            },
          },
          {
            label: { es: "Instagram", en: "Instagram" },
            text: {
              es: "Instagram no permite compartir enlaces automáticamente, así que la app te genera una imagen vertical lista para tu historia. En el teléfono se abre el menú para compartirla; en computadora se abre en otra pestaña para que la guardes. Acuérdate de agregarle el sticker de enlace.",
              en: "Instagram doesn't allow automatic link sharing, so the app generates a vertical image ready for your story. On a phone the share menu opens; on a computer it opens in another tab for you to save. Remember to add the link sticker.",
            },
          },
          {
            text: {
              es: "También puedes compartir la necesidad de un refugio o de una iniciativa, con el mismo mecanismo, desde su ficha o desde la lista de necesidades.",
              en: "You can also share a shelter's or an initiative's need, using the same mechanism, from its card or from the needs list.",
            },
          },
          {
            label: { es: "Qué se comparte y qué no", en: "What is and isn't shared" },
            text: {
              es: "El enlace muestra nombre, estatus y centro. La vista previa que se genera automáticamente nunca incluye la foto de la persona, y la imagen para historias solo muestra foto si es una persona adulta y verificada. Las fichas de personas no se indexan en Google.",
              en: "The link shows name, status and centre. The automatically generated preview never includes the person's photo, and the story image only shows a photo for a verified adult. Person records are not indexed by Google.",
            },
          },
        ],
      },
      {
        heading: { es: "10. El botón \"Colaborar\": dos caminos", en: "10. The \"Collaborate\" button: two paths" },
        blocks: [
          {
            text: {
              es: "El botón con el signo + abre dos opciones. La diferencia importa:",
              en: "The + button opens two options. The difference matters:",
            },
          },
          {
            label: { es: "Reportar desaparecido", en: "Report a missing person" },
            text: {
              es: "Es para cuando BUSCAS a alguien y no aparece en la lista. Nos dices a quién buscas (nombre, cédula, edad, última zona conocida, señas) y cómo contactarte. El equipo revisa la base de datos y te avisa si encuentra algo. Este reporte no se publica en el mapa: es una pista para nosotros, y tus datos de contacto no se muestran a nadie más.",
              en: "This is for when you are SEARCHING for someone who isn't on the list. You tell us who you're looking for (name, ID, age, last known area, identifying details) and how to reach you. The team checks the database and lets you know if anything turns up. This report is not published on the map: it's a lead for us, and your contact details are never shown to anyone else.",
            },
          },
          {
            label: { es: "Aportar datos", en: "Contribute data" },
            text: {
              es: "Es al revés: cuando TIENES información de alguien que está en un centro. Pide nombre, edad, cédula, el centro (obligatorio), el estatus y la fecha a la que corresponde el dato, que puede no ser hoy. Si marcas que es menor de edad, la app quita la cédula y el campo de foto: los menores no llevan ni una cosa ni la otra.",
              en: "It's the reverse: when you HAVE information about someone at a centre. It asks for name, age, ID, the centre (required), the status and the date the information corresponds to, which may not be today. If you mark them as a minor, the app removes the ID and the photo field: minors carry neither.",
            },
          },
          {
            text: {
              es: "Lo que aportas no se publica de inmediato: lo revisa el equipo junto a contactos médicos antes de que aparezca. Si lo envías sin señal, queda guardado y se manda solo cuando vuelva el internet.",
              en: "What you contribute is not published immediately: the team reviews it with medical contacts before it appears. If you submit it without signal, it's saved and sends itself once the connection returns.",
            },
          },
        ],
      },
      {
        heading: { es: "11. Aportar a una ficha que ya existe", en: "11. Contributing to an existing record" },
        blocks: [
          {
            text: {
              es: "Si encuentras a alguien que ya está en la lista y puedes agregar algo —una foto, o saber dónde lo viste— usa \"Aportar foto / info\" dentro de su ficha. Sirve sobre todo para ponerle cara a un registro que solo tiene nombre, que es lo que más ayuda a que alguien lo reconozca.",
              en: "If you find someone already on the list and can add something — a photo, or where you saw them — use \"Contribute photo / info\" inside their record. It's mostly for putting a face to a record that only has a name, which is what most helps someone recognise them.",
            },
          },
          {
            text: {
              es: "Tu aporte no se publica solo: un miembro del equipo lo revisa. Mientras tanto, la foto que envías queda guardada en privado, sin que nadie pueda verla. Si la ficha es de un menor de edad, la app no acepta fotos.",
              en: "Your contribution isn't published automatically: a team member reviews it. Meanwhile the photo you send is stored privately, visible to no one. If the record belongs to a minor, the app doesn't accept photos at all.",
            },
          },
        ],
      },
      {
        heading: { es: "12. Donar", en: "12. Donate" },
        blocks: [
          {
            text: {
              es: "El botón del corazón, arriba, abre la lista de organizaciones que están ayudando en el terreno. Toca una para desplegar sus datos para donar (pago móvil, cuenta, etc.), con un botón para copiarlos, su red social y su enlace de donación.",
              en: "The heart button at the top opens the list of organisations helping on the ground. Tap one to expand its donation details (mobile payment, account, etc.), with a button to copy them, plus its social media and donation link.",
            },
          },
          {
            text: {
              es: "HelpMap no recibe ni administra fondos: las donaciones van directo a cada organización. Si tú entregas comida o medicamentos verificables, puedes pedir aparecer en esa lista desde el mismo panel.",
              en: "HelpMap neither receives nor manages funds: donations go directly to each organisation. If you deliver food or verifiable medicine, you can ask to be listed from that same panel.",
            },
          },
        ],
      },
      {
        heading: { es: "13. Sumarte al equipo o escribirnos", en: "13. Joining the team or writing to us" },
        blocks: [
          {
            text: {
              es: "El botón de las manos abre \"Súmate para ayudar\". Buscamos médicos, enfermeros, personal de salud y rescatistas con acceso a información de primera mano. Puedes registrarte ahí mismo: creas tu cuenta con tu correo y tu contraseña, y queda inactiva hasta que un administrador apruebe tu solicitud. Verificamos a cada persona antes de habilitarla, porque de eso depende que los datos sean confiables.",
              en: "The hands button opens \"Join us\". We're looking for doctors, nurses, health workers and rescuers with first-hand access to information. You can sign up right there: you create your account with your email and password, and it stays inactive until an administrator approves your request. We vet every person before enabling them, because the reliability of the data depends on it.",
            },
          },
          {
            text: {
              es: "El botón del sobre abre \"Escríbenos\", para cualquier otro mensaje. Puedes adjuntar hasta cuatro imágenes, por ejemplo la foto de una lista.",
              en: "The envelope button opens \"Write to us\", for any other message. You can attach up to four images, for example a photo of a list.",
            },
          },
        ],
      },
      {
        heading: { es: "14. Con mala señal o sin internet", en: "14. On a bad connection or offline" },
        blocks: [
          {
            text: {
              es: "La app está hecha para conexiones malas. Guarda lo último que cargó, así que si abres y te quedas sin señal, sigue mostrándote esa información con un aviso ámbar que dice \"Datos posiblemente desactualizados (sin conexión)\". Cuando vuelve la señal se actualiza sola y el aviso desaparece.",
              en: "The app is built for poor connections. It saves what it last loaded, so if you lose signal it keeps showing that information with an amber notice reading \"Data may be out of date (offline)\". When the signal returns it updates itself and the notice disappears.",
            },
          },
          {
            bullets: [
              { es: "Los pedazos de mapa por los que ya pasaste también quedan guardados, así que el mapa sigue dibujándose sin señal.", en: "The map areas you already panned over are saved too, so the map still renders without signal." },
              { es: "Lo que envías sin conexión queda en cola y se manda solo al volver el internet.", en: "Anything you submit offline is queued and sends itself once the connection returns." },
              { es: "Todo esto necesita que hayas abierto la app al menos una vez con internet. La primera visita sí requiere conexión.", en: "All of this requires having opened the app at least once online. The very first visit does need a connection." },
            ],
          },
          {
            label: { es: "Instalarla en el teléfono", en: "Installing it on your phone" },
            text: {
              es: "Puedes ponerla como una app en tu pantalla de inicio, lo que la hace abrir más rápido. En Android (Chrome): menú → \"Agregar a pantalla de inicio\". En iPhone (Safari): Compartir → \"Agregar a inicio\".",
              en: "You can add it to your home screen like an app, which makes it open faster. On Android (Chrome): menu → \"Add to Home screen\". On iPhone (Safari): Share → \"Add to Home Screen\".",
            },
          },
        ],
      },
      {
        heading: { es: "15. Idioma", en: "15. Language" },
        blocks: [
          {
            text: {
              es: "Arriba a la derecha puedes cambiar entre español, inglés y portugués. Ten en cuenta que la app vuelve al español cada vez que la recargas: si la usas en otro idioma, tendrás que elegirlo de nuevo.",
              en: "At the top right you can switch between Spanish, English and Portuguese. Note that the app returns to Spanish every time you reload it: if you use another language you'll need to pick it again.",
            },
          },
        ],
      },
      {
        heading: { es: "16. Qué protegemos", en: "16. What we protect" },
        blocks: [
          {
            bullets: [
              { es: "De los menores de edad nunca se muestra la cédula ni la foto, en ninguna parte: ni en la lista, ni en la ficha, ni en lo que compartes.", en: "For minors we never show the ID or the photo anywhere: not in the list, the record, or anything you share." },
              { es: "Las cédulas se muestran tapadas, dejando solo los últimos dígitos.", en: "ID numbers are shown masked, leaving only the last digits." },
              { es: "Nunca publicamos dónde vive una persona ni en qué servicio médico está. Esos datos existen, pero son solo para el equipo de verificación.", en: "We never publish where a person lives or which medical ward they're in. That data exists, but only for the verification team." },
              { es: "Las fichas de personas no se indexan en buscadores.", en: "Person records are not indexed by search engines." },
              { es: "No registramos a quién buscas. Lo que escribes en el buscador no sale de tu teléfono.", en: "We don't record who you search for. What you type in the search bar never leaves your phone." },
            ],
          },
          {
            text: {
              es: "Si quieres el detalle completo, está en la sección de Privacidad y manejo de datos.",
              en: "For the full detail, see the Privacy and data handling section.",
            },
          },
        ],
      },
      {
        heading: { es: "17. Si algo no funciona", en: "17. If something isn't working" },
        blocks: [
          {
            label: { es: "El mapa está vacío o faltan registros", en: "The map is empty or records are missing" },
            text: {
              es: "Si ves un aviso rojo de mantenimiento arriba, estamos re-verificando los datos y algunos registros no aparecen temporalmente. No significa que se hayan perdido. Vuelve a intentar en un rato.",
              en: "If you see a red maintenance notice at the top, we're re-verifying the data and some records are temporarily hidden. It doesn't mean they were lost. Try again shortly.",
            },
          },
          {
            label: { es: "No consigo a la persona", en: "I can't find the person" },
            text: {
              es: "Revisa que no tengas filtros activos que la estén escondiendo: quita el estado, el centro y los botones de tipo, y busca solo por el apellido. Si sigue sin aparecer, repórtala como desaparecida.",
              en: "Check you don't have active filters hiding them: clear the state, the centre and the type buttons, and search by surname alone. If they still don't appear, report them as missing.",
            },
          },
          {
            label: { es: "El botón de ubicación no hace nada", en: "The location button does nothing" },
            text: {
              es: "Tu navegador tiene bloqueado el permiso de ubicación. Actívalo en la configuración del navegador para ese sitio.",
              en: "Your browser has the location permission blocked. Enable it in the browser settings for this site.",
            },
          },
          {
            label: { es: "No puedo subir una foto", en: "I can't upload a photo" },
            text: {
              es: "Prueba con otra imagen. Si la ficha es de un menor de edad, la app no acepta fotos y eso es intencional.",
              en: "Try another image. If the record belongs to a minor, the app doesn't accept photos and that is intentional.",
            },
          },
          {
            text: {
              es: "Puedes volver a ver el recorrido de bienvenida cuando quieras con el botón \"?\" de arriba.",
              en: "You can replay the welcome tour any time with the \"?\" button at the top.",
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------- Privacidad y manejo de datos
  {
    slug: "privacidad",
    title: { es: "Privacidad y manejo de datos", en: "Privacy & data handling" },
    intro: {
      es: "Esta es una base de datos de personas identificadas durante una catástrofe. Ayuda a reunir familias, y por eso la manejamos con reglas estrictas, varias enforzadas a nivel de base de datos.",
      en: "This is a database of identified people during a disaster. It helps reunite families, so we handle it with strict rules, several enforced at the database layer.",
    },
    sections: [
      {
        heading: { es: "Qué mostramos", en: "What we show" },
        blocks: [
          {
            text: {
              es: "Solo lo necesario para reunir: apellidos, nombres, cédula (adultos), edad, sexo, ubicación, estatus y la insignia de verificado. La foto solo aparece en adultos verificados.",
              en: "Only what's needed to reunite: surnames, names, ID (adults), age, sex, location, status and the verified badge. A photo only appears for verified adults.",
            },
          },
        ],
      },
      {
        heading: { es: "Qué nunca mostramos", en: "What we never show" },
        blocks: [
          {
            bullets: [
              { es: "El barrio o sector de origen (procedencia). Es solo de uso administrativo.", en: "The home neighbourhood/area of origin. Admin-use only." },
              { es: "El servicio médico o sala. También solo administrativo.", en: "The medical service or ward. Also admin-only." },
            ],
          },
        ],
      },
      {
        heading: { es: "Protección reforzada de menores", en: "Reinforced protection of minors" },
        blocks: [
          {
            text: {
              es: "Los menores de edad nunca llevan foto ni cédula: en su lugar se muestra \"MENOR\" y un avatar neutro. Está protegido en varias capas del sistema, así que no depende de quien cargue el dato.",
              en: "Minors never carry a photo or ID: instead we show \"MENOR\" and a neutral avatar. It's protected across several layers of the system, so it doesn't depend on who enters the data.",
            },
          },
        ],
      },
      {
        heading: { es: "Personas fallecidas", en: "Deceased persons" },
        blocks: [
          {
            text: {
              es: "El estatus de fallecido es sensible: solo se publica una vez verificado y se trata con respeto, sin estilos alarmistas y sin convertirse en un conteo de víctimas.",
              en: "Deceased status is sensitive: it's only published once verified and handled respectfully, without alarmist styling and without becoming a casualty count.",
            },
          },
        ],
      },
      {
        heading: { es: "Cómo verificamos", en: "How we verify" },
        blocks: [
          {
            text: {
              es: "Cada dato se confirma en campo con contactos en centros de salud. El flujo es: recepción → limpieza y dedup → verificación humana → publicación. Nada enviado por el público llega directo al mapa.",
              en: "Each record is confirmed in the field with contacts at health centres. The flow is: intake → cleanup and dedup → human verification → publishing. Nothing submitted by the public reaches the map directly.",
            },
          },
        ],
      },
      {
        heading: { es: "Sin rastreo", en: "No tracking" },
        blocks: [
          {
            text: {
              es: "No rastreamos quién busca a quién: las búsquedas son privadas. Es una iniciativa sin fines de lucro: no cobramos, no mostramos publicidad y no vendemos datos.",
              en: "We don't track who searches for whom: searches are private. It's a non-profit initiative: we don't charge, show ads or sell data.",
            },
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------- Para voluntarios
  {
    slug: "voluntarios",
    title: { es: "Para voluntarios", en: "For volunteers" },
    intro: {
      es: "HelpMap es un esfuerzo ciudadano. Mientras más datos podamos confirmar, más rápido llenamos el mapa y más familias se reúnen.",
      en: "HelpMap is a citizen effort. The more data we can confirm, the faster we fill the map and the more families reunite.",
    },
    sections: [
      {
        heading: { es: "A quién buscamos", en: "Who we're looking for" },
        blocks: [
          {
            text: {
              es: "Médicos, enfermeros, personal de salud y rescatistas con acceso a información veraz desde hospitales y refugios.",
              en: "Doctors, nurses, health workers and rescuers with access to truthful information from hospitals and shelters.",
            },
          },
        ],
      },
      {
        heading: { es: "Cómo sumarse", en: "How to join" },
        blocks: [
          {
            text: {
              es: "Escríbenos con tu perfil y tus fuentes de información para darte acceso. Cada voluntario se verifica antes de habilitarlo: así protegemos la veracidad de los datos.",
              en: "Write to us with your profile and your information sources so we can grant you access. Every volunteer is vetted before being enabled — that's how we protect the accuracy of the data.",
            },
          },
        ],
      },
      {
        heading: { es: "Qué puedes hacer", en: "What you can do" },
        blocks: [
          {
            bullets: [
              { es: "Agregar y editar personas y centros desde el panel de voluntario.", en: "Add and edit people and centres from the volunteer panel." },
              { es: 'Subir listas: fotografía una lista manuscrita o impresa y nosotros la digitalizamos.', en: 'Upload lists: photograph a handwritten or printed list and we digitize it.' },
              { es: "Reportar rescatados con vida y actualizar necesidades de refugios y acopios.", en: "Report people rescued alive and update shelter/donation-centre needs." },
              { es: "Eres de confianza: lo que publicas se refleja de inmediato, y el acceso es revocable en cualquier momento.", en: "You're trusted: what you publish reflects immediately, and access is revocable at any time." },
              { es: "Eliminar registros o centros queda solo para administradores.", en: "Deleting records or centres is admin-only." },
            ],
          },
        ],
      },
      {
        heading: { es: "Privacidad que debes respetar", en: "Privacy you must respect" },
        blocks: [
          {
            text: {
              es: "Nunca cargues foto ni cédula de un menor (el sistema fuerza \"MENOR\"). No manejes públicamente la procedencia ni el servicio médico.",
              en: "Never upload a minor's photo or ID (the system forces \"MENOR\"). Don't handle the home origin or medical service publicly.",
            },
          },
        ],
      },
      {
        heading: { es: "Contacto", en: "Contact" },
        blocks: [
          {
            text: {
              es: "Escríbenos a info@helpmapvzla.net o por el botón de voluntariado en la app.",
              en: "Write to info@helpmapvzla.net or use the volunteer button in the app.",
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------- Manual del voluntario (panel staff)
  // Step-by-step manual of the staff panel. This is the doc the welcome email links
  // to (lib/email.ts sendVolunteerWelcome), so it must stay faithful to what the
  // panel actually does — tab names mirror data.ts (tabNews/tabPeople/…).
  {
    slug: "manual-voluntario",
    title: { es: "Manual del voluntario", en: "Volunteer manual" },
    intro: {
      es: "Cómo funciona HelpMap por dentro, hasta dónde llega tu acceso y qué hace cada pestaña del panel. Si es tu primer día, lee los apartados 1 al 4: ahí está lo que necesitas para trabajar sin romper nada. El resto es referencia por pestaña.",
      en: "How HelpMap works under the hood, how far your access goes, and what each tab of the panel does. If it's your first day, read sections 1 to 4: that's everything you need to work without breaking anything. The rest is per-tab reference.",
    },
    sections: [
      {
        heading: { es: "1. Entrar al panel", en: "1. Getting into the panel" },
        blocks: [
          {
            bullets: [
              { es: "Inicia sesión en helpmapvzla.net/login con el correo con el que te aprobamos.", en: "Sign in at helpmapvzla.net/login with the email we approved you with." },
              { es: "Ya dentro del mapa, toca el ícono de engranaje en la barra superior: ese es tu panel.", en: "Once in the map, tap the gear icon in the top bar — that's your panel." },
              { es: "El punto rojo sobre el engranaje cuenta lo que espera revisión (aportes del público y reportes).", en: "The red dot on the gear counts what's awaiting review (public contributions and reports)." },
              { es: 'El botón "?" en la cabecera del panel reabre el tour de voluntarios cuando quieras.', en: 'The "?" button in the panel header reopens the volunteer tour any time.' },
            ],
          },
        ],
      },
      {
        heading: { es: "2. Cómo funciona HelpMap por dentro", en: "2. How HelpMap works under the hood" },
        blocks: [
          {
            text: {
              es: "HelpMap no es una sola base a la que todo el mundo escribe. Los datos entran por varias vías, se depuran, y el público lee una copia filtrada. Entender ese recorrido te evita el 90% de los errores.",
              en: "HelpMap isn't a single database everyone writes to. Data comes in through several routes, gets cleaned up, and the public reads a filtered copy. Understanding that path avoids 90% of mistakes.",
            },
          },
          {
            label: { es: "De dónde salen los datos", en: "Where the data comes from" },
            bullets: [
              {
                es: "Listas de campo: las fotos que suben los voluntarios se transcriben con un proceso automático y pasan por una hoja de trabajo donde se normalizan y se eliminan duplicados. Solo lo ya depurado llega al mapa.",
                en: "Field lists: the photos volunteers upload are transcribed by an automated process and go through a working sheet where they're normalized and de-duplicated. Only the cleaned-up result reaches the map.",
              },
              {
                es: 'Formulario público "Colaborar → Aportar datos": nunca escribe directo en el mapa. Cae en esa misma cola de depuración y alguien lo revisa antes de que exista como registro.',
                en: 'Public "Collaborate → Contribute data" form: it never writes to the map directly. It lands in that same cleanup queue and someone reviews it before it exists as a record.',
              },
              {
                es: "Tu panel: es la única vía que escribe directo en la base y se ve al instante. Por eso es la más rápida y también la que más cuidado exige.",
                en: "Your panel: it's the only route that writes straight to the database and shows up instantly. That's why it's the fastest — and the one that demands the most care.",
              },
              {
                es: "Aportes del público a un registro que ya existe (una foto, un dato nuevo): van a una cola de moderación que resuelves tú, dentro de la ficha de esa persona.",
                en: "Public contributions to a record that already exists (a photo, a new detail): they go to a moderation queue that you resolve, inside that person's card.",
              },
              {
                es: "Reportes de desaparecidos: son pistas para que busques en la base, no registros públicos. Nunca aparecen en el mapa.",
                en: "Missing-person reports: they're leads for you to search the database with, not public records. They never appear on the map.",
              },
              {
                es: "Refugios y centros de acopio: se sincronizan a diario con AcopioVE. Si tú editas las necesidades de un lugar, tu versión manda; la sincronización solo la reemplaza si allá actualizan ese mismo lugar después que tú.",
                en: "Shelters and donation centres: they sync daily with AcopioVE. If you edit a place's needs, your version wins; the sync only replaces it if they update that same place after you did.",
              },
            ],
          },
          {
            label: { es: "Lo que ve el público no es lo que ves tú", en: "What the public sees isn't what you see" },
            text: {
              es: "El público no lee la base: lee una copia filtrada de ella. Ahí nunca aparecen la procedencia ni el servicio médico, los menores nunca llevan cédula ni foto, y una foto solo se muestra si el registro está verificado y es adulto. No es una regla de pantalla que se pueda saltar: está impuesta en la propia base de datos. Aunque escribas ese dato, no se publica.",
              en: "The public doesn't read the database: it reads a filtered copy of it. Home origin and medical service never appear there, minors never carry an ID or a photo, and a photo only shows if the record is verified and an adult. This isn't a screen-level rule you can bypass: it's enforced in the database itself. Even if you enter that data, it won't be published.",
            },
          },
          {
            label: { es: "La base se resincroniza sola", en: "The database re-syncs on its own" },
            text: {
              es: "Cada pocos minutos la base vuelve a leer la hoja fuente del equipo de datos. Tu edición en el panel queda marcada con fecha para que esa sincronización no la pise. Si aun así ves que un dato «vuelve atrás», avísale al equipo: significa que la hoja fuente dice otra cosa y hay que corregirla ahí, no volver a editarlo cada rato.",
              en: "Every few minutes the database re-reads the data team's source sheet. Your panel edit is timestamped so that sync won't overwrite it. If you still see a value «revert», tell the team: it means the source sheet says something different and it has to be fixed there, not re-edited over and over.",
            },
          },
          {
            label: { es: "Todo queda registrado", en: "Everything is logged" },
            text: {
              es: "Cada cambio guarda automáticamente quién lo hizo, qué cambió y cuándo. Ese registro lo escribe la base, no la app: no se puede editar ni borrar, ni siquiera desde el panel. Lo ves en la pestaña Novedades. No está ahí para vigilarte, sino para poder reconstruir qué pasó cuando un dato sale mal.",
              en: "Every change automatically records who made it, what changed and when. That log is written by the database, not the app: it can't be edited or deleted, not even from the panel. You see it in the Activity tab. It isn't there to watch you, but to reconstruct what happened when data goes wrong.",
            },
          },
        ],
      },
      {
        heading: { es: "3. Tu nivel de acceso", en: "3. Your access level" },
        blocks: [
          {
            text: {
              es: "Hay tres niveles: el público, el voluntario (tú) y el administrador. El tuyo te deja crear y corregir casi todo, pero no destruir nada ni repartir accesos.",
              en: "There are three levels: the public, the volunteer (you) and the administrator. Yours lets you create and correct almost anything, but not destroy anything or hand out access.",
            },
          },
          {
            label: { es: "Sí puedes", en: "You can" },
            bullets: [
              { es: "Crear y editar personas: datos, centro y estatus (Ingresado, De alta, Fallecido).", en: "Create and edit people: details, centre and status (Admitted, Discharged, Deceased)." },
              { es: 'Marcar y desmarcar "Verificado", que es lo que publica la foto y pone el check verde.', en: 'Turn "Verified" on and off — it is what publishes the photo and shows the green check.' },
              { es: "Crear y editar centros de cualquier tipo (hospital, refugio, morgue, acopio, iniciativa civil), incluidas sus necesidades y sus contactos.", en: "Create and edit centres of any type (hospital, shelter, morgue, donation centre, civic initiative), including their needs and contacts." },
              { es: "Subir listas fotografiadas al proceso de digitalización.", en: "Upload photographed lists into the digitization process." },
              { es: 'Crear y editar rescatados, y "Trasladarlos" cuando confirmes a qué centro llegaron.', en: 'Create and edit rescued people, and "Transfer" them when you confirm which centre they reached.' },
              { es: "Aprobar o rechazar los aportes que manda el público sobre un registro.", en: "Approve or reject the contributions the public sends about a record." },
              { es: "Revisar y cerrar reportes de desaparecidos, con los datos de contacto de quien reporta.", en: "Review and close missing-person reports, with the contact details of whoever reported." },
              { es: "Agregar y editar las organizaciones que aparecen en la sección de donaciones.", en: "Add and edit the organizations listed in the donations section." },
              { es: "Ver la bitácora completa de la plataforma.", en: "See the platform's full activity log." },
            ],
          },
          {
            label: { es: "No puedes — es solo de administrador", en: "You can't — admin only" },
            bullets: [
              { es: "Borrar cualquier cosa: personas, centros, rescatados u organizaciones. Puedes corregirlas todas, pero eliminar no.", en: "Delete anything: people, centres, rescued records or organizations. You can correct all of them, but not remove them." },
              { es: "Crear, aprobar o revocar voluntarios.", en: "Create, approve or revoke volunteers." },
              { es: "Activar el aviso de mantenimiento que ve todo el sitio.", en: "Turn on the maintenance notice the whole site sees." },
              { es: "Cambiar las reglas de privacidad o tocar la base de datos por fuera de la app.", en: "Change the privacy rules or touch the database outside the app." },
            ],
          },
          {
            label: { es: "Por qué el borrado no es tuyo", en: "Why deleting isn't yours" },
            text: {
              es: "Borrar un centro arrastra consigo a todas las personas registradas ahí, y un registro borrado por error es alguien que una familia deja de encontrar. Si algo está mal, corrígelo o cámbiale el estatus y avísale al equipo: siempre es mejor que eliminarlo. Este límite no es una barrera técnica que se pueda saltar desde el panel — está en el servidor, no en el botón.",
              en: "Deleting a centre drags along everyone registered there, and a record deleted by mistake is someone a family stops finding. If something is wrong, correct it or change its status and tell the team: that's always better than removing it. This limit isn't a technical barrier you can bypass from the panel — it lives on the server, not in the button.",
            },
          },
          {
            label: { es: "Tu acceso es revocable", en: "Your access is revocable" },
            text: {
              es: "Podemos quitarte el acceso en cualquier momento, y eso no es desconfianza: es justo lo que nos permite darte publicación inmediata sin una cola de revisión. Si pierdes el teléfono o crees que alguien entró a tu cuenta, avísanos de una vez — se corta en un minuto y no pasa nada.",
              en: "We can remove your access at any time, and that isn't distrust: it's exactly what lets us give you instant publishing with no review queue. If you lose your phone or think someone got into your account, tell us right away — it's cut off in a minute and nothing else happens.",
            },
          },
        ],
      },
      {
        heading: { es: "4. Lo que publicas sale de inmediato", en: "4. What you publish goes live immediately" },
        blocks: [
          {
            text: {
              es: "No hay una cola que revise tus cambios: eres una persona de confianza y lo que guardas se ve al instante en el mapa público. Por eso el cuidado va antes de guardar, no después. Todo queda registrado con tu nombre en la bitácora, y el acceso es revocable en cualquier momento.",
              en: "There is no queue reviewing your changes: you are a trusted person and what you save appears on the public map instantly. That's why the care goes before saving, not after. Everything is logged under your name in the audit log, and access is revocable at any time.",
            },
          },
        ],
      },
      {
        heading: { es: "5. Novedades", en: "5. Activity" },
        blocks: [
          {
            text: {
              es: "La primera pestaña muestra qué se ha movido en la plataforma y qué falta por revisar. Se actualiza sola cada minuto. Los avisos pendientes te llevan directo al sitio donde se resuelven.",
              en: "The first tab shows what has moved on the platform and what is still pending review. It refreshes on its own every minute. The pending pills take you straight to where each one is resolved.",
            },
          },
        ],
      },
      {
        heading: { es: "6. Personas", en: "6. People" },
        blocks: [
          {
            bullets: [
              { es: "Agrega o edita a una persona: apellidos, nombres, cédula, edad, sexo, centro y estatus (Ingresado, De alta, Fallecido).", en: "Add or edit a person: surnames, names, ID, age, sex, centre and status (Admitted, Discharged, Deceased)." },
              { es: 'El interruptor "Verificado" es lo que hace pública la foto y confirma el registro con el check verde. Márcalo solo si confirmaste el dato en campo.', en: 'The "Verified" switch is what makes the photo public and confirms the record with the green check. Only turn it on if you confirmed the data in the field.' },
              { es: 'Si una fila tiene una insignia ámbar "N ⬆", alguien del público aportó una foto o información a ese registro: ábrela con el lápiz y aprueba o rechaza dentro de la ficha.', en: 'If a row shows an amber "N ⬆" badge, someone from the public contributed a photo or info to that record: open it with the pencil and approve or reject inside the card.' },
              { es: "Antes de aprobar una foto, corrobórala con una persona. Nunca publiques una cara que no puedas sostener.", en: "Before approving a photo, corroborate it with a person. Never publish a face you can't stand behind." },
            ],
          },
        ],
      },
      {
        heading: { es: "7. Centros", en: "7. Centres" },
        blocks: [
          {
            bullets: [
              { es: "Agrega hospitales, refugios, morgues y centros de acopio. Al escribir la dirección, el buscador rellena estado, municipio y coordenadas.", en: "Add hospitals, shelters, morgues and donation centres. Typing the address auto-fills state, municipality and coordinates." },
              { es: "Verifica el pin en el mapa antes de guardar: un pin mal puesto manda a una familia asustada al lugar equivocado.", en: "Check the pin on the map before saving: a misplaced pin sends a frightened family to the wrong place." },
              { es: 'En refugios y centros de acopio aparece el bloque "Necesidades": qué recibe el lugar y qué necesita ahora. Es lo que la gente ve para poder ayudar.', en: 'Shelters and donation centres show the "Needs" block: what the place receives and what it needs right now. That is what people see in order to help.' },
              { es: "Borrar un centro es solo para administradores, porque arrastra consigo a las personas registradas ahí.", en: "Deleting a centre is admin-only, because it drags along the people registered there." },
            ],
          },
        ],
      },
      {
        heading: { es: "8. Donaciones", en: "8. Donations" },
        blocks: [
          {
            text: {
              es: "Las organizaciones que recogen dinero o insumos se listan aquí: nombre, qué hacen, su red social, el enlace para donar y los datos para recibir donaciones (Pago Móvil, cuenta, Zelle). Puedes agregarlas y editarlas. Comprueba que el enlace y los datos bancarios sean los que la propia organización publica: aquí un error manda dinero al lugar equivocado.",
              en: "Organizations collecting money or supplies are listed here: name, what they do, their social account, the donate link and the details to receive donations (Pago Móvil, bank account, Zelle). You can add and edit them. Check that the link and the banking details match what the organization itself publishes: a mistake here sends money to the wrong place.",
            },
          },
        ],
      },
      {
        heading: { es: "9. Subir listas", en: "9. Upload lists" },
        blocks: [
          {
            text: {
              es: "Es la vía más rápida en campo: fotografía la lista manuscrita o impresa y nosotros la digitalizamos. Puedes seleccionar varias fotos de una vez (una por página) y todas van al mismo centro. Indica la fecha a la que corresponde el dato si no es de hoy. Verás el progreso y un aviso que se queda en pantalla diciendo cuántas se enviaron; si alguna falla, reintenta solo esa.",
              en: "This is the fastest route in the field: photograph the handwritten or printed list and we digitize it. You can select several photos at once (one per page) and they all go to the same centre. Set the date the data corresponds to if it isn't today. You'll see progress and a message that stays on screen saying how many were sent; if one fails, retry just that one.",
            },
          },
        ],
      },
      {
        heading: { es: "10. Rescatados", en: "10. Rescued" },
        blocks: [
          {
            text: {
              es: "Para gente sacada con vida que todavía no sabemos a dónde fue trasladada. Publicarla permite que su familia sepa que está viva mientras se confirma el resto. Cuando averigües a qué centro llegó y en qué estado, usa \"Trasladar\": el registro pasa a ser una persona en el mapa y sale de la lista de rescatados.",
              en: "For people pulled out alive whose transfer destination we don't know yet. Publishing them lets their family know they're alive while the rest is confirmed. When you find out which centre they reached and in what condition, use \"Transfer\": the record becomes a person on the map and leaves the rescued list.",
            },
          },
        ],
      },
      {
        heading: { es: "11. Reportes", en: "11. Reports" },
        blocks: [
          {
            text: {
              es: "Aquí llegan las familias que buscan a alguien. No son registros públicos: son pistas para que busques en la base. Márcalos como revisados o ciérralos para que el equipo sepa cuáles ya se atendieron.",
              en: "This is where families searching for someone arrive. They are not public records: they're leads for you to search the database with. Mark them reviewed or close them so the team knows which ones were handled.",
            },
          },
        ],
      },
      {
        heading: { es: "12. Reglas que no se rompen", en: "12. Rules that are never broken" },
        blocks: [
          {
            bullets: [
              { es: "Menores: nunca foto, nunca cédula. El sistema lo fuerza, pero no lo intentes.", en: "Minors: never a photo, never an ID. The system enforces it, but don't try it." },
              { es: "La procedencia (de dónde vive la persona) y el servicio médico jamás se muestran en público. Nombre + foto + dirección es una vía de acoso.", en: "Home origin and medical service are never shown publicly. Name + photo + address is a targeting vector." },
              { es: "Un fallecido solo se publica cuando está verificado, y se trata con respeto: sin alarmismo, sin cifras para captura de pantalla.", en: "A deceased record is only published once verified, and is treated with respect: no alarmism, no figures made for screenshots." },
              { es: "Ante la duda, elige la opción más restrictiva y pregúntale al equipo. Nadie te va a reclamar por preguntar.", en: "When in doubt, choose the more restrictive option and ask the team. No one will fault you for asking." },
            ],
          },
        ],
      },
      {
        heading: { es: "13. Si estás sin señal", en: "13. If you're offline" },
        blocks: [
          {
            text: {
              es: "La app guarda lo último que cargó, así que puedes seguir consultando sin conexión; verás un aviso de que los datos pueden estar desactualizados. Para guardar cambios sí hace falta conexión: si algo no guarda, espera a tener señal y vuelve a intentarlo antes de darlo por hecho.",
              en: "The app keeps the last data it loaded, so you can keep consulting offline; you'll see a notice that the data may be out of date. Saving changes does need a connection: if something doesn't save, wait for signal and try again before assuming it went through.",
            },
          },
        ],
      },
      {
        heading: { es: "Dudas", en: "Questions" },
        blocks: [
          {
            text: {
              es: "Escríbenos a info@helpmapvzla.net. Si encuentras un dato equivocado publicado, avísanos aunque no lo hayas cargado tú: corregir rápido vale más que averiguar quién se equivocó.",
              en: "Write to info@helpmapvzla.net. If you find wrong data published, tell us even if you didn't upload it: fixing it fast matters more than finding out who got it wrong.",
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------ Colabora, financia y despliega
  {
    slug: "colabora",
    title: { es: "Colabora, financia y despliega", en: "Collaborate, fund & deploy", pt: "Colabore, financie e implante" },
    intro: {
      es: "HelpMap ya está en línea y ayudando a reunir familias en Venezuela. Es una respuesta ciudadana, sin fines de lucro y de código abierto, construida para replicarse. Así puedes sumarte: con financiamiento, aporte en especie, desplegándola en tu país o como aliado.",
      en: "HelpMap is already live and helping reunite families in Venezuela. It's a non-profit, open-source citizen response, built to be replicated. Here's how you can join: with funding, in-kind support, deploying it in your country, or as an ally.",
    },
    sections: [
      {
        heading: { es: "Por qué apoyar", en: "Why support it" },
        blocks: [
          {
            text: {
              es: "En una catástrofe, la primera necesidad es saber dónde está tu gente. HelpMap convierte información dispersa —hospitales, refugios, rescatistas, listas manuscritas— en un mapa verificado y buscable, en el teléfono, incluso sin buena señal. Es infraestructura cívica: la sostiene un equipo voluntario y la usan miles de familias.",
              en: "In a disaster, the first need is knowing where your people are. HelpMap turns scattered information —hospitals, shelters, rescuers, handwritten lists— into a verified, searchable map, on the phone, even on a weak connection. It's civic infrastructure: run by a volunteer team and used by thousands of families.",
            },
          },
        ],
      },
      {
        heading: { es: "Nuestro impacto hasta ahora", en: "Our impact so far" },
        blocks: [
          {
            text: {
              es: "Construido por un equipo pequeño de voluntarios, en tiempo récord y con recursos mínimos, durante la respuesta al terremoto de junio de 2026. Cifras aproximadas y en crecimiento:",
              en: "Built by a small volunteer team, in record time and with minimal resources, during the response to the June 2026 earthquake. Approximate and growing figures:",
            },
          },
          {
            bullets: [
              { es: "~12.000 registros de datos procesados por la plataforma.", en: "~12,000 data records processed by the platform." },
              { es: "~4.000 fichas de personas verificadas y depuradas en centros de salud.", en: "~4,000 people records verified and cleaned at health centres." },
              { es: "~100 refugios y ~90 centros de acopio mapeados, con necesidades en vivo.", en: "~100 shelters and ~90 donation centres mapped, with live needs." },
              { es: "~50 voluntarios activos, en campo y en línea; ~200 usuarios diarios.", en: "~50 active volunteers, in the field and online; ~200 daily users." },
              { es: "Cobertura en medios nacionales: Venevisión (TV) y Líder (radio).", en: "National media coverage: Venevisión (TV) and Líder (radio)." },
            ],
          },
        ],
      },
      {
        heading: { es: "Cómo se sostiene: tres pilares", en: "How it's sustained: three pillars" },
        blocks: [
          {
            text: {
              es: "Nunca cobramos a las personas vulnerables a las que servimos ni vendemos su información. Quienes financian la plataforma son quienes apoyan la misión, no quienes la necesitan. La sostenibilidad se apoya en tres pilares:",
              en: "We never charge the vulnerable people we serve, nor sell their information. Those who fund the platform are those who support the mission, not those who need it. Sustainability rests on three pillars:",
            },
          },
          {
            bullets: [
              { es: "Subvenciones y financiamiento institucional (fondos de impacto social, tecnología cívica y respuesta a desastres).", en: "Grants and institutional funding (social-impact, civic-tech and disaster-response funds)." },
              { es: "Alianzas de responsabilidad social con el sector privado (patrocinio, aporte en especie, campañas conjuntas).", en: "Corporate social-responsibility partnerships (sponsorship, in-kind support, joint campaigns)." },
              { es: "Marco de código abierto replicable: desplegable en cualquier crisis o país, lo que abre financiamiento internacional.", en: "A replicable open-source framework: deployable in any crisis or country, which opens international funding." },
            ],
          },
        ],
      },
      {
        heading: { es: "Financia y patrocina", en: "Fund & sponsor" },
        blocks: [
          {
            text: {
              es: "Tu aporte sostiene y escala la operación. En concreto, el financiamiento cubre:",
              en: "Your support sustains and scales the operation. Concretely, funding covers:",
            },
          },
          {
            bullets: [
              { es: "Infraestructura: servidores, base de datos, dominio y envíos.", en: "Infrastructure: servers, database, domain and messaging." },
              { es: "Verificación en campo: contactos y logística para confirmar cada dato.", en: "Field verification: contacts and logistics to confirm each record." },
              { es: "Equipo y coordinación para mantener la respuesta activa 24/7.", en: "Team and coordination to keep the response active 24/7." },
              { es: "Difusión para que las familias afectadas encuentren la herramienta.", en: "Outreach so affected families find the tool." },
            ],
          },
          {
            text: {
              es: "Somos transparentes: sin fines de lucro, sin publicidad y sin venta de datos. El dinero va a la operación.",
              en: "We're transparent: non-profit, no ads and no data sales. Funds go to the operation.",
            },
          },
        ],
      },
      {
        heading: { es: "Aporte en especie (sector privado)", en: "In-kind support (private sector)" },
        blocks: [
          {
            text: {
              es: "Llamamos a las empresas a colaborar con esta acción cívica sin necesidad de un cheque:",
              en: "We call on companies to collaborate with this civic action without needing a cheque:",
            },
          },
          {
            bullets: [
              { es: "Conectividad y datos móviles para el equipo en campo.", en: "Connectivity and mobile data for the field team." },
              { es: "Hosting, créditos de nube y herramientas técnicas.", en: "Hosting, cloud credits and technical tooling." },
              { es: "Redes médicas, hospitalarias y logísticas para verificar y trasladar.", en: "Medical, hospital and logistics networks to verify and transfer." },
              { es: "Difusión: medios, telecom y marcas que amplíen el alcance.", en: "Outreach: media, telecom and brands that amplify reach." },
            ],
          },
        ],
      },
      {
        heading: { es: "Despliega HelpMap en tu país o región", en: "Deploy HelpMap in your country or region" },
        blocks: [
          {
            text: {
              es: "HelpMap está pensado para replicarse. La emergencia fue en Venezuela, pero la necesidad —reunir familias, coordinar ayuda, dar información veraz— es universal. Si tu gobierno, ONG u organización quiere desplegar una instancia ante una emergencia, hablemos: buscamos que montar una nueva sea cuestión de horas, no de semanas.",
              en: "HelpMap is built to be replicated. The emergency was in Venezuela, but the need —reuniting families, coordinating aid, giving truthful information— is universal. If your government, NGO or organization wants to deploy an instance in an emergency, let's talk: our goal is to make standing up a new one a matter of hours, not weeks.",
            },
          },
        ],
      },
      {
        heading: { es: "Súmate como aliado o voluntario", en: "Join as an ally or volunteer" },
        blocks: [
          {
            text: {
              es: "Esta es acción cívica: los civiles dan su parte. Organizaciones y medios pueden ser aliados y multiplicadores; el personal de salud y rescate puede sumarse como voluntario verificado. Cada quien aporta desde donde está.",
              en: "This is civic action: civilians do their part. Organizations and media can be allies and multipliers; health and rescue staff can join as vetted volunteers. Everyone contributes from where they are.",
            },
          },
        ],
      },
      {
        heading: { es: "Hablemos", en: "Let's talk" },
        blocks: [
          {
            bullets: [
              { es: "Escríbenos a info@helpmapvzla.net con el asunto \"Alianza\" o \"Financiamiento\".", en: "Write to info@helpmapvzla.net with the subject \"Partnership\" or \"Funding\"." },
              { es: "Sitio: helpmapvzla.net · Instagram: @helpmapvzla", en: "Site: helpmapvzla.net · Instagram: @helpmapvzla" },
              { es: "Por Tropical Sadness x Imágenes Nacionales — un esfuerzo ciudadano.", en: "By Tropical Sadness x Imágenes Nacionales — a citizen effort." },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------- Para prensa y aliados
  {
    slug: "prensa",
    title: { es: "Para prensa y aliados", en: "For press & partners" },
    intro: {
      es: "Información para medios, organizaciones y aliados que quieran entender, citar o colaborar con HelpMap VE.",
      en: "Information for media, organizations and partners who want to understand, cite or collaborate with HelpMap VE.",
    },
    sections: [
      {
        heading: { es: "Qué es", en: "What it is" },
        blocks: [
          {
            text: {
              es: "Una plataforma abierta para localizar personas y ayuda en emergencias. Está en línea en helpmapvzla.net desde la respuesta al terremoto de junio de 2026, y ayuda a ubicar a personas ingresadas en hospitales o en refugios —y a encontrar refugios y centros de acopio— en Caracas (Distrito Capital), La Guaira, Miranda y estados ampliados. Es de código abierto y sin fines de lucro.",
              en: "An open platform to locate people and help in emergencies. It's live at helpmapvzla.net since the response to the June 2026 earthquake, helping locate people admitted to hospitals or sheltered —and find shelters and donation centres— in Caracas (Distrito Capital), La Guaira, Miranda and expanded states. It's open-source and non-profit.",
            },
          },
        ],
      },
      {
        heading: { es: "Quién lo construye", en: "Who builds it" },
        blocks: [
          {
            text: {
              es: "Un equipo de tres desarrolladores voluntarios (Mérida, Venezuela) —Tropical Sadness x Imágenes Nacionales— junto a una red de personal de salud, rescate y voluntariado civil. Es un esfuerzo ciudadano, sin fines de lucro.",
              en: "A team of three volunteer developers (Mérida, Venezuela) —Tropical Sadness x Imágenes Nacionales— together with a network of health, rescue and civic-volunteer staff. It's a non-profit citizen effort.",
            },
          },
        ],
      },
      {
        heading: { es: "Impacto y reconocimiento", en: "Impact & recognition" },
        blocks: [
          {
            text: {
              es: "Construido en tiempo récord y con recursos mínimos durante la emergencia. Cifras aproximadas y en crecimiento:",
              en: "Built in record time and with minimal resources during the emergency. Approximate and growing figures:",
            },
          },
          {
            bullets: [
              { es: "~12.000 registros procesados y ~4.000 fichas verificadas en centros de salud.", en: "~12,000 records processed and ~4,000 records verified at health centres." },
              { es: "~100 refugios y ~90 centros de acopio mapeados con necesidades en vivo.", en: "~100 shelters and ~90 donation centres mapped with live needs." },
              { es: "~50 voluntarios activos y ~200 usuarios diarios.", en: "~50 active volunteers and ~200 daily users." },
              { es: "Reseñado por medios nacionales: Venevisión (TV) y Líder (radio).", en: "Featured by national media: Venevisión (TV) and Líder (radio)." },
            ],
          },
        ],
      },
      {
        heading: { es: "Metodología", en: "Methodology" },
        blocks: [
          {
            text: {
              es: "Los datos se confirman en campo con contactos en centros de salud y se verifican manualmente antes de publicarse. Cada registro lleva una insignia de verificación.",
              en: "Data is confirmed in the field with contacts at health centres and verified manually before publishing. Each record carries a verification badge.",
            },
          },
        ],
      },
      {
        heading: { es: "Compromiso con la privacidad", en: "Privacy commitment" },
        blocks: [
          {
            text: {
              es: "No exponemos datos de menores ni direcciones de origen; no cobramos, no mostramos publicidad y no vendemos datos. Las búsquedas son privadas.",
              en: "We don't expose minors' data or home addresses; we don't charge, show ads or sell data. Searches are private.",
            },
          },
        ],
      },
      {
        heading: { es: "Cómo citar o colaborar", en: "How to cite or collaborate" },
        blocks: [
          {
            bullets: [
              { es: "Sitio: helpmapvzla.net · Instagram: @helpmapvzla", en: "Site: helpmapvzla.net · Instagram: @helpmapvzla" },
              { es: "Contacto: info@helpmapvzla.net", en: "Contact: info@helpmapvzla.net" },
            ],
          },
        ],
      },
    ],
  },
];

export const getDoc = (slug: string) => DOCS.find((d) => d.slug === slug);
