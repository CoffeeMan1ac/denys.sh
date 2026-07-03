import Link from "next/link";

const sections = [
  { href: "/showcase", label: "Showcase", blurb: "Featured, live work" },
  { href: "/projects", label: "Projects", blurb: "Things I've built" },
  { href: "/writing", label: "Writing", blurb: "Reports & write-ups" },
];

export default function SectionNav() {
  return (
    <nav className="grid gap-3 sm:grid-cols-3">
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="group flex min-h-40 flex-col items-start rounded border border-zinc-200 p-6 shadow-sm transition hover:shadow-md active:translate-y-px active:bg-zinc-50 active:shadow-none dark:border-zinc-800 dark:hover:border-zinc-600 dark:active:bg-zinc-900"
        >
          <span className="text-4xl font-medium text-zinc-700 underline-offset-4 group-hover:text-black group-hover:underline dark:text-zinc-300 dark:group-hover:text-white">
            {section.label}
          </span>
          <span className="mt-1 text-xl text-zinc-500">{section.blurb}</span>
        </Link>
      ))}
    </nav>
  );
}

/* FOLDER EXPERIMENT (parked, not deleted)
   Cards styled as folders that open on hover: the whole folder rotates on a
   shared preserve-3d wrapper, and the front flap is hinged along its bottom edge.
   The whole folder is one clickable link (not just the flap). Z-spacing and the
   `crisp` hack avoid z-fighting and staircased edges. To use it, swap the
   SectionNav return above for `return <FolderNav />;`.

const crisp = "[backface-visibility:hidden] [outline:1px_solid_transparent]";

function FolderNav() {
  return (
    <nav className="mt-3 grid gap-3 sm:grid-cols-3">
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="group relative block [perspective:900px]"
        >
          <div className="relative [transform-style:preserve-3d] [transform:rotateY(14deg)]">
            <span
              aria-hidden
              className={`absolute right-6 top-[-0.85rem] h-3.5 w-20 rounded-t-md border border-b-0 border-zinc-300 bg-zinc-100 [transform:translateZ(-11px)] ${crisp}`}
            />
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-0 top-[-0.4rem] rounded-md border border-zinc-300 bg-zinc-100 [transform:translateZ(-12px)] ${crisp}`}
            />
            <span
              aria-hidden
              className={`absolute inset-x-5 bottom-1 top-[-0.28rem] rounded-t-sm border border-zinc-200 bg-zinc-100 [transform:translateZ(-8px)] ${crisp}`}
            />
            <span
              aria-hidden
              className={`absolute inset-x-3 bottom-1 top-[-0.14rem] rounded-t-sm border border-zinc-200 bg-zinc-50 [transform:translateZ(-4px)] ${crisp}`}
            />
            <div
              className={`relative flex min-h-40 origin-bottom flex-col items-start rounded-md border border-zinc-200 bg-white p-6 shadow-sm transition-transform duration-300 ease-out will-change-transform group-hover:[transform:rotateX(-26deg)] ${crisp}`}
            >
              <span className="text-4xl font-medium text-zinc-700 underline-offset-4 group-hover:text-black group-hover:underline">
                {section.label}
              </span>
              <span className="mt-1 text-xl text-zinc-500">{section.blurb}</span>
            </div>
          </div>
        </Link>
      ))}
    </nav>
  );
}
*/
