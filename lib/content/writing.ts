import type { WorkItem } from "@/app/components/work/layouts";

// Writing shown on /writing, rendered by WritingLayout.
//
// Every field the layout understands is listed here so new entries are easy to
// fill in; any omitted field is simply skipped:
//   title        required; the work's title (also the heading)
//   kind         gray badge, e.g. "Coursework report" / "Preprint" / "Essay"
//   status       amber badge, e.g. "Under review" / "Published" / "Best Paper"
//   authors      author list
//   venue        italic line, e.g. the module / journal / conference
//   year         shown on the left year rail (sort newest-first)
//   description  short abstract / summary
//   keywords     small topic tags shown under the abstract
//   links        resource chips, e.g. PDF / arXiv / Code / Slides / Cite
//   doi          rendered as a DOI chip (links to https://doi.org/<doi>)
//   href         makes the title itself a link (omit to keep the title plain and
//                let the link chips below carry the links, avoids a duplicate)
export const writing: WorkItem[] = [
  {
    title: "A Probability Study of the Dublin Bikes Network",
    kind: "Coursework report",
    year: 2025,
    description:
      "Modelled bike availability across Dublin's 116-station network with Python simulation, testing how it varies by time of day and between nearby stations.",
    keywords: ["Probability", "Simulation", "Python"],
    links: [{ label: "PDF", href: "/Applied_Probability_Report.pdf" }],
  },
];
