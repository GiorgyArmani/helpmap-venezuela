import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import StructuredData from "@/components/StructuredData";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-T75QMEHWTP";

const DESCRIPTION =
  "Base de datos verificada de personas afectadas por el terremoto en la región central de Venezuela, en constante actualización por personal médico en campo.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.helpmapvzla.net"),
  applicationName: "HelpMap Venezuela",
  title: {
    default: "HelpMap Venezuela — Buscar familiares tras el terremoto",
    template: "%s",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  keywords: [
    "helpmap",
    "helpmap venezuela",
    "personas desaparecidas venezuela",
    "desaparecidos terremoto caracas",
    "emergencia caracas la guaira",
    "buscar personas venezuela",
    "ayuda humanitaria venezuela",
    "terremoto venezuela 2026",
    "listado de heridos venezuela",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HelpMap",
  },
  openGraph: {
    title: "HelpMap Venezuela",
    description: DESCRIPTION,
    siteName: "HelpMap Venezuela",
    type: "website",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: "HelpMap Venezuela",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#15181d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <StructuredData />
        {/* Google Tag (gtag.js). PRIVACY (CLAUDE.md §11): searches are sensitive and a
            patient UUID must never reach analytics. We disable GA's automatic page_view
            and send one manually with the /p/<uuid> path REDACTED to /p/[id] — so GA only
            ever records an aggregate per-patient count, never who is being looked up. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            var __p = location.pathname.replace(/^\\/p\\/[^\\/]+/, '/p/[id]');
            gtag('config', '${GA_ID}', {
              send_page_view: false,
              page_path: __p,
              page_location: location.origin + __p + location.search,
            });
            gtag('event', 'page_view', {
              page_path: __p,
              page_location: location.origin + __p + location.search,
              page_title: document.title,
            });
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
