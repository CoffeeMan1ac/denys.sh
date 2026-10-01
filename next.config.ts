import type { NextConfig } from "next";

// Security headers applied to every response. The CSP is per request, in
// proxy.ts. nginx must not add its own copies: duplicated X-Content-Type-Options
// is invalid and conflicting Referrer-Policy values are ambiguous.
//
// COEP require-corp: every subresource is same-origin today. A third-party
// image, font, or script will be blocked unless it sends CORP or CORS headers.
// CORP same-site still lets *.denys.sh embed these assets.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
];

const nextConfig: NextConfig = {
  // Lets phones on the LAN load dev assets (Next blocks cross-origin dev
  // requests by default). Dev-only; ignored in production builds.
  allowedDevOrigins: ["192.168.0.183"],
  // Don't advertise the framework.
  poweredByHeader: false,
  // gzip/brotli compression for responses.
  compress: true,
  // Trims the barrel import so only the icon code actually used is bundled.
  experimental: {
    optimizePackageImports: ["@iconify/react"],
    // integrity= on every <script src>, so a tampered chunk won't run.
    sri: { algorithm: "sha256" },
  },
  images: {
    // Prefer modern formats where the browser supports them.
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // Security headers on everything.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Showcase screenshots/clips are content-addressed by name and rarely
        // change — cache them hard at the CDN and browser.
        source: "/showcase/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // PDFs (resume, reports) — same treatment.
        source: "/:path*.pdf",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
