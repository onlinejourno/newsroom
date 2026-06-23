// Cross-property site IA — the OnlineJourno OSS ecosystem.
//
// onlinejourno.com is the vendor-neutral *project portal* (the project, not a
// news outlet — fine to reference, like the product name in the masthead). It's
// the shop window: see the platform + tools, get the code on GitHub, self-host.
//
// This is the single, extensible source for the shared nav + footer — add a
// property or page in one place. (A downstream fork can edit these URLs.)

export const SITE = {
  portal: "https://onlinejourno.com",
  app: "https://app.onlinejourno.com",
  tools: "https://tools.onlinejourno.com",
  optimiser: "https://editorial-optimiser.onlinejourno.com",
  github: "https://github.com/onlinejourno/platform",
} as const;

export type NavLink = { label: string; href: string };

// The "kinds of access" — same set + order on every property.
export const PRODUCTS: NavLink[] = [
  { label: "Home", href: SITE.portal },
  { label: "Platform", href: SITE.app },
  { label: "Tools", href: SITE.tools },
  { label: "Editorial Optimiser", href: SITE.optimiser },
  // Forthcoming (separate session) — News Ranking, which reverse-engineers
  // news-story ranking. When it ships, add `ranking: "https://ranking.onlinejourno.com"`
  // to SITE above, then: { label: "News Ranking", href: SITE.ranking }.
];

// The uniform cross-property project bar — identical six items + order on every
// .com property (portal, platform, tools, editorial-optimiser). Each emphasises
// its own. Self-hosted installs can trim this; the demo shows the full suite.
export const PROJECT_NAV: NavLink[] = [
  ...PRODUCTS,
  { label: "Docs", href: `${SITE.portal}/docs` },
  { label: "About", href: `${SITE.portal}/about` },
];

// The open-source funnel.
export const PROJECT: NavLink[] = [
  { label: "Source on GitHub", href: SITE.github },
  { label: "Self-host", href: `${SITE.portal}/about` },
];

// Standard pages (on the portal) — in every footer for SEO.
export const FOOTER_PAGES: NavLink[] = [
  { label: "About", href: `${SITE.portal}/about` },
  { label: "Privacy Policy", href: `${SITE.portal}/privacy-policy` },
  { label: "Contact", href: `${SITE.portal}/contact` },
  { label: "License & Attribution", href: `${SITE.portal}/license-attribution` },
];
