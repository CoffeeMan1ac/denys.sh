import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Denys — Computer Science & Economics student at Trinity College Dublin, developer and systems administrator based in Dublin.",
  // Hidden from the nav (see Header.tsx) and kept out of search.
  robots: { index: false, follow: false },
};

export default function AboutPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        I&rsquo;m Denys, a Computer Science &amp; Economics student at Trinity
        College Dublin, working as a developer and systems administrator.
      </p>
    </div>
  );
}
