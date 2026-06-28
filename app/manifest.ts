import type { MetadataRoute } from "next";

// Web app manifest (Next.js file convention — served at /manifest.webmanifest
// and auto-linked into <head>). Makes HelpMap installable and offline-capable.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelpMap Venezuela",
    short_name: "HelpMap",
    description: "Registro humanitario · Caracas y La Guaira",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#15181d",
    lang: "es",
    categories: ["medical", "health", "social"],
    icons: [
      { src: "/ico.png", sizes: "1000x1000", type: "image/png", purpose: "any" },
      { src: "/ico.png", sizes: "1000x1000", type: "image/png", purpose: "maskable" },
    ],
  };
}
