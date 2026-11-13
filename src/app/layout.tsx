import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// La tipografía del estudio es ABC Favorit, pero la licencia que nos pasaron es de
// escritorio y este repo es público: mientras el estudio no confirme la licencia web,
// los titulares y los rótulos van en Geist (ver valkyria/DECISIONES.md). Cuando lleguen
// los WOFF2, se vuelve a `next/font/local` en este archivo y en globals.css.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
// El panel interno va en Plus Jakarta Sans (ver `.panel` en globals.css).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });
const rotulo = Geist_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-rotulo", display: "swap" });

export const metadata: Metadata = {
  title: "Mellow & Banana — Entrevista Proyectiva",
  description: "Una charla corta para entender tu marca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${rotulo.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
