import type { MetadataRoute } from "next";
import {
  SITE_TITLE,
  SHORT_NAME,
  SITE_DESCRIPTION,
  THEME_COLOR,
} from "@/lib/site";

// Web app manifest. Makes the site installable and gives Android/Chrome proper
// icons and theming. Icons live in /public with stable URLs (see public/icon*.svg)
// so they don't collide with the app/ favicon conventions.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
