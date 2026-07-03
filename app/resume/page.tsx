import type { Metadata } from "next";
import { Icon } from "@/app/components/Icon";
import { contactLinks } from "@/lib/links";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Denys — Computer Science & Economics at Trinity College Dublin. Developer and systems administrator.",
  alternates: { canonical: "/resume" },
};

// The downloadable PDF in /public is the sanitized export of the CV (no phone
// number); the HTML below mirrors it so both stay in sync.
const RESUME_PDF = "/Denys-Resume.pdf";

const contacts = contactLinks;

type Entry = {
  title: string;
  href?: string;
  meta?: string;
  subtitle?: string;
  date?: string;
  bullets?: string[];
};

const education: Entry[] = [
  {
    title: "Trinity College Dublin",
    subtitle: "Joint Honours in Computer Science and Economics",
    date: "Expected: May 2028",
    meta: "First Class Honours (to date)",
    bullets: [
      "Relevant coursework: Data Structures & Algorithms, Programming (Java, C++), Probability & Statistics.",
    ],
  },
];

const certifications: Entry[] = [
  {
    title: "CompTIA Network+ Certified",
    date: "October 2025",
    bullets: ["Score: 86% (Pass: 77.5%)"],
  },
  {
    title: "Google IT Support Professional Certificate",
    date: "May 2025",
    bullets: ["Score: 100% (Pass: 80%)"],
  },
];

const experience: Entry[] = [
  {
    title: "Travel Guide UA",
    href: "https://travelguideua.com/",
    subtitle: "Systems Administrator & Developer",
    meta: "Remote",
    date: "January 2025 – Present",
    bullets: [
      "Tour operator with 20+ years of experience and 20,000+ facilitated tours and excursions worldwide.",
      "Designed, deployed, and maintained a WordPress-based platform achieving 99.9% uptime.",
      "Created custom JavaScript/PHP features, managed DNS and SSL configurations, and automated backups.",
    ],
  },
  {
    title: "Multiple Hospitality Positions in Ireland and Ukraine",
    subtitle: "Waiter, Bar Back",
    date: "2023 – 2026",
  },
];

const projects: Entry[] = [
  {
    title:
      "Cloud-Native Risk Decisioning Microservice – Munich Re Automation Solutions (Team of 8) · SwEng",
    href: "https://github.com/CoffeeMan1ac/project-streamline",
    bullets: [
      "Built a risk-decisioning microservice for insurance underwriting automation, with extensibility for ML-assisted decisioning pipelines.",
      "Sole developer of the core Rule Decision Engine and the decision flow — Java (Spring Boot); PostgreSQL (JSONB); GitLab CI/CD; Docker.",
      "Implemented evaluation of priority-ordered business rules, AND/OR logic, configurable operators, and stackable premium adjustments.",
      "Automated Accept/Decline/Refer outcomes with traceability, audit data, and decision logic.",
      "Extensively debugged and achieved high test coverage across the full decision engine, within Agile practices.",
    ],
  },
  {
    title: "SkyScraper",
    href: "https://github.com/CoffeeMan1ac/SkyScraper",
    bullets: [
      "Built a JavaFX desktop app visualizing the U.S. Bureau of Transportation CSV dataset (600k+ flights/month) on an interactive Albers USA composite-projection map — Java 24 (JavaFX, OpenCSV); Maven; GitHub Actions.",
      "Set up a cross-platform release pipeline producing Linux, macOS, and Windows artifacts via a GitHub Actions matrix + jpackage.",
    ],
  },
  {
    title: "Enterprise Network",
    bullets: [
      "Designed and implemented an enterprise network topology with Cisco routing/switching in GNS3 and VMware.",
      "Configured VLANs, routing, and Access Control Lists (ACLs) on Cisco devices.",
      "Deployed pfSense firewall, Windows Server 2022 (AD/DNS/DHCP), and Ubuntu 24.04 LTS Server.",
      "Troubleshot network issues using CLI tools (ping/traceroute) and Network+ troubleshooting methodology.",
    ],
  },
  {
    title: "Denys.sh",
    href: "https://denys.sh/",
    bullets: [
      "Built a personal website on a Linux VPS using Nginx and Express.js, with SSL/TLS and the PM2 process manager.",
      "Configured security headers, HTTPS enforcement, and access controls for secure deployment.",
      "Built JavaScript features and set up cron jobs running Python scripts at specific intervals.",
      "Designed a MySQL pipeline to collect, store, and query visitor events for behavioral analysis and traffic insights.",
    ],
  },
];

const volunteering: Entry[] = [
  {
    title: "Student to Student (S2S)",
    subtitle: "Peer Mentor",
    date: "September 2025 – Present",
    bullets: [
      "Led weekly 2-hour mentorship sessions for 12 students, providing tailored academic guidance and mental health resources to foster an inclusive, supportive campus community.",
    ],
  },
];

const skills: { label: string; value: string }[] = [
  {
    label: "Networking & Security",
    value:
      "TCP/IP, DNS, DHCP, VLANs, Routing, ACLs, IPSec, FTP, SSH, Authentication, Authorization, SSL/TLS",
  },
  {
    label: "Systems",
    value:
      "Windows Server, Linux, CLI, Virtualization, Packet Analysis, Monitoring",
  },
  {
    label: "Programming",
    value:
      "Java, C++, Python, SQL (MySQL, PostgreSQL), ARM Assembly, JavaScript, HTML/CSS",
  },
  {
    label: "Tools",
    value:
      "GNS3, VMware, VirtualBox, Git, Wireshark, Google Workspace, Microsoft Office Suite",
  },
  {
    label: "Languages",
    value:
      "English, Turkish, Russian, Ukrainian (all fluent); French, Polish, ASL (intermediate)",
  },
  { label: "Interests", value: "Motorbikes; Gym; Reading; Traveling; The Office" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="border-b border-zinc-200 pb-1 dark:border-zinc-800 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {title}
      </h2>
      <div className="mt-4 space-y-6">{children}</div>
    </section>
  );
}

function EntryBlock({ entry }: { entry: Entry }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
          {entry.href ? (
            <a
              href={entry.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {entry.title}
            </a>
          ) : (
            entry.title
          )}
        </h3>
        {entry.date && (
          <span className="shrink-0 text-sm text-zinc-500">{entry.date}</span>
        )}
      </div>
      {(entry.subtitle || entry.meta) && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          {entry.subtitle && (
            <p className="text-sm italic text-zinc-600 dark:text-zinc-400">{entry.subtitle}</p>
          )}
          {entry.meta && (
            <span className="shrink-0 text-sm text-zinc-500">{entry.meta}</span>
          )}
        </div>
      )}
      {entry.bullets && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 marker:text-zinc-300 dark:text-zinc-300 dark:marker:text-zinc-700">
          {entry.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResumePage() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header: identity + contact on the left, PDF download on the right. */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Denys</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span>Dublin, Ireland</span>
            {contacts.map((c) => (
              <span key={c.href} className="flex items-center gap-2">
                <span aria-hidden className="text-zinc-300 dark:text-zinc-700">
                  ·
                </span>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    c.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="underline-offset-2 hover:text-black hover:underline dark:hover:text-white"
                >
                  {c.label}
                </a>
              </span>
            ))}
          </p>
        </div>
        <a
          href={RESUME_PDF}
          download
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <Icon icon="mdi:tray-arrow-down" className="h-4 w-4" aria-hidden />
          Download PDF
        </a>
      </header>

      <Section title="Education">
        {education.map((e) => (
          <EntryBlock key={e.title} entry={e} />
        ))}
      </Section>

      <Section title="Certifications">
        {certifications.map((e) => (
          <EntryBlock key={e.title} entry={e} />
        ))}
      </Section>

      <Section title="Work Experience">
        {experience.map((e) => (
          <EntryBlock key={e.title} entry={e} />
        ))}
      </Section>

      <Section title="Projects">
        {projects.map((e) => (
          <EntryBlock key={e.title} entry={e} />
        ))}
      </Section>

      <Section title="Volunteering">
        {volunteering.map((e) => (
          <EntryBlock key={e.title} entry={e} />
        ))}
      </Section>

      <Section title="Skills & Interests">
        <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
          {skills.map((s) => (
            <li key={s.label}>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{s.label}:</span>{" "}
              {s.value}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
