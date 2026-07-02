// Single source of truth for site-wide identity and SEO metadata. Imported by
// the root layout, sitemap, robots, manifest, OG images, structured data, and
// the llms.txt route so none of them drift apart.

export const SITE_URL = "https://denys.sh";

// Display name used in structured data and OG images. The brand shown in the UI
// stays "denys.sh" (see BrandPrompt); this is the human name for search/social.
export const FULL_NAME = "Denys";
export const SHORT_NAME = "denys.sh";

export const SITE_TITLE = "denys.sh";
export const SITE_DESCRIPTION =
  "Denys — developer and systems administrator in Dublin. I build things people use, across backend and front end. Projects, showcase, writing, and resume.";

export const SITE_TAGLINE = "I build things people use.";
export const LOCATION = "Dublin, Ireland";

// Social / professional profiles, used for JSON-LD `sameAs` and contact.
export const SAME_AS = [
  "https://github.com/CoffeeMan1ac",
  "https://www.linkedin.com/in/denys05/",
  "https://bsky.app/profile/medenys.bsky.social",
  "https://www.credly.com/users/denys",
];

export const KEYWORDS = [
  "Denys",
  "denys.sh",
  "software developer",
  "systems administrator",
  "backend developer",
  "frontend developer",
  "Dublin",
  "Trinity College Dublin",
  "Next.js",
  "TypeScript",
];

// Brand colors, shared by the manifest and the theme-color meta tag.
export const THEME_COLOR = "#ffffff";
export const ICON_BG = "#18181b";
export const ICON_FG = "#fafafa";

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
