import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import {
  Playfair_Display,
  Source_Sans_3,
  Noto_Serif,
  Noto_Serif_Devanagari,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
  Noto_Serif_Tamil,
  Noto_Serif_Kannada,
  Noto_Serif_Malayalam,
  Noto_Serif_Telugu,
  Noto_Serif_Bengali,
  Noto_Serif_Ethiopic,
} from "next/font/google";
import "../globals.css";
import Breadcrumbs from "@/components/Breadcrumbs";
import Masthead from "@/components/Masthead";
import { getAccount } from "@/lib/auth";
import { locales, dirOf, isLocale, defaultLocale, meta } from "@/lib/locale";

// Chrome fonts — always loaded (headings + UI, Latin).
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

// Latin body font — covers en/fr/pt/sw/de/es/id/ha + Vietnamese marks.
const notoSerif = Noto_Serif({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

// Per-script body fonts. preload:false so a page only fetches the file
// when its script is actually rendered (one script per locale).
// next/font requires literal option objects (no spread), hence the repetition.
const notoDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoTamil = Noto_Serif_Tamil({
  subsets: ["tamil"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoKannada = Noto_Serif_Kannada({
  subsets: ["kannada"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoMalayalam = Noto_Serif_Malayalam({
  subsets: ["malayalam"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoTelugu = Noto_Serif_Telugu({
  subsets: ["telugu"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});
const notoEthiopic = Noto_Serif_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

type LoadedFont = { style: { fontFamily: string } };

// Locale → its script body font. Latin locales fall back to notoSerif.
const scriptFont: Partial<Record<string, LoadedFont>> = {
  hi: notoDevanagari,
  mr: notoDevanagari,
  bho: notoDevanagari,
  ar: notoNaskh,
  ur: notoNastaliq,
  ta: notoTamil,
  kn: notoKannada,
  ml: notoMalayalam,
  te: notoTelugu,
  bn: notoBengali,
  am: notoEthiopic,
};

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
    icons: {
      icon: [
        { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/brand/favicon-64.png", sizes: "64x64", type: "image/png" },
      ],
      apple: "/brand/favicon-180.png",
    },
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

  const account = await getAccount();
  const body = scriptFont[locale] ?? notoSerif;
  const display = scriptFont[locale] ?? playfair;

  // Latin fallback after the script font handles brand name + "AI" etc.
  const fontVars = {
    "--font-display": `${display.style.fontFamily}, Georgia, "Times New Roman", serif`,
    "--font-body": `${body.style.fontFamily}, ${notoSerif.style.fontFamily}, Georgia, serif`,
  } as React.CSSProperties;

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      style={fontVars}
      className={`${playfair.variable} ${sourceSans.variable} ${notoSerif.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {/* Privacy-first analytics (Umami): cookieless, no PII, honors DNT.
            Env-gated — renders only when the deploy configures its own Umami. */}
        {process.env.NEXT_PUBLIC_UMAMI_SRC && process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_SRC}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            data-do-not-track="true"
            strategy="afterInteractive"
          />
        )}
        {account?.demo && (
          <div className="ds-meta" style={{ background: "var(--color-frame)", color: "var(--color-paper)", textAlign: "center", padding: "4px" }}>
            DEMO · read-only — <a href={`/${locale}/register`} style={{ textDecoration: "underline" }}>Request full access</a>
          </div>
        )}
        <Masthead
          locale={locale}
          role={account?.role ?? null}
          userName={account?.display_name ?? null}
        />
        {account ? <Breadcrumbs /> : null}
        {children}
      </body>
    </html>
  );
}
