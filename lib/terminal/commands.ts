// Command interpreter for the terminal.
//
// A typed line is tokenized, split on `&&`/`||` into segments run by exit status,
// and each segment may redirect with `>`/`>>`. Each command returns a
// CommandResult; runLine threads cwd and exit status across the chain and hands
// the React provider the net effects to apply.
//
// Follows bash conventions: commands are case-sensitive (`cleAr` is not
// `clear`), exit status drives chaining, and errors read like bash's.

import {
  HOME,
  displayPath,
  getNode,
  listChildren,
  resolvePath,
  writeFile,
  type FsNode,
} from "./filesystem";

export type ShellState = {
  cwd: string;
  prevCwd: string; // OLDPWD, for `cd -`
  history: string[]; // for the `history` builtin
};

// Effects of a single command.
type CommandResult = {
  output: string[];
  status: number; // 0 = success (bash exit status)
  cwd?: string; // set when the working directory changes
  clear?: boolean; // wipe the scrollback (`clear` / Ctrl-L)
  exit?: boolean; // close the terminal and reset the session (like a refresh)
};

// Net effects of a whole line (possibly chained/redirected).
export type LineResult = {
  output: string[];
  status: number;
  cwd: string;
  prevCwd: string;
  clear: boolean;
  exit?: boolean;
};

const HELP: ReadonlyArray<[string, string]> = [
  ["help", "show this help"],
  ["clear", "clear the screen"],
  ["echo", "print a line of text"],
  ["whoami", "print the current user"],
  ["pwd", "print the working directory"],
  ["ls", "list directory contents"],
  ["cd", "change the working directory"],
  ["cat", "print a file's contents"],
  ["tree", "list contents recursively"],
  ["history", "show command history"],
  ["exit", "close the terminal (resets the session)"],
];

// Command names, for Tab completion and `help`.
export const COMMAND_NAMES = HELP.map(([name]) => name);

// Tokenizer
// Splits a line into words and operator tokens. Operators are recognized even
// without surrounding spaces (`echo hi>a`); quotes group text literally, so
// `echo "a && b"` is one word and the operators inside aren't special.

type Token =
  | { type: "word"; value: string }
  | { type: "op"; value: "&&" | "||" | ">" | ">>" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const c = input[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c === "&" && input[i + 1] === "&") {
      tokens.push({ type: "op", value: "&&" });
      i += 2;
      continue;
    }
    if (c === "|" && input[i + 1] === "|") {
      tokens.push({ type: "op", value: "||" });
      i += 2;
      continue;
    }
    if (c === ">") {
      if (input[i + 1] === ">") {
        tokens.push({ type: "op", value: ">>" });
        i += 2;
      } else {
        tokens.push({ type: "op", value: ">" });
        i++;
      }
      continue;
    }

    // A word, possibly containing quoted runs.
    let word = "";
    while (i < input.length) {
      const ch = input[i];
      if (ch === " " || ch === "\t" || ch === ">") break;
      if (ch === "&" && input[i + 1] === "&") break;
      if (ch === "|" && input[i + 1] === "|") break;
      if (ch === '"' || ch === "'") {
        i++; // opening quote
        while (i < input.length && input[i] !== ch) word += input[i++];
        i++; // closing quote
        continue;
      }
      word += ch;
      i++;
    }
    tokens.push({ type: "word", value: word });
  }

  return tokens;
}

// Line evaluation

export function runLine(line: string, state: ShellState): LineResult {
  const tokens = tokenize(line);

  let cwd = state.cwd;
  let prevCwd = state.prevCwd;
  let output: string[] = [];
  let status = 0;
  let clear = false;
  let exit = false;

  // Split into segments on `&&`/`||`, executing left-to-right by exit status.
  let segment: Token[] = [];
  let pendingOp: "&&" | "||" | null = null;
  let runSegment = true;

  const flush = () => {
    if (pendingOp) runSegment = pendingOp === "&&" ? status === 0 : status !== 0;
    if (runSegment) {
      const res = execSegment(segment, { ...state, cwd, prevCwd });
      status = res.status;
      if (res.clear) {
        output = [];
        clear = true;
      }
      if (res.output.length) output.push(...res.output);
      if (res.exit) exit = true;
      if (res.cwd !== undefined && res.cwd !== cwd) {
        prevCwd = cwd;
        cwd = res.cwd;
      }
    }
    segment = [];
  };

  for (const tok of tokens) {
    if (tok.type === "op" && (tok.value === "&&" || tok.value === "||")) {
      flush();
      pendingOp = tok.value;
    } else {
      segment.push(tok);
    }
  }
  flush();

  return { output, status, cwd, prevCwd, clear, exit };
}

// Execute one segment: a command plus optional `>`/`>>` redirection.
function execSegment(tokens: Token[], state: ShellState): CommandResult {
  let redirect: { append: boolean; file: string } | null = null;
  const words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type === "op" && (tok.value === ">" || tok.value === ">>")) {
      const next = tokens[i + 1];
      if (!next || next.type !== "word") {
        return {
          output: ["bash: syntax error near unexpected token `newline'"],
          status: 2,
        };
      }
      redirect = { append: tok.value === ">>", file: next.value };
      i++; // consume the filename
      continue;
    }
    if (tok.type === "word") words.push(tok.value);
  }

  if (words.length === 0 && !redirect) return { output: [], status: 0 };

  const res =
    words.length === 0
      ? { output: [], status: 0 } // pure `> file` truncates/creates an empty file
      : execCommand(words[0], words.slice(1), state);

  if (!redirect) return res;

  // bash only redirects stdout; on failure the (stderr) message stays on screen.
  if (res.status !== 0) return res;

  const text = res.output.length ? res.output.join("\n") + "\n" : "";
  const w = writeFile(state.cwd, redirect.file, text, redirect.append);
  if (!w.ok) {
    const msg = w.code === "EISDIR" ? "Is a directory" : "No such file or directory";
    return { output: [`bash: ${redirect.file}: ${msg}`], status: 1 };
  }
  return { output: [], status: 0, cwd: res.cwd, clear: res.clear };
}

// Individual commands

function execCommand(cmd: string, args: string[], state: ShellState): CommandResult {
  switch (cmd) {
    case "help":
      return {
        status: 0,
        output: [
          "Available commands:",
          ...HELP.map(([name, desc]) => `  ${name.padEnd(8)}${desc}`),
        ],
      };
    case "clear":
      return { output: [], status: 0, clear: true };
    case "echo":
      return { output: [args.join(" ")], status: 0 };
    case "whoami":
      return { output: ["guest"], status: 0 };
    case "pwd":
      return { output: [state.cwd], status: 0 };
    case "ls":
      return ls(args, state);
    case "cd":
      return cd(args, state);
    case "cat":
      return cat(args, state);
    case "tree":
      return tree(args, state);
    case "history":
      return {
        status: 0,
        output: state.history.map(
          (cmd, i) => `${String(i + 1).padStart(5)}  ${cmd}`,
        ),
      };
    case "exit":
      return { output: [], status: 0, exit: true };
    default:
      return { output: [`bash: ${cmd}: command not found`], status: 127 };
  }
}

function ls(args: string[], state: ShellState): CommandResult {
  const showHidden = args.some((a) => a.startsWith("-") && a.includes("a"));
  const target = args.find((a) => !a.startsWith("-"));

  const path = target ? resolvePath(state.cwd, target) : state.cwd;
  const node = getNode(path);

  if (!node) {
    return {
      output: [`ls: cannot access '${target}': No such file or directory`],
      status: 2,
    };
  }
  if (node.type === "file") return { output: [target ?? path], status: 0 };

  const names = listChildren(node, showHidden);
  return { output: names.length ? [names.join("  ")] : [], status: 0 };
}

function cd(args: string[], state: ShellState): CommandResult {
  const target = args[0] ?? "~"; // bare `cd` goes home

  // `cd -` returns to OLDPWD and (like bash) prints the directory it lands in.
  if (target === "-") {
    return { output: [state.prevCwd], status: 0, cwd: state.prevCwd };
  }

  const path = resolvePath(state.cwd, target);
  const node = getNode(path);

  if (!node) {
    return { output: [`bash: cd: ${target}: No such file or directory`], status: 1 };
  }
  if (node.type !== "dir") {
    return { output: [`bash: cd: ${target}: Not a directory`], status: 1 };
  }
  return { output: [], status: 0, cwd: path };
}

function cat(args: string[], state: ShellState): CommandResult {
  if (args.length === 0) return { output: [], status: 0 };

  const output: string[] = [];
  let status = 0;
  for (const arg of args) {
    const node = getNode(resolvePath(state.cwd, arg));
    if (!node) {
      output.push(`cat: ${arg}: No such file or directory`);
      status = 1;
    } else if (node.type === "dir") {
      output.push(`cat: ${arg}: Is a directory`);
      status = 1;
    } else if (node.content) {
      // A trailing newline terminates the last line; it doesn't add a blank one.
      const body = node.content.endsWith("\n")
        ? node.content.slice(0, -1)
        : node.content;
      output.push(...body.split("\n"));
    }
  }
  return { output, status };
}

function tree(args: string[], state: ShellState): CommandResult {
  const showHidden = args.some((a) => a.startsWith("-") && a.includes("a"));
  const target = args.find((a) => !a.startsWith("-"));

  const path = target ? resolvePath(state.cwd, target) : state.cwd;
  const node = getNode(path);

  if (!node) return { output: [`${target}  [error opening dir]`], status: 1 };
  if (node.type !== "dir") return { output: [target ?? path], status: 0 };

  const counts = { dirs: 0, files: 0 };
  const body = renderTree(node, "", showHidden, counts);
  const dirLabel = counts.dirs === 1 ? "directory" : "directories";
  const fileLabel = counts.files === 1 ? "file" : "files";
  return {
    status: 0,
    output: [
      target ?? ".",
      ...body,
      "",
      `${counts.dirs} ${dirLabel}, ${counts.files} ${fileLabel}`,
    ],
  };
}

function renderTree(
  node: FsNode,
  prefix: string,
  showHidden: boolean,
  counts: { dirs: number; files: number },
): string[] {
  if (node.type !== "dir") return [];
  const names = listChildren(node, showHidden);
  const lines: string[] = [];

  names.forEach((name, i) => {
    const last = i === names.length - 1;
    lines.push(prefix + (last ? "└── " : "├── ") + name);
    const child = node.children[name];
    if (child.type === "dir") {
      counts.dirs++;
      lines.push(
        ...renderTree(child, prefix + (last ? "    " : "│   "), showHidden, counts),
      );
    } else {
      counts.files++;
    }
  });

  return lines;
}

// Re-exported so the UI can render the prompt without reaching into filesystem.
export { HOME, displayPath };
