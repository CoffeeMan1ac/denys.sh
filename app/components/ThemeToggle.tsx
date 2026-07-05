"use client";

import { useEffect } from "react";
import { Icon } from "@/app/components/Icon";

// Sun/moon switch in the header nav. Stateless on purpose: which icon shows is
// decided by CSS (dark:) off <html data-theme>, so the server markup never
// disagrees with the theme the inline head script applied before hydration.

// Colors cross-fade on a theme change: .theme-fade (globals.css) turns on
// transitions everywhere just for the swap, then comes off so hover effects
// and other animations run at their own pace again.
let fadeTimer = 0;
function applyTheme(next: "light" | "dark") {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  root.setAttribute("data-theme", next);
  window.clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), 220);
}

export function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
}

export default function ThemeToggle() {
  // The head script senses the system theme at load; this follows OS theme
  // flips while the page is open, until the user has made an explicit choice.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem("theme")) return;
      } catch {}
      applyTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="cursor-pointer self-center hover:text-black dark:hover:text-white"
    >
      {/* Moon in light mode, sun in dark; each names the mode a click gives. */}
      <Icon icon="mdi:weather-night" className="h-6 w-6 dark:hidden" aria-hidden />
      <Icon
        icon="mdi:weather-sunny"
        className="hidden h-6 w-6 dark:block"
        aria-hidden
      />
    </button>
  );
}
