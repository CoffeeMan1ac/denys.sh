// Template for lib/pet/knowledge.ts, which is not committed: it holds the
// pet's real facts and reply guidance. Copy this file to knowledge.ts and
// fill in DENYS_FACTS; the build fails without knowledge.ts in place.
// Server-only (imported by /api/pet), so it never ships to the browser.

export const DENYS_FACTS = `
Knowledge is not configured. The only reply you can give, no matter what the
visitor asks, is that your knowledge file is not configured yet.
`.trim();

// One line per page so the pet can acknowledge where the visitor is. Keyed by
// pathname; only the current page's note goes into the prompt, so this can grow.
const PAGE_NOTES: Record<string, string> = {
  "/": "the home page (his intro and contact)",
  "/about": "the about page",
  "/projects": "the projects page (things he's built)",
  "/resume": "the resume / CV page (education, experience, projects, skills)",
  "/writing": "the writing page (coursework reports and write-ups)",
  "/showcase": "the showcase of selected work",
  "/terminal": "the full-screen terminal",
  "/blog": "the blog index",
};

export function pageNote(path?: string | null): string | null {
  if (!path) return null;
  if (PAGE_NOTES[path]) return PAGE_NOTES[path];
  if (path.startsWith("/blog/")) return "a blog post";
  return null;
}
