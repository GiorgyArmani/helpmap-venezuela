import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray lockfile in the user's home
  // dir made Next infer the wrong root; this removes the ambiguity.
  turbopack: {
    root: import.meta.dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // NOTE: /sw.js is now served by app/sw.js/route.ts, which sets its own
      // no-cache headers and injects a per-build CACHE_VERSION.
    ];
  },
};

export default nextConfig;
