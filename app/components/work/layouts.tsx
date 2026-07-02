// Container designs for listing work, one per page:
//   Showcase → ShowcaseLayout, Projects → ProjectsLayout, Writing → WritingLayout.
// All presentational: they take the same `items` and only differ in layout.

import { Icon } from "@/app/components/Icon";
import Image from "next/image";

export type WorkItem = {
  title: string;
  client?: string;
  description: string;
  period?: string;
  role?: string;
  tags?: string[];
  language?: string;
  metric?: string;
  href?: string;
  // Cover screenshot (path under /public). When set, the Showcase card shows it
  // instead of the placeholder GhostCover.
  image?: string;
  // Cover video (path under /public). When set, the Showcase card plays it
  // (muted, looping), using `image` as the poster frame.
  video?: string;
  // Card stats (★ stars, ⬇ downloads, language dot, Featured/Archived).
  stars?: number;
  downloads?: number;
  archived?: boolean;
  // Highlights the card with a violet border.
  featured?: boolean;
  // Used by the Writing container.
  authors?: string[];
  venue?: string;
  year?: number;
  status?: string; // e.g. "Under review", "Published", "Best Paper"
  kind?: string; // e.g. "Conference paper", "Preprint", "Workshop"
  links?: { label: string; href: string }[];
  // Extra publication metadata, rendered when present.
  doi?: string; // e.g. "10.1000/xyz"; rendered as a DOI chip when present
  keywords?: string[]; // topic tags shown under the abstract
};

const fmt = (n: number) => n.toLocaleString("en-US");

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600">
      {children}
    </span>
  );
}

// Placeholder cover shown when a card has no image/video. The gradient zooms
// slightly on card hover, matching the real media's behavior.
function GhostCover({
  index,
  label,
  labelSize = "text-xs",
}: {
  index: number;
  label: string;
  labelSize?: string;
}) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200 transition-transform duration-500 ease-out group-hover:scale-105">
        <span className="absolute -right-2 -top-6 select-none text-[8rem] font-bold leading-none text-white/70">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <span
        className={`absolute bottom-0 left-0 m-4 ${labelSize} font-medium uppercase tracking-widest text-zinc-500`}
      >
        {label}
      </span>
    </div>
  );
}

// Showcase: two-column grid of feature tiles that lift on hover.
export function ShowcaseLayout({ items }: { items: WorkItem[] }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {items.map((item, i) => (
        <a
          key={item.title}
          href={item.href ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex flex-col transition-transform duration-200 hover:-translate-y-1 active:translate-y-0"
        >
          {/* Arrow: slides further out and darkens on hover. */}
          <span className="absolute right-3 top-3 z-10 text-zinc-500 transition-all duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-black">
            <Icon icon="mdi:arrow-top-right" className="h-5 w-5" aria-hidden />
          </span>
          {item.video ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-zinc-200">
              <video
                src={item.video}
                poster={item.image}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          ) : item.image ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-zinc-200">
              <Image
                src={item.image}
                alt={`${item.title} screenshot`}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          ) : (
            <GhostCover index={i} label={item.language ?? "Project"} labelSize="text-sm" />
          )}
          {item.period && (
            <p className="mt-4 text-xs font-medium uppercase tracking-widest text-zinc-400">
              {item.period}
            </p>
          )}
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 underline-offset-4 group-hover:underline">
            {item.title}
          </h3>
          {item.role && <p className="mt-1 text-sm text-zinc-500">{item.role}</p>}
          <p className="mt-2 flex-1 text-zinc-600">{item.description}</p>
          {item.tags && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 3).map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

// Projects: three-column grid of tinted cards with a stats footer.
function ProjectCardBody({ item }: { item: WorkItem }) {
  return (
    <>
      {(item.featured || item.archived) && (
        <div className="mb-1 flex items-center gap-2">
          {item.featured && (
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Featured
            </span>
          )}
          {item.archived && (
            <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Archived
            </span>
          )}
        </div>
      )}

      <h3 className="text-lg font-semibold text-zinc-900 underline-offset-4 group-hover:underline">
        {item.title}
      </h3>
      <p className="mt-1 flex-1 text-base text-zinc-600">{item.description}</p>

      {/* Stats footer, pinned to the bottom so cards align. Kept on one line
         (no wrap) so it never spills onto a second row. */}
      <div className="mt-4 flex flex-nowrap items-center gap-x-4 overflow-hidden text-base text-zinc-500">
        {item.stars != null && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap" title="Stars">
            <Icon icon="mdi:star-outline" className="h-4 w-4" aria-hidden />
            {fmt(item.stars)}
          </span>
        )}
        {item.language && (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" aria-hidden />
            {item.language}
          </span>
        )}
        {item.downloads != null && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap" title="Downloads">
            <Icon icon="mdi:tray-arrow-down" className="h-4 w-4" aria-hidden />
            {fmt(item.downloads)}
          </span>
        )}
      </div>
    </>
  );
}

export function ProjectsLayout({ items }: { items: WorkItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <a
          key={item.title}
          href={item.href ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-sm bg-zinc-50 p-5 transition hover:bg-zinc-100"
        >
          <ProjectCardBody item={item} />
        </a>
      ))}
    </div>
  );
}

// Writing: reverse-chronological list grouped by year.
export function WritingLayout({ items }: { items: WorkItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Nothing here yet — soon.</p>;
  }
  return (
    <ol className="space-y-9">
      {items.map((item) => (
        <li key={item.title} className="flex gap-4 sm:gap-5">
          {/* Year rail */}
          <div className="w-12 shrink-0 pt-0.5 text-right text-sm tabular-nums text-zinc-400 sm:w-14">
            {item.year && <span className="sr-only">Year: </span>}
            {item.year}
          </div>

          <div className="min-w-0 flex-1 border-l border-zinc-200 pl-4 sm:pl-5">
            {(item.kind || item.status) && (
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {item.kind && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {item.kind}
                  </span>
                )}
                {item.status && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                    {item.status}
                  </span>
                )}
              </div>
            )}

            <h3 className="font-semibold leading-snug text-zinc-900">
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </h3>

            {item.authors && (
              <p className="mt-1 text-sm text-zinc-600">
                {item.authors.join(", ")}
              </p>
            )}

            {item.venue && (
              <p className="mt-0.5 text-sm italic text-zinc-500">{item.venue}</p>
            )}

            <p className="mt-2 max-w-2xl text-sm text-zinc-600">{item.description}</p>

            {item.keywords && item.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.keywords.map((k) => (
                  <Tag key={k}>{k}</Tag>
                ))}
              </div>
            )}

            {((item.links && item.links.length > 0) || item.doi) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.links?.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-black"
                  >
                    {l.label}
                  </a>
                ))}
                {item.doi && (
                  <a
                    href={`https://doi.org/${item.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-black"
                  >
                    DOI
                  </a>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ARCHIVED: an alternative Showcase grid where the cover frame itself grows
// on hover (~5% scale, not an inner zoom), on tinted panels with truncated copy
// that expands on hover. Not in use; ShowcaseLayout is the chosen design. To
// revive: uncomment, then import and render it.
//
// export function ShowcaseCoverGrowLayout({ items }: { items: WorkItem[] }) {
//   return (
//     <div className="grid gap-8 sm:grid-cols-2">
//       {items.map((item, i) => (
//         <a
//           key={item.title}
//           href={item.href ?? "#"}
//           className="group relative flex flex-col rounded-md bg-zinc-50 p-5 transition hover:bg-zinc-100"
//         >
//           {/* Cover box grows on hover (scale the frame, not the inner media). */}
//           <div className="relative -mx-5 -mt-5 aspect-[16/10] overflow-hidden rounded-md shadow-sm transition duration-300 group-hover:scale-105 group-hover:shadow-md">
//             <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 to-zinc-200">
//               <span className="absolute -right-2 -top-6 select-none text-[8rem] font-bold leading-none text-white/70">
//                 {String(i + 1).padStart(2, "0")}
//               </span>
//             </div>
//             <span className="absolute right-3 top-3 text-zinc-500 transition-all duration-200 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-black">
//               <Icon icon="mdi:arrow-top-right" className="h-5 w-5" aria-hidden />
//             </span>
//             {/* language label on the image */}
//             {item.language && (
//               <span className="absolute bottom-0 left-0 m-4 text-sm font-medium uppercase tracking-widest text-zinc-500">
//                 {item.language}
//               </span>
//             )}
//           </div>
//
//           <h3 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-900 underline-offset-4 group-hover:underline">
//             {item.title}
//           </h3>
//           <p className="mt-0.5 max-h-6 overflow-hidden text-zinc-500 transition-[max-height] duration-300 delay-150 group-hover:max-h-24">
//             {item.description}
//           </p>
//         </a>
//       ))}
//     </div>
//   );
// }
