// Single source of truth for contact / profile links, shared by the footer
// and the resume page so the two never drift apart.

export const EMAIL = "me@denys.sh";

export type ProfileLink = { label: string; href: string };

// Social profiles shown site-wide (footer).
export const profileLinks: ProfileLink[] = [
  { label: "GitHub", href: "https://github.com/CoffeeMan1ac" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/denys05/" },
  { label: "Bluesky", href: "https://bsky.app/profile/medenys.bsky.social" },
];

// The resume header adds email up front and Credly at the end. Bluesky is
// omitted here so the HTML resume matches the PDF (GitHub · LinkedIn · Credly).
export const contactLinks: ProfileLink[] = [
  { label: EMAIL, href: `mailto:${EMAIL}` },
  ...profileLinks.filter((l) => l.label !== "Bluesky"),
  { label: "Credly", href: "https://www.credly.com/users/denys" },
];
