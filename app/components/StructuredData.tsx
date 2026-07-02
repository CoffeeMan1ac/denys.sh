import {
  SITE_URL,
  FULL_NAME,
  SHORT_NAME,
  SITE_DESCRIPTION,
  LOCATION,
  SAME_AS,
  absoluteUrl,
} from "@/lib/site";

// JSON-LD structured data for search engines. A Person graph (who I am, where to
// find me) plus a WebSite graph, emitted once site-wide from the root layout.
// Per-post BlogPosting data is added on the post pages themselves.
export default function StructuredData() {
  const personId = `${SITE_URL}/#person`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: FULL_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        jobTitle: "Software Developer & Systems Administrator",
        image: absoluteUrl("/denys-4x3.jpg"),
        address: {
          "@type": "PostalAddress",
          addressLocality: "Dublin",
          addressCountry: "IE",
        },
        homeLocation: { "@type": "Place", name: LOCATION },
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Trinity College Dublin",
        },
        sameAs: SAME_AS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SHORT_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD is trusted, safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
