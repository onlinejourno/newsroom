import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Playfair_Display,
  Noto_Serif,
  Noto_Serif_Devanagari,
  Noto_Naskh_Arabic,
  Source_Sans_3,
} from "next/font/google";
import "../globals.css";
import { locales, dirOf, isLocale, defaultLocale, meta } from "@/lib/locale";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif-devanagari",
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-noto-naskh-arabic",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = meta[isLocale(locale) ? locale : defaultLocale];
  return {
    title,
    description,
    icons: { icon: "/brand/favicon.svg" },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${playfair.variable} ${notoSerif.variable} ${notoSerifDevanagari.variable} ${notoNaskhArabic.variable} ${sourceSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
