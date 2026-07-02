import { writing } from "@/lib/content/writing";
import {
  SHORT_NAME,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  LOCATION,
  SAME_AS,
  absoluteUrl,
} from "@/lib/site";

// /llms.txt: a concise, link-rich site summary for LLMs and AI crawlers,
// following the https://llmstxt.org convention. Built from the same content the
// site renders so it never drifts. Served as plain text and cached.
export const dynamic = "force-static";

const pages: { title: string; path: string; note: string }[] = [
  { title: "Home", path: "/", note: SITE_TAGLINE },
  { title: "Showcase", path: "/showcase", note: "Selected, live work with the highlights up front." },
  { title: "Projects", path: "/projects", note: "Software, networking, and systems projects." },
  { title: "Writing", path: "/writing", note: "Reports and write-ups from coursework and side projects." },
  { title: "Resume", path: "/resume", note: "CV — also available as a PDF download." },
  { title: "Colophon", path: "/colophon", note: "Credits and inspirations behind the site." },
];

function buildLlmsTxt(): string {
  const lines: string[] = [];

  lines.push(`# ${SHORT_NAME}`);
  lines.push("");
  lines.push(`> ${SITE_DESCRIPTION}`);
  lines.push("");
  lines.push(`Based in ${LOCATION}.`);
  lines.push("");

  lines.push("## Pages");
  for (const p of pages) {
    lines.push(`- [${p.title}](${absoluteUrl(p.path)}): ${p.note}`);
  }
  lines.push("");

  if (writing.length > 0) {
    lines.push("## Writing");
    for (const w of writing) {
      const summary = w.description ? `: ${w.description}` : "";
      lines.push(`- ${w.title}${summary}`);
    }
    lines.push("");
  }

  lines.push("## Elsewhere");
  for (const url of SAME_AS) {
    lines.push(`- ${url}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
