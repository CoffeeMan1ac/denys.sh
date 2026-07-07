"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import TerminalTrigger from "./terminal/TerminalTrigger";
import BrandPrompt from "./BrandPrompt";
import ThemeToggle, { toggleTheme } from "./ThemeToggle";
import * as pet from "@/lib/pet/core";
import { usePetDocked } from "@/lib/pet/dock";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [petName, setPetName] = useState("");
  const petDocked = usePetDocked();

  // Read the pet's stored name as the drawer opens, to label the Pet entry.
  function openMenu() {
    const s = pet.loadPet();
    setPetName(typeof s?.name === "string" ? s.name : "");
    setMenuOpen(true);
  }

  function openPet() {
    const w = window.innerWidth;
    // 640-950: keep this drawer open behind the pet. Its scrim is the single
    // darkening the pet slides in over, so nothing stacks. Elsewhere (the nav's
    // Pet entry above 950, or the mobile bottom sheet) the pet brings its own
    // scrim, so the drawer can leave now.
    const underMenu = w >= 640 && w < 950;
    window.dispatchEvent(new CustomEvent("pet:open", { detail: { underMenu } }));
    if (!underMenu) setMenuOpen(false);
  }

  // The pet closes the drawer behind it (640-950 handoff) as it slides out.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("pet:close-menu", close);
    return () => window.removeEventListener("pet:close-menu", close);
  }, []);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

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
        <nav className="hidden flex-wrap justify-end gap-x-4 gap-y-1 text-xl text-zinc-600 nav:flex dark:text-zinc-400">
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
          {/* Below the dock cap the corner pet has no gutter, so it rides here,
              to the right of Terminal. Opens the same right-side panel. */}
          {petDocked && (
            <button
              type="button"
              onClick={openPet}
              className="flex items-center gap-1.5 hover:text-black dark:hover:text-white"
            >
              Pet
              <Icon icon="mdi:paw" className="h-5 w-5 -rotate-[30deg]" aria-hidden />
            </button>
          )}
          <ThemeToggle />
        </nav>
        <button
          type="button"
          onClick={openMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="-mr-2 shrink-0 p-2 text-zinc-600 nav:hidden dark:text-zinc-400"
        >
          <Icon icon="mdi:menu" className="h-7 w-7" aria-hidden />
        </button>
      </div>

      {/* Drawer, always mounted so it can slide; inert while closed so its
          links can't be tabbed to. */}
      <div
        className={`fixed inset-0 z-50 nav:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        inert={!menuOpen}
      >
        <div
          className={`absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-zinc-950/50 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
        />
        {/* Glass only on phones. In the 640-950 band it's a solid panel matching
            the pet side panel: opening the pet leaves this drawer up behind it
            (its scrim is the shared darkening) and the pet slides in on top. */}
        <div
          className={`absolute inset-y-0 right-0 flex w-60 flex-col border-l border-white/40 bg-white/70 shadow-2xl transition-transform duration-200 ease-out max-sm:backdrop-blur-2xl sm:w-80 sm:border-zinc-200 sm:bg-white dark:border-white/10 dark:bg-zinc-950/70 sm:dark:border-zinc-800 sm:dark:bg-zinc-950 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Same position/size as the pet panel's close, so the X stays put
              across the drawer to pet handoff. */}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="absolute right-2 top-2 z-10 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <Icon icon="mdi:close" className="h-6 w-6" aria-hidden />
          </button>
          {/* Any click in here (a link, the terminal) also closes the drawer. */}
          <nav
            onClick={() => setMenuOpen(false)}
            className="flex flex-col items-start gap-1 px-6 pt-14 text-xl text-zinc-600 dark:text-zinc-400"
          >
            <Link href="/" className="py-2 hover:text-black dark:hover:text-white">
              Home
            </Link>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-2 hover:text-black dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              // Don't let the nav's close-on-click fire here: openPet keeps the
              // drawer up until the pet panel has slid in over it.
              onClick={(e) => {
                e.stopPropagation();
                openPet();
              }}
              className="flex items-center gap-1.5 py-2 hover:text-black dark:hover:text-white"
            >
              Pet
              <Icon icon="mdi:paw" className="h-5 w-5 -rotate-[30deg]" aria-hidden />
              {!petName && <span className="text-zinc-400">(name it!)</span>}
            </button>
            {/* Hidden.
            <span className="py-2">
              <TerminalTrigger variant="nav" />
            </span> */}
          </nav>
          {/* Whole row toggles the theme: a finger-friendly tap target. Outside
              the closing nav so flipping the theme keeps the drawer open. */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="mt-auto flex items-center justify-between border-t border-zinc-200 px-6 py-4 text-zinc-600 hover:text-black dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white"
          >
            <span className="text-xl">Theme</span>
            <Icon icon="mdi:weather-night" className="h-6 w-6 dark:hidden" aria-hidden />
            <Icon icon="mdi:weather-sunny" className="hidden h-6 w-6 dark:block" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
