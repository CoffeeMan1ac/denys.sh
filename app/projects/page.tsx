import type { Metadata } from "next";
import WorkShowcase from "../components/work/WorkShowcase";
import type { WorkItem } from "../components/work/layouts";

export const metadata: Metadata = {
  title: "Projects",
  description: "Software, networking, and systems projects I've built.",
  alternates: { canonical: "/projects" },
};

// My projects. stars and downloads are left off
const PROJECT_ITEMS: WorkItem[] = [
  {
    title: "Project Streamline",
    description: "Risk-decisioning engine for insurance underwriting",
    language: "Java",
    href: "https://github.com/CoffeeMan1ac/project-streamline",
  },
  {
    title: "SkyScraper",
    description: "Interactive explorer for U.S. flight data",
    language: "Java",
    href: "https://github.com/CoffeeMan1ac/SkyScraper",
  },
  {
    title: "blitzscript",
    description: "Launcher for the commands scattered across your repos",
    language: "Rust · TypeScript",
    href: "https://github.com/CoffeeMan1ac/blitzscript",
  },
];

export default function ProjectsPage() {
  return (
    <WorkShowcase title="Projects" items={PROJECT_ITEMS} design="projects" />
  );
}
