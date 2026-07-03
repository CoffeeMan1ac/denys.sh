import type { Metadata } from "next";
import HeroImage from "./components/HeroImage";
import SectionNav from "./components/SectionNav";
import { EMAIL, profileLinks } from "@/lib/links";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  // Absolute title (no "· denys.sh" template suffix) for the front page.
  title: { absolute: "denys.sh — Developer & Systems Administrator in Dublin" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Visually-hidden page heading: gives the home page a real <h1> for
          search engines and screen readers without altering the visual hero. */}
      <h1 className="sr-only">
        Denys — developer and systems administrator in Dublin
      </h1>
      <section className="flex flex-col gap-8">
        {/* Hero: name + description on the left, image to the right. Narrower
            than the buttons row, and tall enough that the buttons sit well
            below the description. */}
        <div className="mx-auto mt-8 flex w-full max-w-4xl flex-col items-start gap-8 md:mt-24 md:flex-row md:justify-between">
          <div>
            <p className="text-xl text-zinc-600 sm:text-2xl dark:text-zinc-400">
              Hi, I&apos;m Denys. I build things people use, working across
              backend and front end. I think in patterns and pictures, so
              you&apos;ll catch me sketching a problem on paper until the thing
              clicks. Based in Dublin{" "}
              {/* Rounded corners + border drawn inside the SVG (clipPath + a
                  clipped stroke), not via CSS. CSS border-radius on an <svg>
                  leaves the bottom corners square in Chromium; baking the
                  rounding into the vector rounds all four corners identically. */}
              <svg
                viewBox="0 0 24 16"
                role="img"
                aria-label="Ireland"
                className="ml-0.5 inline-block"
                style={{ width: "1.2em", height: "0.8em", verticalAlign: "-0.021em" }}
              >
                <clipPath id="ie-flag">
                  <rect width="24" height="16" rx="1.5" />
                </clipPath>
                <g clipPath="url(#ie-flag)">
                  <rect width="8" height="16" fill="#169b62" />
                  <rect x="8" width="8" height="16" fill="#ffffff" />
                  <rect x="16" width="8" height="16" fill="#ff883e" />
                  <rect
                    width="24"
                    height="16"
                    rx="1.5"
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="2"
                  />
                </g>
              </svg>
              .
            </p>
            <p className="mt-4 text-xl text-zinc-600 sm:text-2xl dark:text-zinc-400">
              Happy to chat or take on work; you can reach me via{" "}
              <a
                href={`mailto:${EMAIL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-black dark:hover:text-white"
              >
                Email
              </a>
              , or find me on{" "}
              {profileLinks.map((link, i) => (
                <span key={link.href}>
                  {i > 0 && (i === profileLinks.length - 1 ? ", or " : ", ")}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-black dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
              . Prefer a call? Book one on{" "}
              <a
                href="https://cal.eu/denys/call"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-black dark:hover:text-white"
              >
                Cal
              </a>
              .
            </p>
          </div>
          <HeroImage />
        </div>
        <SectionNav />
      </section>

      {/* Hidden. */}
      {/*
      <section className="flex flex-col items-center gap-4 py-24 text-center">
        <h2 className="text-5xl font-semibold tracking-tight">
          Let&apos;s do{" "}
          <span className="italic underline underline-offset-4">together</span>
        </h2>
        <div className="text-lg text-zinc-600">
          <p>
            Schedule a meeting on{" "}
            <a
              href="https://cal.eu/denys/call"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-black dark:hover:text-white"
            >
              Cal
            </a>
          </p>
          <p>
            or reach me at{" "}
            <a
              href="mailto:me@denys.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-black dark:hover:text-white"
            >
              me@denys.sh
            </a>
          </p>
        </div>
      </section>
      */}
    </div>
  );
}
