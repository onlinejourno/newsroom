// Supported locales + text-direction. Single source of truth for routing,
// middleware negotiation, and <html lang/dir>.

export const locales = [
  "en",
  "hi",
  "ar",
  "sw",
  "fr",
  "pt",
  "de",
  "es",
  "vi",
  "ta",
  "kn",
  "ml",
  "te",
  "mr",
  "bho",
  "id",
  "bn",
  "am",
  "ha",
  "ur",
] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// RTL scripts. Extend as locales grow.
const rtlLocales = new Set<Locale>(["ar", "ur"]);

export const dirOf = (locale: string): "rtl" | "ltr" =>
  rtlLocales.has(locale as Locale) ? "rtl" : "ltr";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// Per-locale page metadata. Machine-drafted for non-English; the
// non-Latin scripts (esp. ta/kn/ml/te/bn/bho/am/ur) want a human pass
// before public launch.
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
  sw: {
    title: "OnlineJourno — Jukwaa la Akili ya Uhariri",
    description:
      "Jukwaa la akili ya uhariri kwa vyumba vya habari. Ufuatiliaji wa vyanzo, uchambuzi wa mtazamo, na muhtasari unaosaidiwa na AI — mwandishi wa habari kwanza, linaloweza kusanidiwa kwa kila chumba cha habari.",
  },
  fr: {
    title: "OnlineJourno — Plateforme d'intelligence éditoriale",
    description:
      "Plateforme d'intelligence éditoriale pour les rédactions. Surveillance des sources, analyse du cadrage et synthèses assistées par IA — priorité au journaliste, configurable pour chaque rédaction.",
  },
  pt: {
    title: "OnlineJourno — Plataforma de Inteligência Editorial",
    description:
      "Plataforma de inteligência editorial para redações. Monitoramento de fontes, análise de enquadramento e resumos assistidos por IA — jornalista em primeiro lugar, configurável para cada redação.",
  },
  de: {
    title: "OnlineJourno — Plattform für redaktionelle Intelligenz",
    description:
      "Plattform für redaktionelle Intelligenz für Nachrichtenredaktionen. Quellenüberwachung, Framing-Analyse und KI-gestützte Briefings — journalistenorientiert, pro Redaktion konfigurierbar.",
  },
  es: {
    title: "OnlineJourno — Plataforma de inteligencia editorial",
    description:
      "Plataforma de inteligencia editorial para redacciones. Monitoreo de fuentes, análisis de encuadre y resúmenes asistidos por IA — primero el periodista, configurable para cada redacción.",
  },
  vi: {
    title: "OnlineJourno — Nền tảng trí tuệ biên tập",
    description:
      "Nền tảng trí tuệ biên tập cho các tòa soạn. Giám sát nguồn tin, phân tích khung tin và bản tóm tắt hỗ trợ bởi AI — ưu tiên nhà báo, có thể cấu hình cho từng tòa soạn.",
  },
  ta: {
    title: "OnlineJourno — தலையங்க நுண்ணறிவு தளம்",
    description:
      "செய்தி அறைகளுக்கான தலையங்க நுண்ணறிவு தளம். மூலங்களைக் கண்காணித்தல், கட்டமைப்பு பகுப்பாய்வு மற்றும் AI உதவியுடன் சுருக்கம் — பத்திரிகையாளர் முதன்மை, ஒவ்வொரு செய்தி அறைக்கும் கட்டமைக்கத்தக்கது.",
  },
  kn: {
    title: "OnlineJourno — ಸಂಪಾದಕೀಯ ಬುದ್ಧಿಮತ್ತೆ ವೇದಿಕೆ",
    description:
      "ಸುದ್ದಿ ಕೋಣೆಗಳಿಗಾಗಿ ಸಂಪಾದಕೀಯ ಬುದ್ಧಿಮತ್ತೆ ವೇದಿಕೆ. ಮೂಲಗಳ ಮೇಲ್ವಿಚಾರಣೆ, ಚೌಕಟ್ಟು ವಿಶ್ಲೇಷಣೆ ಮತ್ತು AI ನೆರವಿನ ಸಾರಾಂಶ — ಪತ್ರಕರ್ತ ಮೊದಲು, ಪ್ರತಿ ಸುದ್ದಿ ಕೋಣೆಗೆ ಸಂರಚಿಸಬಹುದು.",
  },
  ml: {
    title: "OnlineJourno — എഡിറ്റോറിയൽ ഇന്റലിജൻസ് പ്ലാറ്റ്ഫോം",
    description:
      "ന്യൂസ് റൂമുകൾക്കായുള്ള എഡിറ്റോറിയൽ ഇന്റലിജൻസ് പ്ലാറ്റ്ഫോം. ഉറവിട നിരീക്ഷണം, ഫ്രെയിമിംഗ് വിശകലനം, AI സഹായത്തോടെയുള്ള സംഗ്രഹം — മാധ്യമപ്രവർത്തകൻ ആദ്യം, ഓരോ ന്യൂസ് റൂമിനും ക്രമീകരിക്കാവുന്നത്.",
  },
  te: {
    title: "OnlineJourno — సంపాదకీయ మేధస్సు వేదిక",
    description:
      "న్యూస్‌రూమ్‌ల కోసం సంపాదకీయ మేధస్సు వేదిక. మూలాల పర్యవేక్షణ, ఫ్రేమింగ్ విశ్లేషణ మరియు AI సహాయక సారాంశం — జర్నలిస్ట్ ముందు, ప్రతి న్యూస్‌రూమ్‌కు అనుకూలీకరించదగినది.",
  },
  mr: {
    title: "OnlineJourno — संपादकीय बुद्धिमत्ता मंच",
    description:
      "वृत्तकक्षांसाठी संपादकीय बुद्धिमत्ता मंच. स्रोत निरीक्षण, फ्रेमिंग विश्लेषण आणि AI-सहाय्यित सारांश — पत्रकार प्रथम, प्रत्येक वृत्तकक्षासाठी संरचनायोग्य.",
  },
  bho: {
    title: "OnlineJourno — संपादकीय बुद्धिमत्ता मंच",
    description:
      "न्यूजरूम खातिर संपादकीय बुद्धिमत्ता मंच। स्रोत के निगरानी, फ्रेमिंग विश्लेषण आ AI के मदद से तइयार संक्षेप — पत्रकार पहिले, हर न्यूजरूम खातिर बनावल जा सकेला।",
  },
  id: {
    title: "OnlineJourno — Platform Intelijen Editorial",
    description:
      "Platform intelijen editorial untuk ruang redaksi. Pemantauan sumber, analisis framing, dan ringkasan berbantuan AI — mengutamakan jurnalis, dapat dikonfigurasi untuk setiap ruang redaksi.",
  },
  bn: {
    title: "OnlineJourno — সম্পাদকীয় বুদ্ধিমত্তা প্ল্যাটফর্ম",
    description:
      "নিউজরুমের জন্য সম্পাদকীয় বুদ্ধিমত্তা প্ল্যাটফর্ম। উৎস পর্যবেক্ষণ, ফ্রেমিং বিশ্লেষণ এবং AI-সহায়িত সংক্ষিপ্তসার — সাংবাদিক প্রথম, প্রতিটি নিউজরুমের জন্য কনফিগারযোগ্য।",
  },
  am: {
    title: "OnlineJourno — የአርትዖት ኢንተለጀንስ መድረክ",
    description:
      "ለዜና ክፍሎች የአርትዖት ኢንተለጀንስ መድረክ። የምንጭ ክትትል፣ የማዕቀፍ ትንተና እና በ AI የተደገፈ አጭር መግለጫ — ጋዜጠኛ መጀመሪያ፣ ለእያንዳንዱ የዜና ክፍል ሊዋቀር የሚችል።",
  },
  ha: {
    title: "OnlineJourno — Dandalin Hankali na Edita",
    description:
      "Dandalin hankali na edita don ɗakunan labarai. Sa ido kan tushe, nazarin tsarawa, da taƙaitawa tare da taimakon AI — ɗan jarida da farko, ana iya saita shi ga kowane ɗakin labarai.",
  },
  ur: {
    title: "OnlineJourno — ادارتی ذہانت کا پلیٹ فارم",
    description:
      "نیوز رومز کے لیے ادارتی ذہانت کا پلیٹ فارم۔ ذرائع کی نگرانی، فریمنگ کا تجزیہ، اور AI کی مدد سے خلاصہ — صحافی پہلے، ہر نیوز روم کے لیے قابلِ تشکیل۔",
  },
};
