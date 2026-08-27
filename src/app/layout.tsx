import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// ABC Favorit es la tipografía del estudio. La licencia que nos pasaron sólo
// incluye el peso Bold de la sans, así que la reservamos para titulares; el
// cuerpo de texto sigue en Geist, que sí tiene la familia de pesos completa.
const favorit = localFont({
  src: "./fonts/ABCFavorit-Bold.otf",
  weight: "700",
  variable: "--font-favorit",
  display: "swap",
});

const favoritMono = localFont({
  src: [
    { path: "./fonts/ABCFavoritMono-Book.otf", weight: "400", style: "normal" },
    { path: "./fonts/ABCFavoritMono-BookItalic.otf", weight: "400", style: "italic" },
    { path: "./fonts/ABCFavoritMono-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/ABCFavoritMono-BoldItalic.otf", weight: "700", style: "italic" },
  ],
  variable: "--font-favorit-mono",
  display: "swap",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

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
      className={`${favorit.variable} ${favoritMono.variable} ${geist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
