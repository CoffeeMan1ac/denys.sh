import type { Metadata } from "next";
import { WritingLayout } from "../components/work/layouts";
import { writing } from "@/lib/content/writing";

export const metadata: Metadata = {
  title: "Writing",
  description: "Reports and write-ups from coursework and side projects.",
  alternates: { canonical: "/writing" },
};

export default function WritingPage() {
  // Newest first by year, then alphabetical within a year (entries without a
  // year sink to the bottom).
  const items = [...writing].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title),
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Writing</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Reports and write-ups from coursework and side projects.
      </p>
      <div className="mt-10">
        <WritingLayout items={items} />
      </div>
    </div>
  );
}
