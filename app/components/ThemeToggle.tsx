"use client";

import { Icon } from "@/app/components/Icon";

// Sun/moon switch in the header nav. Stateless on purpose: which icon shows is
// decided by CSS (dark:) off <html data-theme>, so the server markup never
// disagrees with the theme the inline head script applied before hydration.
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
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
