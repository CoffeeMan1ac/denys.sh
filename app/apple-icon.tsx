import { ImageResponse } from "next/og";
import { ICON_BG, ICON_FG } from "@/lib/site";

// iOS home-screen icon. Generated as a 180×180 PNG so Apple devices (which don't
// use the SVG favicon) get a crisp icon. Same terminal-prompt mark as the SVG
// favicon, drawn here as a data-URI <img> (satori renders <img>/data URIs
// reliably, where inline <svg> support is partial). iOS applies its own mask, so
// the background is full-bleed with no rounded corners of our own.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M10 10.5l5 5.5-5 5.5" fill="none" stroke="${ICON_FG}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="16.5" y="19.4" width="7.5" height="2.6" rx="1.3" fill="${ICON_FG}"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ICON_BG,
        }}
      >
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(mark)}`}
          width={120}
          height={120}
          alt=""
        />
      </div>
    ),
    { ...size },
  );
}
