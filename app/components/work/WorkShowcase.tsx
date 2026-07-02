"use client";

import { ShowcaseLayout, ProjectsLayout, type WorkItem } from "./layouts";

// Placeholder content for Projects until its real entries are wired in.
const placeholderItems: WorkItem[] = [
  {
    title: "Project One",
    client: "Acme Corp",
    description:
      "A one-line description of what this project is and why it mattered, kept short enough to scan.",
    period: "2025",
    role: "Sole developer",
    tags: ["TypeScript", "Postgres", "Docker"],
    language: "TypeScript",
    metric: "99.9% uptime in production",
    stars: 15446,
    downloads: 22032996,
    featured: true,
    href: "#",
  },
  {
    title: "Project Two",
    client: "Personal",
    description:
      "Another placeholder entry showing how a longer description wraps and how the metadata lines up across items.",
    period: "2024",
    role: "Solo project",
    tags: ["Java", "JavaFX", "Maven"],
    language: "Java",
    metric: "600k+ records rendered interactively",
    stars: 3821,
    downloads: 5102338,
    featured: true,
    href: "#",
  },
  {
    title: "Project Three",
    client: "Open source",
    description:
      "A third sample so grids and lists have enough rows to feel real while comparing the designs.",
    period: "2024",
    role: "Maintainer",
    tags: ["Python", "FastAPI"],
    language: "Python",
    metric: "Adopted by 3 downstream teams",
    stars: 942,
    downloads: 188204,
    href: "#",
  },
  {
    title: "Project Four",
    description:
      "A fourth entry with no client and no link, to check how the containers handle missing fields.",
    period: "2023",
    role: "Coursework",
    tags: ["Networking", "Cisco"],
    language: "Networking",
    metric: "Built to Network+ methodology",
    stars: 211,
    downloads: 40233,
    archived: true,
  },
];

const designs = {
  showcase: ShowcaseLayout,
  projects: ProjectsLayout,
} as const;

export default function WorkShowcase({
  title = "Projects",
  items = placeholderItems,
  design,
}: {
  title?: string;
  items?: WorkItem[];
  design: keyof typeof designs;
}) {
  const Active = designs[design];

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8">
        <Active items={items} />
      </div>
    </div>
  );
}
