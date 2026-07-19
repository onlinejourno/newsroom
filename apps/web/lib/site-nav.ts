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
  app: "https://app.onlinejourno.com", // OnlineJourno Newsroom (flagship)
  tools: "https://tools.onlinejourno.com",
  galley: "https://galley.onlinejourno.com",
  daybook: "https://daybook.onlinejourno.com",
  frontmatter: "https://frontmatter.onlinejourno.com",
  lawwatch: "https://lawwatch.onlinejourno.com",
  pulse: "https://onlinejourno.com/in",
  github: "https://github.com/onlinejourno",
} as const;

export type NavLink = { label: string; href: string; highlight?: boolean };

// The OnlineJourno products, by product name (not project/repo name), same set +
// order on every property. Compositor is forthcoming (in progress) — add it here
// once it has a URL. News Ranking was removed (not pursued).
export const PRODUCTS: NavLink[] = [
  { label: "Home", href: SITE.portal },
  // Pulse sits right after Home and is visually highlighted (accent + live dot)
  // — it's the daily, public, reader-facing surface (the front door).
  { label: "Pulse", href: SITE.pulse, highlight: true },
  { label: "Newsroom", href: SITE.app },
  { label: "Galley", href: SITE.galley },
  { label: "Tools", href: SITE.tools },
  { label: "Daybook", href: SITE.daybook },
  { label: "Frontmatter", href: SITE.frontmatter },
];

// The uniform cross-property project bar — identical items + order on every
// .com property (portal, Newsroom, Galley, Tools, Daybook, Pulse). Each emphasises
// its own. Self-hosted installs can trim this; the demo shows the full suite.
export const PROJECT_NAV: NavLink[] = [
  ...PRODUCTS,
  { label: "Docs", href: `${SITE.portal}/docs` },
  { label: "About", href: `${SITE.portal}/about` },
];

// Access funnel — the free tools are open source (MIT); some products are
// source-available (FSL); Newsroom / Platform is proprietary.
export const PROJECT: NavLink[] = [
  { label: "Source on GitHub", href: SITE.github },
  { label: "Request access", href: `${SITE.portal}/contact` },
];

// Standard pages (on the portal) — in every footer for SEO.
export const FOOTER_PAGES: NavLink[] = [
  { label: "About", href: `${SITE.portal}/about` },
  { label: "Privacy Policy", href: `${SITE.portal}/privacy-policy` },
  { label: "Contact", href: `${SITE.portal}/contact` },
  { label: "License & Attribution", href: `${SITE.portal}/license-attribution` },
];
