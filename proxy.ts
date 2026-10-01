import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";

// Content-Security-Policy, per request. Everything the browser loads is
// same-origin: fonts are self-hosted by next/font, icons are bundled offline
// (components/Icon.tsx), and /api/pet is same-origin. When adding anything
// third-party (analytics, an embed, remote images), add its origin to the
// matching directive or it will be silently blocked, and check that it sends
// Cross-Origin-Resource-Policy (COEP is require-corp, see next.config.ts).
//
// Inline scripts are allowed two ways:
// - Prerendered pages: by hash. scripts/csp-hashes.mjs hashes each page's
//   inline scripts after `next build` into .next/csp-hashes.json. Nonces can't
//   work here without making every page dynamic.
// - Anything rendered per request: by nonce. Next reads it from the request's
//   CSP header and stamps it on the scripts it emits.
//
// style-src-attr allows inline style="" (React style props, next/image).
// <style> elements stay blocked, which is the injection vector that matters.

const isDev = process.env.NODE_ENV !== "production";

function loadHashes(): Record<string, string[]> {
  if (isDev) return {};
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), ".next/csp-hashes.json"), "utf8"),
    );
  } catch (err) {
    // Static pages will lose their inline scripts. Loud, not fatal.
    console.error("csp: .next/csp-hashes.json missing, run the full build", err);
    return {};
  }
}

const hashes = loadHashes();

function scriptHashes(pathname: string): string[] {
  const route = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return [
    ...new Set([
      ...(hashes[route] ?? hashes["/_not-found"] ?? []),
      ...(hashes["/_global-error"] ?? []),
    ]),
  ];
}

function policy(nonce: string, pathname: string): string {
  // React's dev build and Turbopack HMR need eval and inline <style>.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : ["script-src 'self'", `'nonce-${nonce}'`, ...scriptHashes(pathname)].join(" ");
  const styleSrc = isDev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";

  return [
    "default-src 'none'",
    scriptSrc,
    styleSrc,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = policy(nonce, request.nextUrl.pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Documents only: skip API routes, build assets, and anything with a
      // file extension (images, PDFs, robots.txt, sitemap.xml).
      source: "/((?!api|_next/static|_next/image|.*\\.[a-z0-9]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
