import type { Metadata } from "next";
import WorkShowcase from "../components/work/WorkShowcase";
import type { WorkItem } from "../components/work/layouts";

export const metadata: Metadata = {
  title: "Showcase",
  description: "Selected work and featured projects, with the highlights up front.",
  alternates: { canonical: "/showcase" },
};

// Featured, live work. Cover screenshots live in public/showcase/.
const SHOWCASE_ITEMS: WorkItem[] = [
  {
    title: "Travel Guide UA",
    description:
      "WordPress platform for a 20-year tour operator — 99.9% uptime, custom JS/PHP, DNS & SSL, automated backups.",
    language: "WordPress",
    href: "https://travelguideua.com/",
    image: "/showcase/travel-guide-ua.jpg",
    // video: "/showcase/travel-guide-ua.webm", // static for now
  },
  {
    title: "Project Streamline",
    description:
      "Cloud-native risk-decisioning microservice for insurance underwriting — a rules engine driving accept/decline/refer.",
    language: "Java",
    href: "https://project-streamline.pages.dev/",
    image: "/showcase/project-streamline.jpg",
    // video: "/showcase/project-streamline.webm", // static for now
  },
];

export default function ShowcasePage() {
  return <WorkShowcase title="Showcase" items={SHOWCASE_ITEMS} design="showcase" />;
}
