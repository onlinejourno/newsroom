// Built-in connector catalog (ADR 0044). Static config the admin form reads:
// category -> providers -> integration modes + required config fields + OSS flag.
// Every category ships at least one open-source (oss) provider so no newsroom
// is excluded for lacking paid tools.

export type ConnectorMode = "api" | "mcp";

export type ProviderField = {
  name: string;
  label: string;
  placeholder?: string;
  secret?: boolean; // stored as an env reference, never the raw value
};

export type ProviderDef = {
  key: string;
  label: string;
  modes: ConnectorMode[];
  oss?: boolean;
  fields: ProviderField[];
};

export type CategoryDef = {
  key: string;
  label: string;
  contract: string; // the capability contract the platform calls
  providers: ProviderDef[];
};

const SECRET_REF: ProviderField = {
  name: "secret_ref",
  label: "Secret env reference (not the key)",
  placeholder: "MY_TOOL_API_KEY",
  secret: true,
};

const MCP_FIELDS: ProviderField[] = [
  { name: "server", label: "MCP server (URL or command)", placeholder: "https://… or npx …" },
  { name: "tool", label: "Tool name", placeholder: "get_metrics" },
];

export const CONNECTOR_CATALOG: CategoryDef[] = [
  {
    key: "cms",
    label: "CMS (read-only — the inside end)",
    contract: "stories(since) -> own drafts + published",
    providers: [
      { key: "wordpress", label: "WordPress (OSS — testable now)", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Site URL" }, SECRET_REF] },
      { key: "ghost", label: "Ghost (OSS)", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Admin API URL" }, SECRET_REF] },
      { key: "superdesk", label: "Superdesk (OSS newsroom CMS)", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Superdesk URL" }, SECRET_REF] },
      { key: "drupal", label: "Drupal (OSS — JSON:API)", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Site URL" }, SECRET_REF] },
      { key: "strapi", label: "Strapi / headless (OSS)", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "API URL" }, SECRET_REF] },
      { key: "cue", label: "CUE (Naviga) — proprietary", modes: ["api"], fields: [{ name: "base_url", label: "Content Store URL" }, SECRET_REF] },
      { key: "methode", label: "Méthode — proprietary", modes: ["api", "mcp"], fields: [{ name: "base_url", label: "Endpoint" }, SECRET_REF] },
      { key: "arc", label: "Arc XP — proprietary", modes: ["api"], fields: [{ name: "base_url", label: "Content API URL" }, SECRET_REF] },
      { key: "custom", label: "Custom (API/MCP)", modes: ["api", "mcp"], fields: [{ name: "endpoint", label: "Endpoint / MCP server" }, SECRET_REF] },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    contract: "page_performance(url, range)",
    providers: [
      { key: "ga4", label: "Google Analytics 4", modes: ["api"], fields: [{ name: "property_id", label: "Property ID" }, SECRET_REF] },
      { key: "chartbeat", label: "Chartbeat", modes: ["api"], fields: [{ name: "site", label: "Site domain" }, SECRET_REF] },
      { key: "piano", label: "Piano", modes: ["api"], fields: [{ name: "aid", label: "App ID" }, SECRET_REF] },
      { key: "matomo", label: "Matomo", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Matomo URL" }, { name: "site_id", label: "Site ID" }, SECRET_REF] },
      { key: "umami", label: "Umami", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Umami URL" }, { name: "website_id", label: "Website ID" }, SECRET_REF] },
      { key: "plausible", label: "Plausible", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "Plausible URL", placeholder: "https://plausible.io" }, { name: "site_id", label: "Site ID (domain)" }, SECRET_REF] },
      { key: "goaccess", label: "GoAccess (server logs)", modes: ["api"], oss: true, fields: [{ name: "report_url", label: "GoAccess JSON report URL", placeholder: "https://…/report.json" }] },
      { key: "custom", label: "Custom (MCP)", modes: ["mcp"], fields: MCP_FIELDS },
    ],
  },
  {
    key: "keywords",
    label: "Keywords / SEO",
    contract: "keyword_data(terms)",
    providers: [
      { key: "keywords_everywhere", label: "Keywords Everywhere", modes: ["api", "mcp"], fields: [SECRET_REF] },
      { key: "newzdash", label: "NewzDash", modes: ["api"], fields: [SECRET_REF] },
      { key: "seopanel", label: "SEO Panel", modes: ["api"], oss: true, fields: [{ name: "base_url", label: "SEO Panel URL" }, SECRET_REF] },
    ],
  },
  {
    key: "search_console",
    label: "Search Console",
    contract: "entity_visibility(entities|beat) + performance(url)",
    providers: [
      { key: "gsc", label: "Google Search Console", modes: ["api"], fields: [{ name: "site_url", label: "Property URL" }, SECRET_REF] },
      { key: "bing_webmaster", label: "Bing Webmaster Tools", modes: ["api"], fields: [{ name: "site_url", label: "Site URL" }, SECRET_REF] },
    ],
  },
  {
    key: "trends",
    label: "Trends",
    contract: "momentum(terms, geo)",
    providers: [
      { key: "google_trends", label: "Google Trends (pytrends)", modes: ["api"], oss: true, fields: [{ name: "geo", label: "Geo", placeholder: "IN" }] },
      { key: "custom", label: "Custom (MCP)", modes: ["mcp"], fields: MCP_FIELDS },
    ],
  },
  {
    key: "subscription",
    label: "Subscription",
    contract: "conversion(range)",
    providers: [
      { key: "piano", label: "Piano", modes: ["api"], fields: [{ name: "aid", label: "App ID" }, SECRET_REF] },
      { key: "custom", label: "Custom (API/MCP)", modes: ["api", "mcp"], fields: MCP_FIELDS },
    ],
  },
  {
    key: "social",
    label: "Social",
    contract: "reach(url)",
    providers: [
      { key: "custom", label: "Custom (API/MCP)", modes: ["api", "mcp"], fields: [{ name: "endpoint", label: "Endpoint / MCP server" }, SECRET_REF] },
    ],
  },
];

export function categoryDef(key: string): CategoryDef | undefined {
  return CONNECTOR_CATALOG.find((c) => c.key === key);
}
