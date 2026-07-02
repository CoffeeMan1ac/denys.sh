import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Posts and notes on software, systems, and what I'm building and learning.",
  // Hidden from the nav (see Header.tsx) and kept out of search.
  robots: { index: false, follow: false },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <ul className="mt-6 flex flex-col gap-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="text-xl font-medium underline-offset-4 hover:underline"
            >
              {post.title}
            </Link>
            <p className="text-sm text-zinc-500">{post.date}</p>
            <p className="mt-1 text-zinc-600">{post.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
