"use client";

// Offline Iconify wrapper. The default `@iconify/react` <Icon> fetches SVG data
// from Iconify's CDN at runtime (a network round-trip per icon), which adds
// latency, can cause layout shift, and breaks offline. Here we register the
// handful of `mdi:*` icons the site actually uses from the tree-shakeable
// per-icon packages, so the same <Icon icon="mdi:..."/> call sites resolve from
// the bundle with zero network. Import Icon from this module instead of from
// "@iconify/react" everywhere.
//
// To add a new icon: import it from "@iconify-icons/mdi/<name>" and add it to
// the registry below, keyed by its "mdi:<name>" string.
import { Icon as IconifyIcon, addIcon } from "@iconify/react";
import accountOutline from "@iconify-icons/mdi/account-outline";
import arrowExpand from "@iconify-icons/mdi/arrow-expand";
import arrowTopRight from "@iconify-icons/mdi/arrow-top-right";
import briefcaseOutline from "@iconify-icons/mdi/briefcase-outline";
import close from "@iconify-icons/mdi/close";
import consoleLine from "@iconify-icons/mdi/console-line";
import fileDocumentOutline from "@iconify-icons/mdi/file-document-outline";
import fountainPenTip from "@iconify-icons/mdi/fountain-pen-tip";
import menu from "@iconify-icons/mdi/menu";
import minus from "@iconify-icons/mdi/minus";
import notebookOutline from "@iconify-icons/mdi/notebook-outline";
import refresh from "@iconify-icons/mdi/refresh";
import starOutline from "@iconify-icons/mdi/star-outline";
import trayArrowDown from "@iconify-icons/mdi/tray-arrow-down";
import weatherNight from "@iconify-icons/mdi/weather-night";
import weatherSunny from "@iconify-icons/mdi/weather-sunny";

const registry = {
  "mdi:account-outline": accountOutline,
  "mdi:arrow-expand": arrowExpand,
  "mdi:arrow-top-right": arrowTopRight,
  "mdi:briefcase-outline": briefcaseOutline,
  "mdi:close": close,
  "mdi:console-line": consoleLine,
  "mdi:file-document-outline": fileDocumentOutline,
  "mdi:fountain-pen-tip": fountainPenTip,
  "mdi:menu": menu,
  "mdi:minus": minus,
  "mdi:notebook-outline": notebookOutline,
  "mdi:refresh": refresh,
  "mdi:star-outline": starOutline,
  "mdi:tray-arrow-down": trayArrowDown,
  "mdi:weather-night": weatherNight,
  "mdi:weather-sunny": weatherSunny,
} as const;

// Register every icon at module load; runs before any <Icon> in a consuming
// module renders, since importing this file pulls the registry in first.
for (const [name, data] of Object.entries(registry)) {
  addIcon(name, data);
}

export const Icon = IconifyIcon;
export default Icon;
