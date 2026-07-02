"use client";

import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import TerminalTrigger from "./terminal/TerminalTrigger";

// One icon per header entry, floating in a glassmorphic rail on the right.
// Standard CSS only (fixed position + backdrop-blur). Hidden on narrow screens
// where a fixed side rail would overlap the content.
const items = [
  { href: "/showcase", label: "Showcase", icon: "mdi:star-outline" },
  { href: "/projects", label: "Projects", icon: "mdi:briefcase-outline" },
  { href: "/writing", label: "Writing", icon: "mdi:fountain-pen-tip" },
  { href: "/resume", label: "Resume", icon: "mdi:file-document-outline" },
  // Hidden.
  // { href: "/blog", label: "Blog", icon: "mdi:notebook-outline" },
  { href: "/about", label: "About", icon: "mdi:account-outline" },
];

export default function GlassDock() {
  return (
    <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 rounded-full border border-white/50 bg-white/40 px-2 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur-md lg:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-label={item.label}
          title={item.label}
          className="rounded-full p-1.5 text-zinc-500 transition hover:bg-white/60 hover:text-black"
        >
          <Icon icon={item.icon} className="h-5 w-5" aria-hidden />
        </Link>
      ))}
      <TerminalTrigger variant="dock" />
    </div>
  );
}
