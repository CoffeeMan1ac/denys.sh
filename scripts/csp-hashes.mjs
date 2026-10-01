// Post-build: hash every inline <script> in the prerendered HTML so the CSP
// can allow exactly those scripts without 'unsafe-inline' and without nonces
// (nonces would force every page to render dynamically). proxy.ts reads the
// output and sends each route its own list.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const APP = ".next/server/app";
const OUT = ".next/csp-hashes.json";

// Data blocks (ld+json) never execute, so CSP ignores them.
const EXECUTABLE = new Set(["", "text/javascript", "module"]);

function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(
    /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g,
  )) {
    if (/\ssrc=/.test(attrs ?? "") || !body) continue;
    const type = /\stype="([^"]*)"/.exec(attrs ?? "")?.[1] ?? "";
    if (!EXECUTABLE.has(type)) continue;
    hashes.add(
      `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`,
    );
  }
  return [...hashes];
}

const manifest = JSON.parse(
  readFileSync(".next/prerender-manifest.json", "utf8"),
);
const routes = {};
const pages = [
  ...Object.keys(manifest.routes),
  "/_not-found",
  "/_global-error",
];
for (const route of pages) {
  const file = join(APP, route === "/" ? "index.html" : `${route}.html`);
  if (!existsSync(file)) continue;
  routes[route] = inlineScriptHashes(readFileSync(file, "utf8"));
}

if (!routes["/"]?.length) {
  throw new Error("csp-hashes: no inline scripts found for /, build layout changed?");
}
writeFileSync(OUT, JSON.stringify(routes));
console.log(`csp-hashes: ${Object.keys(routes).length} pages -> ${OUT}`);
