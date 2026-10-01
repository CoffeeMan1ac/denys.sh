import type { Metadata } from "next";
import Link from "next/link";

// Replaces Next's default 404, which ships an inline <style> that the CSP
// (style-src 'self') would block.
export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Nothing lives at this address.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline underline-offset-4">
          Back home
        </Link>
      </p>
    </div>
  );
}
