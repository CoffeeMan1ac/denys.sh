import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Crawl rules. Everything public is allowed; the API and the routes still hidden
// from the nav (/blog, /about; see Header.tsx) are disallowed so they don't get
// indexed before they're ready. Keep this disallow list in sync with the routes
// omitted from sitemap.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/blog", "/about"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
