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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
