"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The brand is denys.sh treated as a runnable shell script. On the home page
// the script name (denys.sh) types out after the prompt. On any other page
// denys.sh shows instantly and the page name types in as the script's argument.
const TYPE_MS = 85; // per-character reveal speed

// Home → "" (bare invocation). Otherwise the first path segment is the
// "subcommand", so /blog/some-post still reads as `blog`.
function argFor(pathname: string): string {
  return pathname.split("/")[1] ?? "";
}

// Only real top-level pages type in as the script's argument,
// so a 404 can't echo an unsuitable path.
const KNOWN_PAGES = new Set([
  "showcase",
  "projects",
  "writing",
  "resume",
  "colophon",
  "terminal",
  "blog",
  "about",
]);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function BrandPrompt() {
  const pathname = usePathname();
  // Unknown paths render bare, same as home.
  const bare = pathname === "/" || !KNOWN_PAGES.has(argFor(pathname));

  const [typed, setTyped] = useState("");
  // The caret holds steady while typing and blinks only once typing is done.
  const [done, setDone] = useState(false);

  // Reset the type-out when the page changes, done during render (React's
  // "adjust state on prop change" pattern) so the previous page's text doesn't
  // linger before the new one types in.
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setTyped("");
    setDone(false);
  }

  useEffect(() => {
    // Bare (home/unknown): type the script name itself. Known page: type its argument.
    const target = bare ? "denys.sh" : argFor(pathname);

    if (prefersReducedMotion() || !target) {
      // Skip the animation, land on the final state. Deferred to a timer so it
      // isn't a synchronous setState in the effect body (cascading render).
      const id = window.setTimeout(() => {
        setTyped(target);
        setDone(true);
      }, 0);
      return () => window.clearTimeout(id);
    }

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, TYPE_MS);

    return () => window.clearInterval(id);
  }, [pathname, bare]);

  return (
    <span className="inline-flex items-baseline">
      <span className="text-zinc-400">~&nbsp;$&nbsp;</span>
      {bare ? (
        // Home/unknown: denys.sh types itself out.
        <span>{typed}</span>
      ) : (
        // Known pages: denys.sh static, page name types in as the argument.
        <>
          denys.sh
          {typed && (
            <span className="text-zinc-500">{" " + typed}</span>
          )}
        </>
      )}
      <span
        aria-hidden
        className={
          "ml-1 inline-block h-[1.05em] w-[0.55em] translate-y-[0.12em] bg-zinc-400 dark:bg-zinc-500" +
          (done ? " brand-caret" : "") // solid while typing, blink when done
        }
      />
    </span>
  );
}
