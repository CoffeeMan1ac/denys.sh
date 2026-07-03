import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
// Hidden.
// import GlassDock from "./components/GlassDock";
import { TerminalProvider } from "./components/terminal/TerminalProvider";
import TerminalPopup from "./components/terminal/TerminalPopup";
import CornerPet from "./components/pet/CornerPet";
import StructuredData from "./components/StructuredData";
import {
  SITE_URL,
  SITE_TITLE,
  SHORT_NAME,
  SITE_DESCRIPTION,
  FULL_NAME,
  KEYWORDS,
  THEME_COLOR,
  THEME_COLOR_DARK,
} from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves every relative URL below (OG images, canonicals) to absolute;
  // without it social/canonical tags point at localhost in production.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SHORT_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SHORT_NAME,
  keywords: KEYWORDS,
  authors: [{ name: FULL_NAME, url: SITE_URL }],
  creator: FULL_NAME,
  publisher: FULL_NAME,
  category: "technology",
  alternates: { canonical: "/" },
  // app/favicon.ico and app/apple-icon.tsx are auto-detected; we add the
  // scalable SVG (from /public) so modern browsers get a crisp tab icon.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SHORT_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_IE",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  // Follows the system preference; the toggle's choice can't reach a meta tag.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      data-theme="light"
      // The head script below may flip data-theme before hydration; keep the
      // DOM's value (see the "Preventing Flash" guide in the Next.js docs).
      suppressHydrationWarning
    >
      <head>
        {/* Runs during HTML parsing, before first paint: saved choice first,
            otherwise the system preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans text-zinc-900 dark:text-zinc-100">
        <StructuredData />
        <TerminalProvider>
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
            {children}
          </main>
          <Footer />
          {/* <GlassDock /> */}
          <TerminalPopup />
          <CornerPet />
        </TerminalProvider>
      </body>
    </html>
  );
}
