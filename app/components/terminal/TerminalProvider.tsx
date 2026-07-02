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
import { loadPet } from "@/lib/pet/core";

// One terminal session, shared by every window that renders it (the popup and
// the fullscreen /terminal screen). This provider lives in the root layout,
// which the App Router keeps mounted across navigation, so the session
// (scrollback, history, cwd, scores) survives page changes and both windows
// read and write the same state.

export type TerminalLine =
  // A previously entered command, echoed with the prompt it ran under.
  | { id: number; type: "command"; path: string; text: string }
  // Output from a command (or the welcome banner).
  | { id: number; type: "output"; text: string }
  // The first-run nudge toward the pet (rendered with a clickable `pet`).
  | { id: number; type: "hint" };

type TerminalContextValue = {
  lines: TerminalLine[];
  history: string[];
  cwd: string;
  isOpen: boolean;
  // The running interactive program (e.g. "pet"), or null for the shell prompt.
  activeProgram: string | null;
  run: (line: string) => void;
  cancel: (text: string) => void; // Ctrl-C: echo the line, don't run it
  clearScreen: () => void;
  exitProgram: () => void; // return from an interactive program to the prompt
  open: () => void;
  close: () => void;
  // Same as the `exit` command: wipe the in-memory session back to a fresh shell
  // and close the terminal (history/scores/pet persist, as a refresh leaves them).
  exit: () => void;
  // A request to auto-type text into the live prompt (e.g. the corner pet's
  // nudge typing out `pet`). The id makes repeat requests of the same text
  // distinct so they re-fire; the view clears it once consumed. `fast` skips the
  // slow lead-in for in-terminal clicks where the eye is already on the prompt.
  typeRequest: { text: string; id: number; fast: boolean } | null;
  requestType: (text: string, fast?: boolean) => void;
  consumeType: () => void;
  // One-shot: the corner pet's "name me" nudge launches the pet program and asks
  // it to open the naming screen straight away (same as running `pet` then `n`).
  petNameIntent: boolean;
  requestPetName: () => void;
  consumePetName: () => void;
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
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
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
    // First-run nudge: a welcome-style line under the banner, only until the pet
    // has a name. Done here (after mount) to avoid a hydration mismatch, and
    // guarded so it's added at most once.
    if (!loadPet()?.name) {
      setLines((prev) =>
        prev.some((l) => l.type === "hint")
          ? prev
          : [...prev, { id: nextId.current++, type: "hint" }],
      );
    }
  }, []);

  const addLines = (incoming: TerminalLine[]) =>
    setLines((prev) => [...prev, ...incoming]);

  // The `exit` behavior, shared by the `exit` command and the red traffic light:
  // close the shell session, reset cwd to home, drop any running program, and
  // restore the welcome banner (plus the pet nudge if still unnamed). Like a real
  // shell, the filesystem isn't wiped: file edits survive until a full page
  // reload, which clears the in-memory FS on its own.
  const exit = useCallback(() => {
    prevCwd.current = HOME;
    setCwd(HOME);
    setActiveProgram(null);
    const intro: TerminalLine[] = [
      { id: nextId.current++, type: "output", text: WELCOME },
    ];
    if (!loadPet()?.name) intro.push({ id: nextId.current++, type: "hint" });
    setLines(intro);
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
      if (result.launch) setActiveProgram(result.launch);
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
  const exitProgram = useCallback(() => setActiveProgram(null), []);
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

  const [typeRequest, setTypeRequest] = useState<
    { text: string; id: number; fast: boolean } | null
  >(null);
  const typeId = useRef(0);
  const requestType = useCallback((text: string, fast = false) => {
    setTypeRequest({ text, id: (typeId.current += 1), fast });
  }, []);
  const consumeType = useCallback(() => setTypeRequest(null), []);

  const [petNameIntent, setPetNameIntent] = useState(false);
  const requestPetName = useCallback(() => setPetNameIntent(true), []);
  const consumePetName = useCallback(() => setPetNameIntent(false), []);

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
        activeProgram,
        run,
        cancel,
        clearScreen,
        exitProgram,
        open,
        close,
        exit,
        typeRequest,
        requestType,
        consumeType,
        petNameIntent,
        requestPetName,
        consumePetName,
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
