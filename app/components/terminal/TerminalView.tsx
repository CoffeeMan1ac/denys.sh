"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { displayPath } from "@/lib/terminal/filesystem";
import { complete, commonPrefix } from "@/lib/terminal/complete";
import { useTerminal } from "./TerminalProvider";
import Pet from "./Pet";

// The interactive terminal surface: scrollback + a live prompt line. It owns
// only the in-progress input, history cursor, and Tab-completion cycle state;
// everything durable (output, history, cwd) lives in the shared session. Both
// the popup and the fullscreen screen render this, so they behave the same.

// Renders the colored `guest@denys.sh:<path>$` prompt. Standard bash PS1
// coloring: user@host green, path blue.
function Prompt({ path }: { path: string }) {
  return (
    <span className="shrink-0 whitespace-pre">
      <span className="text-emerald-700">guest@denys.sh</span>
      <span className="text-zinc-400">:</span>
      <span className="text-sky-700">{path}</span>
      <span className="text-zinc-400">$ </span>
    </span>
  );
}

export default function TerminalView() {
  const {
    lines,
    history,
    cwd,
    activeProgram,
    run,
    cancel,
    clearScreen,
    exitProgram,
    typeRequest,
    requestType,
    consumeType,
    petNameIntent,
    consumePetName,
  } = useTerminal();
  const [input, setInput] = useState("");
  // null = editing a fresh line; otherwise an index into `history`.
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Active Tab-completion cycle (repeated Tab steps through candidates).
  const cycleRef = useRef<{
    candidates: string[];
    index: number;
    prefix: string;
  } | null>(null);
  // Active auto-type animation (the corner pet typing out `pet`): the lead pause
  // before it starts, and the per-character interval.
  const typeTimerRef = useRef<number | null>(null);
  const leadTimerRef = useRef<number | null>(null);

  // Cancel an in-flight auto-type (lead or typing) so a real keystroke wins.
  function stopTyping() {
    let active = false;
    if (leadTimerRef.current !== null) {
      window.clearTimeout(leadTimerRef.current);
      leadTimerRef.current = null;
      active = true;
    }
    if (typeTimerRef.current !== null) {
      window.clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
      active = true;
    }
    if (active) consumeType();
  }

  // Keep the newest output in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  // Focus the input on mount (e.g. when the popup opens).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-type a requested command (e.g. the corner pet's `pet`) into the prompt,
  // one character at a time. Runs on mount too, so clicking the nudge (which
  // opens the terminal and sets the request together) types as soon as this
  // view appears.
  useEffect(() => {
    if (!typeRequest) return;
    const { text, fast } = typeRequest;
    setInput("");
    setHistoryIndex(null);
    inputRef.current?.focus(); // caret blinks at the prompt during the lead
    let i = 0;
    // Lead pause so the terminal is visibly open (and the eye has found the
    // prompt) before anything types; otherwise a first-time visitor misses it.
    // `fast` requests (a click already inside the terminal) barely pause and
    // type quicker.
    const lead = window.setTimeout(() => {
      leadTimerRef.current = null;
      typeTimerRef.current = window.setInterval(() => {
        i += 1;
        setInput(text.slice(0, i));
        if (i >= text.length) {
          if (typeTimerRef.current !== null) window.clearInterval(typeTimerRef.current);
          typeTimerRef.current = null;
          consumeType(); // mark done so reopening the terminal won't re-type
        }
      }, fast ? 55 : 140);
    }, fast ? 120 : 650);
    leadTimerRef.current = lead;
    return () => {
      window.clearTimeout(lead);
      if (typeTimerRef.current !== null) {
        window.clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    };
  }, [typeRequest, consumeType]);

  // Ctrl+Shift+C copies the selection, the terminal convention (plain Ctrl+C is
  // reserved for interrupt). Listens at the window so it works whether or not
  // the input holds focus.
  useEffect(() => {
    const onCopyKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        const selection = window.getSelection()?.toString();
        if (selection) {
          e.preventDefault();
          void navigator.clipboard?.writeText(selection);
        }
      }
    };
    window.addEventListener("keydown", onCopyKey);
    return () => window.removeEventListener("keydown", onCopyKey);
  }, []);

  // Ghost suffix: the grayed-out preview of what Tab would fill in. Shows the
  // sole candidate's tail, or the shared prefix's tail when several match.
  const ghost = useMemo(() => {
    if (input === "" || input.endsWith(" ")) return "";
    const { candidates, tokenStart } = complete(input, cwd);
    if (candidates.length === 0) return "";
    const typed = input.slice(tokenStart);
    if (candidates.length === 1) return candidates[0].slice(typed.length);
    const cp = commonPrefix(candidates);
    return cp.length > typed.length ? cp.slice(typed.length) : "";
  }, [input, cwd]);

  function changeInput(value: string) {
    stopTyping(); // a real edit takes over from the auto-type
    cycleRef.current = null; // typing breaks any active completion cycle
    setInput(value);
  }

  function handleTab() {
    // Continue an in-progress cycle through the candidates.
    if (cycleRef.current) {
      const c = cycleRef.current;
      c.index = (c.index + 1) % c.candidates.length;
      setInput(c.prefix + c.candidates[c.index]);
      return;
    }

    const { candidates, tokenStart } = complete(input, cwd);
    if (candidates.length === 0) return;

    const prefix = input.slice(0, tokenStart);
    const typed = input.slice(tokenStart);

    if (candidates.length === 1) {
      setInput(prefix + candidates[0]);
      return;
    }

    // First Tab extends to the shared prefix (bash); once there, start cycling.
    const cp = commonPrefix(candidates);
    if (cp.length > typed.length) {
      setInput(prefix + cp);
      return;
    }
    cycleRef.current = { candidates, index: 0, prefix };
    setInput(prefix + candidates[0]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    stopTyping(); // any keypress hands control back to the user
    if (e.key !== "Tab") cycleRef.current = null;

    // Ctrl-L clears the screen, Ctrl-C abandons the current line, like bash.
    if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      clearScreen();
      return;
    }
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      cancel(input);
      setInput("");
      setHistoryIndex(null);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      handleTab();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault(); // submit instead of inserting a newline
      run(input);
      setInput("");
      setHistoryIndex(null);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next =
        historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(null);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  }

  // An interactive program (e.g. `pet`) takes over the surface like an
  // alternate screen; quitting it returns to the prompt with scrollback intact.
  if (activeProgram === "pet")
    return (
      <Pet
        onExit={exitProgram}
        autoName={petNameIntent}
        onAutoNameConsumed={consumePetName}
      />
    );

  return (
    <div
      ref={scrollRef}
      onClick={() => {
        // Don't steal focus mid-selection; that would clear it before copy.
        if (window.getSelection()?.toString()) return;
        inputRef.current?.focus();
      }}
      className="h-full overflow-y-auto overscroll-contain bg-white px-3 py-2 font-mono text-[15px] leading-relaxed text-zinc-800"
    >
      {lines.map((line) => {
        if (line.type === "command") {
          return (
            <div key={line.id} className="flex">
              <Prompt path={line.path} />
              <span className="whitespace-pre-wrap break-all">{line.text}</span>
            </div>
          );
        }
        if (line.type === "hint") {
          // A welcome-style line; `pet` is clickable and types itself out (fast,
          // since the eye is already on the terminal).
          return (
            <div key={line.id} className="whitespace-pre-wrap break-words">
              Haven&apos;t named your companion yet? Run{" "}
              <button
                type="button"
                onClick={() => requestType("pet", true)}
                className="text-emerald-700 underline-offset-2 hover:underline"
              >
                pet
              </button>{" "}
              to do so.
            </div>
          );
        }
        return (
          <div key={line.id} className="whitespace-pre-wrap break-all">
            {line.text}
          </div>
        );
      })}

      {/* Live prompt line. The overlay (in normal flow) renders the text plus
          ghost completion and sizes the row; the transparent textarea sits on
          top for editing. Both wrap identically, so long commands flow onto new
          lines instead of scrolling sideways. */}
      <div className="flex">
        <Prompt path={displayPath(cwd)} />
        <div className="relative flex-1">
          <div
            aria-hidden
            className="min-h-[1.625em] whitespace-pre-wrap break-words"
          >
            <span>{input}</span>
            <span className="text-zinc-400">{ghost}</span>
            {"​"}
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => changeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Terminal input"
            className="absolute inset-0 resize-none overflow-hidden whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-mono text-[15px] leading-relaxed text-transparent caret-zinc-800 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
