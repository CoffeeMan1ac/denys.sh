"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { useTerminal } from "./TerminalProvider";
import TerminalView from "./TerminalView";

// The terminal as a small popup over the current page, with the page blurred
// behind it. Mounted once in the root layout, so it's available on every route.
// The window can be resized (native CSS resize handle, bottom right) and dragged
// by its title bar.

export default function TerminalPopup() {
  const { isOpen, close, exit } = useTerminal();
  const pathname = usePathname();
  const router = useRouter();

  // Drag offset from the centered origin, and the in-flight drag anchor.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(
    null,
  );

  // The window element and its remembered size. `offset` (state) and `sizeRef`
  // both survive close→reopen (the popup stays mounted) but reset on a full page
  // refresh, so within a session the terminal reopens at the same place and size.
  // Size is a ref written straight to the element's inline style, never
  // React-controlled: applying a stored size through `style` on every render let
  // a drag re-render snap the window back to a stale size, so it now stays in the
  // DOM where native resize leaves it, and we only read it back at close.
  const windowRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<{ w: number; h: number } | null>(null);

  // Open/close are gradual: `render` keeps the popup mounted through the closing
  // animation; `visible` toggles the from/to of a subtle scale + fade. On open
  // we mount first (hidden), then flip `visible` on the next frame so the
  // transition has a start state to animate from. On close we drop `visible`,
  // then unmount once the animation has had time to play.
  const ANIM_MS = 200;
  const [render, setRender] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      return;
    }
    // Remember how big the window was, just before it animates out.
    const el = windowRef.current;
    if (el) sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
    setVisible(false);
    const id = window.setTimeout(() => setRender(false), ANIM_MS);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (!render) return;
    // Mounted hidden; flip to visible next frame to kick off the open animation.
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [render]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Lock background scroll while the popup is open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Re-apply the remembered size when the window mounts on open, written to the
  // element directly (the window carries no React `style` for width/height) so
  // the native resize handle stays in control afterwards. The window is still
  // opacity-0 at this point, so there's no flash of the default size.
  useEffect(() => {
    if (!render) return;
    const el = windowRef.current;
    if (el && sizeRef.current) {
      el.style.width = `${sizeRef.current.w}px`;
      el.style.height = `${sizeRef.current.h}px`;
    }
  }, [render]);

  function onDragPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't start a drag from the close button.
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDragPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
  }
  function onDragPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  // The popup is redundant on the fullscreen terminal route.
  if (pathname === "/terminal" || !render) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      {/* Drag offset lives on this wrapper so it never collides with the
          window's own scale transform during the open/close animation. */}
      <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        <div
          ref={windowRef}
          className={`flex h-[480px] max-h-[90vh] min-h-[220px] w-[44rem] min-w-[320px] max-w-[95vw] resize flex-col overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-2xl ring-1 ring-black/5 transition duration-200 ease-out ${
            visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <TitleBar
            onExit={exit}
            onClose={close}
            onMaximize={() => router.push("/terminal")}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
          />
          <div className="min-h-0 flex-1">
            <TerminalView />
          </div>
        </div>
      </div>
    </div>
  );
}

// macOS-style title bar with three working traffic lights and a drag handle:
//   red    → exit (wipe the session and close, same as the `exit` command)
//   yellow → close, keeping the session (same as clicking outside / Escape)
//   green  → open the fullscreen terminal in this tab
function TitleBar({
  onExit,
  onClose,
  onMaximize,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onExit: () => void;
  onClose: () => void;
  onMaximize: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="flex cursor-move touch-none select-none items-center gap-2 border-b border-zinc-200 bg-zinc-100 px-3 py-2"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit terminal"
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
          onClick={onClose}
          aria-label="Close terminal"
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
          onClick={onMaximize}
          aria-label="Open fullscreen terminal"
          className="group grid h-3 w-3 place-items-center rounded-full bg-emerald-300 hover:bg-emerald-400"
        >
          <Icon
            icon="mdi:arrow-expand"
            className="h-2 w-2 text-emerald-900/0 group-hover:text-emerald-900/70"
            aria-hidden
          />
        </button>
      </div>
      <span className="flex-1 text-center font-mono text-xs text-zinc-500">
        guest@denys.sh — terminal
      </span>
      {/* Spacer balancing the traffic lights so the title stays centered. */}
      <span className="w-[52px]" aria-hidden />
    </div>
  );
}
