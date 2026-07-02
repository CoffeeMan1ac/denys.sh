"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { useTerminal } from "./TerminalProvider";
import TerminalView from "./TerminalView";

// The fullscreen terminal rendered at /terminal. It shares the same session as
// the popup (same provider), so history and scores carry over.

export default function TerminalScreen() {
  const router = useRouter();
  const { open } = useTerminal();

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white">
      {/* Traffic lights, the mirror image of the popup's:
            red    → back to the main page (closes the fullscreen)
            yellow → main page with the popup terminal open (minimize to it)
            green  → reload this screen (effectively a refresh) */}
      <div className="flex items-center border-b border-zinc-200 bg-zinc-100 px-4 py-2">
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Back to main page"
            className="group grid h-3 w-3 place-items-center rounded-full bg-red-400 hover:bg-red-500"
          >
            <Icon
              icon="mdi:close"
              className="h-2 w-2 text-red-900/0 group-hover:text-red-900/70"
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => {
              open();
              router.push("/");
            }}
            aria-label="Minimise to popup terminal"
            className="group grid h-3 w-3 place-items-center rounded-full bg-amber-300 hover:bg-amber-400"
          >
            <Icon
              icon="mdi:minus"
              className="h-2 w-2 text-amber-900/0 group-hover:text-amber-900/70"
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Reload terminal"
            className="group grid h-3 w-3 place-items-center rounded-full bg-emerald-300 hover:bg-emerald-400"
          >
            <Icon
              icon="mdi:refresh"
              className="h-2 w-2 text-emerald-900/0 group-hover:text-emerald-900/70"
              aria-hidden
            />
          </button>
        </span>
        <span className="flex-1 text-center font-mono text-xs text-zinc-500">
          guest@denys.sh — terminal
        </span>
        <span className="w-[52px]" aria-hidden />
      </div>
      <div className="min-h-0 flex-1">
        <TerminalView />
      </div>
    </div>
  );
}
