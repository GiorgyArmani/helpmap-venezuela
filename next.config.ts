import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray lockfile in the user's home
  // dir made Next infer the wrong root; this removes the ambiguity.
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    // The dev/prod server otherwise preloads every page's JS modules into memory at
    // startup. With this app's very large client component that inflates the JS heap and
    // contributed to `next dev` OOMing after a while. Load entries lazily instead.
    // (Next docs → "How to optimize memory usage".)
    preloadEntriesOnStart: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Clickjacking: nothing here should ever be framed by another site.
          { key: "X-Frame-Options", value: "DENY" },
          // geolocation=(self) powers "Mi ubicación" (the blue GPS dot on the map); camera/
          // mic stay disabled since the app never uses them.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()" },
          // Force HTTPS on the production domain for 1 year (no-op over plain HTTP/dev).
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      // NOTE: /sw.js is now served by app/sw.js/route.ts, which sets its own
      // no-cache headers and injects a per-build CACHE_VERSION.
    ];
  },
};

export default nextConfig;
