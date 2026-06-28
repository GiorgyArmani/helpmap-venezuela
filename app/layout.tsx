import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Base de datos verificada de personas afectadas por el terremoto en Caracas, La Guaira y Miranda, en constante actualización por personal médico en campo.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.helpmapvzla.net"),
  applicationName: "HelpMap Venezuela",
  title: "HelpMap Venezuela",
  description: DESCRIPTION,
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
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
