import type { MetadataRoute } from "next";
import { defaultLocale } from "@/lib/locale";

const BASE = "https://app.onlinejourno.com";

// Public, ungated marketing/landing surfaces only — the authed workspace
// (brief, calendar, gaps, signals, …) is behind login and intentionally omitted.
const PUBLIC_PATHS = ["", "showcase", "standards", "architecture", "register", "login"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((p) => ({
    url: `${BASE}/${defaultLocale}${p ? `/${p}` : ""}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.6,
  }));
}
