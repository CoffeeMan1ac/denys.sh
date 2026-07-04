"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { HOME, displayPath } from "@/lib/terminal/filesystem";
import { runLine } from "@/lib/terminal/commands";

// One terminal session, shared by every window that renders it (the popup and
// the fullscreen /terminal screen). This provider lives in the root layout,
// which the App Router keeps mounted across navigation, so the session
// (scrollback, history, cwd, scores) survives page changes and both windows
// read and write the same state.

export type TerminalLine =
  // A previously entered command, echoed with the prompt it ran under.
  | { id: number; type: "command"; path: string; text: string }
  // Output from a command (or the welcome banner).
  | { id: number; type: "output"; text: string };

type TerminalContextValue = {
  lines: TerminalLine[];
  history: string[];
  cwd: string;
  isOpen: boolean;
  run: (line: string) => void;
  cancel: (text: string) => void; // Ctrl-C: echo the line, don't run it
  clearScreen: () => void;
  open: () => void;
  close: () => void;
  // Same as the `exit` command: wipe the in-memory session back to a fresh shell
  // and close the terminal (history and scores persist, as a refresh leaves them).
  exit: () => void;
  // Persistent key/value store for game scores.
  getScore: (key: string) => number;
  setScore: (key: string, value: number) => void;
};

const TerminalContext = createContext<TerminalContextValue | null>(null);

const HISTORY_KEY = "terminal:history";
const SCORES_KEY = "terminal:scores";

const WELCOME =
  "Welcome to the denys.sh terminal. Type 'help' for a list of commands.";

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: "output", text: WELCOME },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [cwd, setCwd] = useState(HOME);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // OLDPWD for `cd -`; a ref because it never needs to trigger a re-render.
  const prevCwd = useRef(HOME);
  // Monotonic id source for line keys.
  const nextId = useRef(1);

  // Restore persisted history + scores after mount, so the server-rendered empty
  // defaults match the first client render (no hydration mismatch).
  useEffect(() => {
    try {
      const h = window.localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
      const s = window.localStorage.getItem(SCORES_KEY);
      if (s) setScores(JSON.parse(s));
    } catch {
      // Corrupt storage: ignore and start fresh.
    }
  }, []);

  const addLines = (incoming: TerminalLine[]) =>
    setLines((prev) => [...prev, ...incoming]);

  // The `exit` behavior, shared by the `exit` command and the red traffic light:
  // close the shell session, reset cwd to home, and restore the welcome banner.
  // Like a real shell, the filesystem isn't wiped: file edits survive until a
  // full page reload, which clears the in-memory FS on its own.
  const exit = useCallback(() => {
    prevCwd.current = HOME;
    setCwd(HOME);
    setLines([{ id: nextId.current++, type: "output", text: WELCOME }]);
    setIsOpen(false);
  }, []);

  const run = useCallback(
    (line: string) => {
      const path = displayPath(cwd);
      // Echo the command under the prompt it was typed at.
      const echoed: TerminalLine = {
        id: nextId.current++,
        type: "command",
        path,
        text: line,
      };

      const trimmed = line.trim();
      if (trimmed !== "") {
        setHistory((prev) => {
          // bash HISTCONTROL=ignoredups: skip consecutive duplicates.
          if (prev[prev.length - 1] === trimmed) return prev;
          const next = [...prev, trimmed];
          window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
        });
      }

      const result = runLine(line, {
        cwd,
        prevCwd: prevCwd.current,
        history,
      });

      // `exit` ends the shell session (see `exit` above): cwd and scrollback
      // reset, but files keep their edits until a full page reload.
      if (result.exit) {
        exit();
        return;
      }

      const toLine = (text: string): TerminalLine => ({
        id: nextId.current++,
        type: "output",
        text,
      });

      if (result.clear) {
        // `clear` (possibly mid-chain, e.g. `clear && ls`) wipes the scrollback,
        // including the command just echoed; only post-clear output remains.
        setLines(result.output.map(toLine));
      } else {
        addLines([echoed, ...result.output.map(toLine)]);
      }

      prevCwd.current = result.prevCwd;
      if (result.cwd !== cwd) setCwd(result.cwd);
    },
    [cwd, history, exit],
  );

  const cancel = useCallback(
    (text: string) => {
      // Ctrl-C: echo the in-progress line with ^C, run nothing, no history.
      setLines((prev) => [
        ...prev,
        {
          id: nextId.current++,
          type: "command",
          path: displayPath(cwd),
          text: text + "^C",
        },
      ]);
    },
    [cwd],
  );

  const clearScreen = useCallback(() => setLines([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Standard IDE shortcut: Ctrl+` (or ⌘+`) toggles the terminal popup. Skipped
  // on the fullscreen /terminal route, which is already a terminal (and where
  // opening the popup would invisibly lock the page scroll).
  useEffect(() => {
    if (pathname === "/terminal") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  const getScore = useCallback((key: string) => scores[key] ?? 0, [scores]);
  const setScore = useCallback((key: string, value: number) => {
    setScores((prev) => {
      const next = { ...prev, [key]: value };
      window.localStorage.setItem(SCORES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <TerminalContext.Provider
      value={{
        lines,
        history,
        cwd,
        isOpen,
        run,
        cancel,
        clearScreen,
        open,
        close,
        exit,
        getScore,
        setScore,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx) {
    throw new Error("useTerminal must be used within a TerminalProvider");
  }
  return ctx;
}
