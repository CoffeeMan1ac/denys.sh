"use client";

import { useEffect, useState } from "react";

// How many px of the layout viewport the on-screen keyboard covers, via the
// VisualViewport API. Safari overlays the keyboard instead of resizing the
// layout viewport (it ignores interactive-widget), so bottom-fixed surfaces
// must lift themselves by this much. 0 when the keyboard is closed or when the
// browser already resizes the layout viewport (then innerHeight shrinks too).
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () =>
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, [active]);

  return inset;
}
