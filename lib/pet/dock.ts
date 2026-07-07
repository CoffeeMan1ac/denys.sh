"use client";

import { useEffect, useState } from "react";

// Between the phone breakpoint (640px) and wide screens, the free-floating pet
// is anchored to the viewport's right edge (right-32), so as the window narrows
// it marches into the max-w-5xl content column. Instead we center it in the
// right gutter beside that column (equal clearance to the cards and to the
// viewport edge). Below this cap the gutter is too thin to hold it (the reply
// bubble reaches ~240px), so it leaves the corner and rides in the nav instead.
// Rough cap, tune to taste.
export const PET_DOCK_MAX = 1560;

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
