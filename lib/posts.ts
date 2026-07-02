import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content", "posts");

export type PostFrontmatter = {
  title: string;
  date: string;
  summary: string;
};

export type PostMeta = PostFrontmatter & {
  slug: string;
};

export type Post = PostMeta & {
  content: string;
};

function parseFrontmatter(data: Record<string, unknown>): PostFrontmatter {
  return {
    title: String(data.title ?? "Untitled"),
    date: String(data.date ?? ""),
    summary: String(data.summary ?? ""),
  };
}

/** All posts, newest first, without their MDX body. */
export function getAllPosts(): PostMeta[] {
  const files = fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".mdx"));

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    const { data } = matter(raw);
    return { slug, ...parseFrontmatter(data) };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** A single post by slug, including its MDX body. Returns null if missing. */
export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(postsDirectory, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return { slug, content, ...parseFrontmatter(data) };
}
