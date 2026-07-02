// Virtual filesystem for the terminal. Pure data + path helpers, no React.
// Enough for ls/cd/pwd/tree/cat and `>`/`>>` redirection: files carry content
// so `cat` can print them, and the tree is mutable so redirection can create
// and append files. Mutations are module-local and reset on a full reload.

export type FsNode =
  | { type: "dir"; children: Record<string, FsNode> }
  | { type: "file"; content: string };

export const HOME = "/home/guest";

// The guest home directory. A factory so `exit` can reset to a fresh shell
// without a full page reload.
const makeRoot = (): FsNode => ({
  type: "dir",
  children: {
    home: {
      type: "dir",
      children: {
        guest: {
          type: "dir",
          children: {
            Desktop: { type: "dir", children: {} },
            Documents: {
              type: "dir",
              children: {
                "notes.txt": {
                  type: "file",
                  content: "todo:\n- ship the terminal\n- wire up the games",
                },
              },
            },
            Projects: {
              type: "dir",
              children: { mywebsite: { type: "dir", children: {} } },
            },
            "about.txt": {
              type: "file",
              content: "Denys — developer",
            },
            ".bashrc": {
              type: "file",
              content: "# ~/.bashrc\nalias ll='ls -la'\nexport PS1='\\u@\\h:\\w\\$ '",
            },
            ".readme": {
              type: "file",
              content: "This is a toy terminal. Type 'help' to get started.",
            },
          },
        },
      },
    },
  },
});

let root: FsNode = makeRoot();

// Reset the filesystem to its initial state (used by `exit`).
export function resetFilesystem() {
  root = makeRoot();
}

// Normalize `target` (absolute, relative, ~, ., ..) against `cwd` into an
// absolute path. Doesn't check existence; the caller does, so it can emit the
// right bash error.
export function resolvePath(cwd: string, target: string): string {
  let segments: string[];
  let rest: string;

  if (target.startsWith("/")) {
    segments = [];
    rest = target;
  } else if (target === "~" || target.startsWith("~/")) {
    segments = HOME.split("/").filter(Boolean);
    rest = target.slice(1); // drop the leading ~
  } else {
    segments = cwd.split("/").filter(Boolean);
    rest = "/" + target;
  }

  for (const part of rest.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }

  return "/" + segments.join("/");
}

// Walk an absolute path to its node, or null if any segment is missing or a
// non-final segment isn't a directory.
export function getNode(path: string): FsNode | null {
  let node: FsNode = root;
  for (const part of path.split("/").filter(Boolean)) {
    if (node.type !== "dir") return null;
    const child = node.children[part];
    if (!child) return null;
    node = child;
  }
  return node;
}

// Names of a directory's entries, hidden ones (dotfiles) excluded unless asked.
export function listChildren(node: FsNode, showHidden: boolean): string[] {
  if (node.type !== "dir") return [];
  return Object.keys(node.children)
    .filter((name) => showHidden || !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b));
}

// What bash shows in the prompt: ~ for home, ~/sub beneath it, absolute else.
export function displayPath(path: string): string {
  if (path === HOME) return "~";
  if (path.startsWith(HOME + "/")) return "~" + path.slice(HOME.length);
  return path;
}

// Create or append to a file (`>` / `>>`). Returns an error code on failure so
// the caller can format a bash-style message.
export function writeFile(
  cwd: string,
  target: string,
  content: string,
  append: boolean,
): { ok: true } | { ok: false; code: "ENOENT" | "EISDIR" } {
  const path = resolvePath(cwd, target);
  const segments = path.split("/").filter(Boolean);
  const name = segments.pop();
  if (!name) return { ok: false, code: "EISDIR" };

  const parent = getNode("/" + segments.join("/"));
  if (!parent || parent.type !== "dir") return { ok: false, code: "ENOENT" };

  const existing = parent.children[name];
  if (existing && existing.type === "dir") return { ok: false, code: "EISDIR" };

  const base = append && existing && existing.type === "file" ? existing.content : "";
  parent.children[name] = { type: "file", content: base + content };
  return { ok: true };
}
