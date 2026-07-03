"use client";

import Link from "next/link";
import TerminalTrigger from "./terminal/TerminalTrigger";
import BrandPrompt from "./BrandPrompt";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/showcase", label: "Showcase" },
  { href: "/projects", label: "Projects" },
  { href: "/writing", label: "Writing" },
  { href: "/resume", label: "Resume" },
  // Hidden.
  // { href: "/blog", label: "Blog" },
  // Hidden.
  // { href: "/about", label: "About" },
];

export default function Header() {
  return (
    <header>
      {/* Single row from sm up; on phones the brand takes its own line and the
          nav wraps below it. */}
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2">
        {/* Brand is denys.sh as a runnable script: clicking runs it bare (home);
            BrandPrompt types the current page in as the script's argument. */}
        <Link
          href="/"
          className="inline-flex items-center text-2xl font-semibold tracking-tight"
        >
          <BrandPrompt />
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-lg text-zinc-600 sm:justify-end sm:text-xl dark:text-zinc-400">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-black dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <TerminalTrigger variant="nav" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
