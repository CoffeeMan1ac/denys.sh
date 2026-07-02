// Tab-completion logic for the terminal. Pure: given the current input and cwd,
// returns the candidate replacements for the last token plus where that token
// starts, so the view can splice and render ghost text.

import { getNode, listChildren, resolvePath } from "./filesystem";
import { COMMAND_NAMES } from "./commands";

export type Completion = {
  candidates: string[]; // each is a full replacement for the last token
  tokenStart: number; // index in the line where the last token begins
};

export function complete(line: string, cwd: string): Completion {
  const lastToken = line.match(/\S*$/)?.[0] ?? "";
  const tokenStart = line.length - lastToken.length;
  const before = line.slice(0, tokenStart).trim();

  // First word → complete a command name.
  if (before === "") {
    return {
      candidates: COMMAND_NAMES.filter((c) => c.startsWith(lastToken)),
      tokenStart,
    };
  }

  // Otherwise → complete a path. Split the token into its directory part (kept
  // verbatim in the candidate) and the partial name being matched.
  const slash = lastToken.lastIndexOf("/");
  const dirPart = slash >= 0 ? lastToken.slice(0, slash + 1) : "";
  const basePart = slash >= 0 ? lastToken.slice(slash + 1) : lastToken;

  const node = getNode(dirPart ? resolvePath(cwd, dirPart) : cwd);
  if (!node || node.type !== "dir") return { candidates: [], tokenStart };

  // Only show dotfiles once the user types the leading dot, like bash.
  const showHidden = basePart.startsWith(".");
  const candidates = listChildren(node, showHidden)
    .filter((name) => name.startsWith(basePart))
    .map((name) => {
      const child = node.children[name];
      return dirPart + name + (child.type === "dir" ? "/" : "");
    });

  return { candidates, tokenStart };
}

// Longest common prefix of a set of strings (bash's first-Tab behavior).
export function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
    prefix = prefix.slice(0, i);
    if (prefix === "") break;
  }
  return prefix;
}
