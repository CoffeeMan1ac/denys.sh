"use client";

import { useEffect, useState } from "react";

export default function LocalTime() {
  // Placeholder until the client clock is read, so the slot keeps its width on
  // first paint.
  const [time, setTime] = useState("--:--");

  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("en-IE", {
          timeZone: "Europe/Dublin",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span suppressHydrationWarning className="text-sm text-zinc-500">
      Dublin {time}
    </span>
  );
}
