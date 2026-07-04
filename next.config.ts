import type { NextConfig } from "next";

// Content-Security-Policy. Everything the browser loads is same-origin: the
// fonts are self-hosted by next/font, the icons are bundled offline (see
// components/Icon.tsx), and the /api/pet call is same-origin — so `'self'`
// covers all of script/style/img/font/connect/media.
//
// `'unsafe-inline'` is kept for script/style because the site is statically
// generated: Next injects inline bootstrap/flight scripts and inline style
// attributes, and the only nonce-free alternative (per-request nonces via
// middleware) would force every page to render dynamically, throwing away the
// static optimization. For a static site with no third-party scripts and no
// untrusted user input rendered to HTML, that trade isn't worth it — the policy
// below still blocks external/injected scripts, framing, and base-tag hijacks.
//
// When adding anything third-party (analytics, a Cal.com embed, remote images),
// add its origin to the matching directive here or it will be silently blocked.
// React's dev build uses eval() for debugging features (callstack
// reconstruction, etc.); Turbopack dev likewise. Production React never uses
// eval, so 'unsafe-eval' is added in development only — the deployed policy
// stays strict.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Security headers applied to every response.
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
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
