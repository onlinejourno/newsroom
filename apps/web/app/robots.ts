import type { MetadataRoute } from "next";

// AI *training* scrapers are disallowed; search crawlers and answer-engine
// citation fetchers (which drive referral traffic) are left allowed.
// Founder decision 2026-07-04: gate the training crawlers.
const TRAINING_CRAWLERS = [
  "GPTBot",
  "Google-Extended",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "cohere-ai",
  "Diffbot",
  "FacebookBot",
  "meta-externalagent",
  "ImagesiftBot",
  "Omgilibot",
  "PetalBot",
  "Timpibot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/*/admin", "/*/account"] },
      ...TRAINING_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: "https://app.onlinejourno.com/sitemap.xml",
    host: "https://app.onlinejourno.com",
  };
}
