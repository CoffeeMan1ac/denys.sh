"use client";

import { useEffect, useState } from "react";

// The free-floating pet is centered in the right gutter beside the max-w-5xl
// content column, equal clearance to the cards and to the viewport edge. Below
// this cap the gutter gets too thin: the widest thing there is the "psst name
// me" nudge at ~283px, and its clearance drops ~25px per 100px of width, so we
// dock around ~50px of clearance rather than let it squish into the content.
// It then leaves the corner to ride in the nav. Rough cap, tune to taste.
export const PET_DOCK_MAX = 1750;

// Midpoint of that right gutter, as a CSS value, measured to the *visible*
// content edge: the max-w-5xl column (1024px) minus its px-6 (24px) padding, so
// the cards' right edge sits at 50vw + 488px and the gutter midpoint at
// 75vw + 244px. Pair with translateX(-50%).
export const PET_GUTTER_CENTER = "calc(75vw + 244px)";

export function usePetDocked() {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PET_DOCK_MAX}px)`);
    const sync = () => setDocked(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return docked;
}
