import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typedRoutes: true,
  // The retired /eip-signals stub folded into /signals; old URLs keep working.
  async redirects() {
    return [
      {
        source: "/eip-signals",
        destination: "/signals",
        permanent: true,
      },
      {
        source: "/:locale/eip-signals",
        destination: "/:locale/signals",
        permanent: true,
      },
    ];
  },
  // Baseline security headers on every response. app.onlinejourno.com is served
  // directly by Fly (not Cloudflare-proxied at the edge for this host), so HSTS
  // must be set in-app. preload is omitted — that is an apex-wide commitment
  // made once at the CDN, not per-subdomain. CSP is deferred (needs report-only
  // testing against the app's inline/analytics scripts first).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
