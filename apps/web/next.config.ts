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
};

export default nextConfig;
