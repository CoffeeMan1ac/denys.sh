"use client";

import "./globals.css";

// Replaces Next's default, which ships an inline <style> that the CSP
// (style-src 'self') would block. Renders without the root layout.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-5xl px-6 py-12 font-sans">
        <h1 className="text-3xl font-semibold tracking-tight">
          Something broke
        </h1>
        <button
          type="button"
          onClick={reset}
          className="mt-6 underline underline-offset-4"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
