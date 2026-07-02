"use client";

import { Icon } from "@/app/components/Icon";
import { useTerminal } from "./TerminalProvider";

// Opens the terminal popup. Two presentations so the same control fits the
// header nav (text) and the glass dock (icon).

export default function TerminalTrigger({
  variant,
}: {
  variant: "nav" | "dock";
}) {
  const { open } = useTerminal();

  if (variant === "dock") {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Terminal (Ctrl+`)"
        title="Terminal (Ctrl+`)"
        className="cursor-pointer rounded-full p-1.5 text-zinc-500 transition hover:bg-white/60 hover:text-black"
      >
        <Icon icon="mdi:console-line" className="h-5 w-5" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      title="Terminal (Ctrl+`)"
      className="cursor-pointer hover:text-black"
    >
      Terminal
    </button>
  );
}
