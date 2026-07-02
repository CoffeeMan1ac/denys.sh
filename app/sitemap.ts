import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { absoluteUrl } from "@/lib/site";

// Last-modified time for a route, taken from its page file's mtime so the
// sitemap reflects real edits instead of a fixed build date. Falls back to now.
function lastModified(...segments: string[]): Date {
  try {
    return fs.statSync(path.join(process.cwd(), "app", ...segments)).mtime;
  } catch {
    return new Date();
  }
}

// Public, indexable routes only. /blog and /about are intentionally omitted:
// they're hidden from the nav and disallowed in robots.ts. Add them here (and
// remove the robots disallow) when they go live.
type Route = {
  path: string;
  file: string[];
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const routes: Route[] = [
  { path: "/", file: ["page.tsx"], changeFrequency: "monthly", priority: 1 },
  { path: "/showcase", file: ["showcase", "page.tsx"], changeFrequency: "monthly", priority: 0.9 },
  { path: "/projects", file: ["projects", "page.tsx"], changeFrequency: "monthly", priority: 0.9 },
  { path: "/writing", file: ["writing", "page.tsx"], changeFrequency: "monthly", priority: 0.8 },
  { path: "/resume", file: ["resume", "page.tsx"], changeFrequency: "monthly", priority: 0.8 },
  { path: "/colophon", file: ["colophon", "page.tsx"], changeFrequency: "yearly", priority: 0.3 },
  { path: "/terminal", file: ["terminal", "page.tsx"], changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: lastModified(...route.file),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
