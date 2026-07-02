import type { Metadata } from "next";
import TerminalScreen from "@/app/components/terminal/TerminalScreen";

// The fullscreen terminal route.
export const metadata: Metadata = {
  // The hostname as the browser-tab title (absolute, so it isn't wrapped in the
  // "%s · denys.sh" template the rest of the site uses).
  title: { absolute: "guest@denys.sh" },
  alternates: { canonical: "/terminal" },
};

export default function TerminalPage() {
  return <TerminalScreen />;
}
