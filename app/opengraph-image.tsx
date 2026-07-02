import { SITE_DESCRIPTION } from "@/lib/site";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

// Site-wide Open Graph card. Inherited by every route that doesn't define its
// own opengraph-image (Next falls back up the segment tree).
export const alt = SITE_DESCRIPTION;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage();
}
