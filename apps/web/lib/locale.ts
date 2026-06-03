// Supported locales + text-direction. Single source of truth for routing,
// middleware negotiation, and <html lang/dir>.

export const locales = ["en", "hi", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// RTL scripts. Extend as locales grow (he, fa, ur, ...).
const rtlLocales = new Set<Locale>(["ar"]);

export const dirOf = (locale: string): "rtl" | "ltr" =>
  rtlLocales.has(locale as Locale) ? "rtl" : "ltr";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Per-locale page metadata. Keep titles brand-prefixed.
export const meta: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "OnlineJourno — Editorial Intelligence Platform",
    description:
      "Editorial intelligence platform for newsrooms. Source monitoring, framing analysis, and AI-assisted brief delivery — journalist-first, configurable per newsroom.",
  },
  hi: {
    title: "OnlineJourno — संपादकीय इंटेलिजेंस प्लेटफ़ॉर्म",
    description:
      "न्यूज़रूम के लिए संपादकीय इंटेलिजेंस प्लेटफ़ॉर्म। स्रोत निगरानी, फ़्रेमिंग विश्लेषण और AI-सहायता प्राप्त ब्रीफ़ — पत्रकार-पहले, हर न्यूज़रूम के अनुसार विन्यास-योग्य।",
  },
  ar: {
    title: "OnlineJourno — منصة الذكاء التحريري",
    description:
      "منصة ذكاء تحريري لغرف الأخبار. مراقبة المصادر وتحليل التأطير وإيجازات مدعومة بالذكاء الاصطناعي — الصحفي أولاً، قابلة للتهيئة لكل غرفة أخبار.",
  },
};
