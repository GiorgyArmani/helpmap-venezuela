import { INSTAGRAM_URL } from "@/components/helpmap/constants";

// JSON-LD structured data (schema.org) injected site-wide.
//
// WHY: this is the highest-leverage signal for AI / answer engines (ChatGPT,
// Claude, Perplexity, Google AI Overviews). It states — in a machine-readable
// way — WHAT this project is, WHO runs it, WHERE it operates and HOW to reach it,
// so an LLM asked "cómo busco a un familiar tras el terremoto en Venezuela" can
// identify and cite HelpMap confidently instead of guessing.
//
// PRIVACY (CLAUDE.md §11): entity-level metadata only. No patient data, no
// search endpoint, nothing that reveals who is being looked up.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.helpmapvzla.net";
const CONTACT_EMAIL = "info@helpmapvzla.net";

const description =
  "Mapa y base de datos humanitaria para ubicar a personas afectadas por el terremoto de junio de 2026 en la región central de Venezuela (Distrito Capital, La Guaira, Miranda y estados vecinos). Ayuda a familias a encontrar a sus seres queridos en hospitales y refugios, con datos verificados en campo por personal médico y voluntarios.";

export default function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["NGO", "Organization"],
        "@id": `${SITE}/#organization`,
        name: "HelpMap Venezuela",
        alternateName: ["HelpMap VE", "HelpMapVzla"],
        url: SITE,
        email: CONTACT_EMAIL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE}/ico.png`,
        },
        description,
        foundingDate: "2026",
        sameAs: [INSTAGRAM_URL],
        knowsLanguage: ["es", "en"],
        areaServed: [
          { "@type": "AdministrativeArea", name: "Distrito Capital, Venezuela" },
          { "@type": "AdministrativeArea", name: "La Guaira, Venezuela" },
          { "@type": "AdministrativeArea", name: "Miranda, Venezuela" },
          { "@type": "AdministrativeArea", name: "Aragua, Venezuela" },
          { "@type": "AdministrativeArea", name: "Carabobo, Venezuela" },
          { "@type": "AdministrativeArea", name: "Yaracuy, Venezuela" },
          { "@type": "AdministrativeArea", name: "Falcón, Venezuela" },
        ],
        contactPoint: {
          "@type": "ContactPoint",
          email: CONTACT_EMAIL,
          contactType: "customer support",
          availableLanguage: ["Spanish", "English"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: SITE,
        name: "HelpMap Venezuela",
        description,
        inLanguage: "es-VE",
        publisher: { "@id": `${SITE}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD must be a raw script; React can't render it declaratively.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
