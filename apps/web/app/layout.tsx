import type { Metadata } from "next";
import { Playfair_Display, Noto_Serif, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OnlineJourno — Editorial Intelligence Platform",
  description:
    "Editorial intelligence platform for newsrooms. Source monitoring, framing analysis, and AI-assisted brief delivery — journalist-first, configurable per newsroom.",
  icons: {
    icon: "/brand/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${notoSerif.variable} ${sourceSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
