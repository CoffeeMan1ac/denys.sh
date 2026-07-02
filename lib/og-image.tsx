import { ImageResponse } from "next/og";
import {
  SHORT_NAME,
  FULL_NAME,
  SITE_TAGLINE,
  LOCATION,
  SITE_URL,
  ICON_BG,
  ICON_FG,
} from "@/lib/site";

// Shared Open Graph / Twitter card renderer. One 1200×630 branded card matching
// the site's white/zinc aesthetic, generated with next/og (default Geist font,
// no manual font loading). Each route's opengraph-image / twitter-image file
// calls this so every share card stays consistent. Pass a title and optional
// eyebrow/subtitle to vary per page.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// White terminal-prompt mark on the dark brand square, as a data URI (satori
// renders <img>/data URIs reliably).
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M10 10.5l5 5.5-5 5.5" fill="none" stroke="${ICON_FG}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="16.5" y="19.4" width="7.5" height="2.6" rx="1.3" fill="${ICON_FG}"/></svg>`;
const markDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(markSvg)}`;

type OgOptions = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
};

export function renderOgImage({
  eyebrow,
  title = SITE_TAGLINE,
  subtitle = `${LOCATION} · backend + frontend`,
}: OgOptions = {}) {
  const host = SITE_URL.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#ffffff",
          color: "#18181b",
          fontFamily: "Geist, sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              background: ICON_BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={markDataUri} width={56} height={56} alt="" />
          </div>
          <div
            style={{
              marginLeft: 28,
              fontSize: 40,
              fontWeight: 600,
              color: "#27272a",
            }}
          >
            {SHORT_NAME}
          </div>
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: 30,
                color: "#71717a",
                marginBottom: 18,
                textTransform: "uppercase",
                letterSpacing: 4,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 34, color: "#52525b", marginTop: 28 }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #e4e4e7",
            paddingTop: 28,
            fontSize: 28,
            color: "#a1a1aa",
          }}
        >
          <div style={{ display: "flex" }}>{host}</div>
          <div style={{ display: "flex" }}>{FULL_NAME}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
