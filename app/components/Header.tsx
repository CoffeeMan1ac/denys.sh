"use client";

import Link from "next/link";
import TerminalTrigger from "./terminal/TerminalTrigger";
import BrandPrompt from "./BrandPrompt";

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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2">
        {/* Brand is denys.sh as a runnable script: clicking runs it bare (home);
            BrandPrompt types the current page in as the script's argument. */}
        <Link
          href="/"
          className="inline-flex items-center text-2xl font-semibold tracking-tight"
        >
          <BrandPrompt />
        </Link>
        <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xl text-zinc-600">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-black">
              {link.label}
            </Link>
          ))}
          <TerminalTrigger variant="nav" />
        </nav>
      </div>
    </header>
  );
}
