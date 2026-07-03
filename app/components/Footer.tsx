import Link from "next/link";
import LocalTime from "./LocalTime";
import { EMAIL, profileLinks } from "@/lib/links";

// Right-side links, in the same order they appear in the home-page intro:
// Email, then the social profiles, then Cal.
const footerLinks = [
  { label: "Email", href: `mailto:${EMAIL}` },
  ...profileLinks,
  { label: "Cal", href: "https://cal.eu/denys/call" },
];

// Per-link hover/active color.
const linkColor: Record<string, string> = {
  // GitHub's grays disappear on the dark background, so it lightens instead.
  GitHub:
    "hover:text-[#57606a] active:text-[#181717] dark:hover:text-[#adbac7] dark:active:text-[#cdd9e5]",
  LinkedIn: "hover:text-[#5b9bd5] active:text-[#0a66c2]",
  Bluesky: "hover:text-[#4f9bff] active:text-[#1185fe]",
  Email: "hover:text-[#f2796b] active:text-[#ea4335]",
  Cal: "hover:text-zinc-700 active:text-zinc-900 dark:hover:text-zinc-300 dark:active:text-zinc-100",
};

export default function Footer() {
  return (
    <footer id="site-footer" className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          denys.sh · <LocalTime /> · last updated June 2026 ·{" "}
          <Link
            href="/colophon"
            className="transition-colors hover:text-zinc-700 active:text-zinc-900 dark:hover:text-zinc-300 dark:active:text-zinc-100"
          >
            Colophon
          </Link>
        </span>
        <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {footerLinks.map((link) => {
            const internal = link.href.startsWith("/");
            const external = link.href.startsWith("http");
            const className = `group transition-colors ${linkColor[link.label]}`;
            const inner = (
              <>
                <span className="text-zinc-400 transition-colors group-hover:text-current group-active:text-current">
                  [
                </span>
                {link.label}
                <span className="text-zinc-400 transition-colors group-hover:text-current group-active:text-current">
                  ]
                </span>
              </>
            );
            // Internal routes use next/link (client nav, no reload); external
            // and mailto links stay plain anchors.
            return internal ? (
              <Link key={link.href} href={link.href} className={className}>
                {inner}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                {...(external || link.href.startsWith("mailto:")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={className}
              >
                {inner}
              </a>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
