import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

// Per-post Open Graph card: renders the post title so shared links to a specific
// post get their own preview rather than the generic site card.
export const alt = "Writing on denys.sh";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Prerender one card per post at build time instead of on first request.
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return renderOgImage({
    eyebrow: "Writing",
    title: post?.title ?? "Writing",
    subtitle: post?.summary,
  });
}
