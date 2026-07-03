import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Colophon",
  description:
    "Credits and inspirations — the sites and people whose craft shaped this one.",
  alternates: { canonical: "/colophon" },
};

type Link = { name: string; href: string };

const linkClass =
  "text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-900";

// People and personal sites whose work inspired some of mine. Link is credit
const inspirations: Link[] = [
  { name: "Tyrrrz", href: "https://tyrrrz.me" },
  { name: "JSON", href: "https://jasoncameron.dev" },
  { name: "Shivi", href: "https://shivi.io" },
  { name: "Anna Filou", href: "https://annafilou.com" },
  { name: "Steve Schoger", href: "https://www.steveschoger.com" },
];

const builtWith: Link[] = [
  { name: "Next.js", href: "https://nextjs.org" },
  { name: "React", href: "https://react.dev" },
  { name: "TypeScript", href: "https://www.typescriptlang.org" },
  { name: "Tailwind CSS", href: "https://tailwindcss.com" },
  { name: "Iconify", href: "https://iconify.design" },
];

const inter: Link = { name: "Inter", href: "https://rsms.me/inter/" };

const previousSite: Link = { name: "v1.denys.sh", href: "https://v1.denys.sh" };

// SEO/infra bits that make the site fast, shareable, and legible to machines.
const openGraph: Link = { name: "Open Graph", href: "https://ogp.me" };
const schemaOrg: Link = { name: "schema.org", href: "https://schema.org" };
const llmsTxt: Link = { name: "llms.txt", href: "https://llmstxt.org" };
const lighthouse: Link = {
  name: "Lighthouse",
  href: "https://developer.chrome.com/docs/lighthouse/overview",
};

function ExternalLink({ name, href }: Link) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {name}
    </a>
  );
}

export default function ColophonPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Colophon</h1>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Built with
        </h2>
        <p className="mt-2 text-zinc-600">
          {builtWith.map((tool, i) => (
            <span key={tool.href}>
              {i > 0 && " · "}
              <ExternalLink {...tool} />
            </span>
          ))}
          . Type set in <ExternalLink {...inter} />.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Nitty-gritty, SEO, etc.
        </h2>
        <ul className="mt-4 space-y-3 text-zinc-600">
          <li>
            Per-route metadata and <ExternalLink {...openGraph} /> cards
          </li>
          <li>Canonical URLs</li>
          <li>
            <ExternalLink {...schemaOrg} /> structured data
          </li>
          <li>
            robots.txt, <ExternalLink {...llmsTxt} />, sitemap.xml
          </li>
          <li>Favicon and app icons</li>
          <li>Offline icons, self-hosted fonts</li>
          <li>Content Security Policy and security headers</li>
          <li>
            <ExternalLink {...lighthouse} />: 100 SEO
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Inspiration
        </h2>
        <p className="mt-2 text-zinc-600">
          Sites and people whose work I looked to while building this website —
          for their implementation, design, structure and close attention to
          detail.
        </p>
        <ul className="mt-4 space-y-3">
          {inspirations.map((item) => (
            <li key={item.href}>
              <ExternalLink {...item} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Other versions
        </h2>
        <p className="mt-2 text-zinc-600">
          <ExternalLink {...previousSite} /> — 2024-2025
        </p>
      </section>
    </div>
  );
}
