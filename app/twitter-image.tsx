import { SITE_DESCRIPTION } from "@/lib/site";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

// Site-wide Twitter/X card. Same branded card as the Open Graph image.
export const alt = SITE_DESCRIPTION;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage();
}
