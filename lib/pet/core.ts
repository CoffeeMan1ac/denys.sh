// Shared brain + look for the pet. The terminal Pet and the on-page CornerPet
// both use this so they behave as one creature: same name, mood, and face.
// No React here, just logic. The localStorage helpers merge rather than
// overwrite, so neither surface wipes fields it doesn't own (e.g. the corner
// won't clobber the terminal's focus session).

export const PET_KEY = "terminal:pet";

export type PetSave = {
  name?: string;
  affection?: number;
  lastSeen?: number;
  // Owned by the terminal; the corner leaves this untouched.
  focus?: unknown;
};

// timing / mood (ms)
export const BOOP_MS = 1300;
export const STARTLE_MS = 600;
export const DIZZY_MS = 2600; // cool-down after overstimulation
export const MISSED_SHOW_MS = 3500;
export const BORED_MS = 12000;
export const SLEEPY_MS = 22000;
export const ASLEEP_MS = 32000;
export const AFFECTION_DECAY_MS = 200000; // time for mood to drift 1 → 0 if left alone
export const BOOP_BOOST = 0.34;
export const DIZZY_PENALTY = 0.1;
export const OVERSTIM_WINDOW = 2500;
export const OVERSTIM_COUNT = 5;
export const IDLE_MIN_GAP = 6000;
export const IDLE_MAX_GAP = 13000;
export const IDLE_ANIM_MS = 1600;
export const MISSED_AWAY_MS = 3 * 60 * 60 * 1000; // gone > 3h → "missed you"
export const CHAT_MAX = 280; // matches the /api/pet route's MAX_INPUT
export const SPEECH_MIN_MS = 4000;
export const SPEECH_MAX_MS = 14000;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Affection decays over time; work out its current value from the last set point.
export function liveAffection(value: number, at: number, now: number) {
  return clamp(value - (now - at) / AFFECTION_DECAY_MS, 0, 1);
}

// Energy from the wall clock: ~0 at 3am, ~1 at 3pm. Shifts how soon it dozes.
export function energyAt(now: number) {
  const d = new Date(now);
  const hour = d.getHours() + d.getMinutes() / 60;
  return 0.5 - 0.5 * Math.cos((hour - 3) * (Math.PI / 12));
}
export const idleScale = (now: number) => 0.6 + 0.6 * energyAt(now);

export const IDLE_TYPES = ["yawn", "stretch", "chase"] as const;
export type IdleType = (typeof IDLE_TYPES)[number];
export function pickIdle(energy: number): IdleType {
  const r = Math.random();
  if (energy < 0.4) return r < 0.45 ? "yawn" : r < 0.85 ? "stretch" : "chase";
  if (energy > 0.7) return r < 0.45 ? "chase" : r < 0.85 ? "stretch" : "yawn";
  return r < 0.34 ? "yawn" : r < 0.67 ? "stretch" : "chase";
}

// Boop reactions, picked at random so it doesn't feel canned. Every face is
// 7 chars wide so the creature doesn't shift sideways.
export const BOOP_REACTIONS = [
  { eyes: "( ^o^ )", tag: "~prrr" },
  { eyes: "( ^v^ )", tag: "nya~" },
  { eyes: "( owo )", tag: "!" },
  { eyes: "( ^_^ )", tag: "♪" },
  { eyes: "( =w= )", tag: "~mrr" },
];

// persistence (merge, so the two surfaces don't overwrite each other)
export function loadPet(): PetSave | null {
  try {
    const raw = window.localStorage.getItem(PET_KEY);
    return raw ? (JSON.parse(raw) as PetSave) : null;
  } catch {
    return null;
  }
}
export function savePet(patch: PetSave) {
  try {
    const prev = loadPet() ?? {};
    window.localStorage.setItem(PET_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    // ignore storage failure
  }
}

// face
export type FacePart = { text: string; tone: string } | null;
export type Face = {
  ears: string;
  eyes: string;
  paws: string;
  tag: FacePart;
  bubble: FacePart;
};
export type Mood = "content" | "neutral" | "lonely";
export const moodFor = (aff: number): Mood =>
  aff >= 0.66 ? "content" : aff < 0.33 ? "lonely" : "neutral";

// Single source of truth for the face. Both surfaces pass in a phase + context
// and render the returned parts the same way.
export function petFace(
  phase: string,
  ctx: { now: number; mood: Mood; blink: boolean; twitch: boolean; reaction: number },
): Face {
  const { now, mood, blink, twitch, reaction } = ctx;
  let ears = twitch ? " /\\,/\\ " : " /\\_/\\ ";
  let paws = " (  ^  ) ";
  let eyes: string;
  let tag: FacePart = null;
  let bubble: FacePart = null;

  switch (phase) {
    case "missed":
      eyes = "( ^o^ )";
      tag = { text: "missed you!", tone: "text-emerald-600 dark:text-emerald-400" };
      bubble = { text: "  ♥", tone: "text-pink-500" };
      break;
    case "dizzy":
      eyes = "( @_@ )";
      tag = { text: "~grr", tone: "text-amber-600 dark:text-amber-400" };
      break;
    case "special":
      eyes = "( *o* )";
      tag = { text: "✧!", tone: "text-violet-600 dark:text-violet-400" };
      bubble = { text: "✦ ✧ ✦", tone: "text-violet-500" };
      break;
    case "booped": {
      const r = BOOP_REACTIONS[reaction];
      eyes = r.eyes;
      tag = { text: r.tag, tone: "text-emerald-600 dark:text-emerald-400" };
      bubble = { text: "  ♥   ♥", tone: "text-pink-500" };
      break;
    }
    case "startled":
      eyes = "( O.O )";
      tag = { text: "!", tone: "text-amber-600 dark:text-amber-400" };
      break;
    case "idle-yawn":
      eyes = "( o3o )";
      tag = { text: "~yawn", tone: "text-zinc-400" };
      bubble = { text: "  o", tone: "text-zinc-300 dark:text-zinc-600" };
      break;
    case "idle-stretch":
      eyes = "( =_= )";
      paws = " (~ ^ ~) ";
      tag = { text: "~stretch", tone: "text-zinc-400" };
      break;
    case "idle-chase":
      eyes = Math.floor(now / 180) % 2 ? "( >o> )" : "( <o< )";
      tag = { text: "~whee", tone: "text-zinc-400" };
      break;
    case "asleep":
      ears = " /\\_/\\ ";
      eyes = "( u_u )";
      bubble = { text: "z Z z", tone: "text-sky-400" };
      break;
    case "sleepy":
      eyes = "( -.- )";
      bubble = { text: "  z", tone: "text-sky-300" };
      break;
    case "bored":
      eyes = "( -_- )";
      break;
    case "talking":
      eyes = "( o.o )"; // listening
      break;
    case "thinking":
      eyes = "( o.- )"; // thinking it over
      break;
    default:
      // awake: mood shows in the eyes
      if (blink) eyes = "( -.- )";
      else if (mood === "content") eyes = "( ^.^ )";
      else if (mood === "lonely") eyes = "( ._. )";
      else eyes = "( o.o )";
  }
  return { ears, eyes, paws, tag, bubble };
}

// Reading time for a reply bubble, scaled by length.
export const speechMs = (text: string) =>
  clamp(text.length * 90, SPEECH_MIN_MS, SPEECH_MAX_MS);

// chat (talks to /api/pet)
// Shared by both pets so the request contract lives in one place and can't drift.
export const CHAT_WINDOW = 6; // how many recent messages we send as context
export const CHAT_KEEP = 12; // how many we keep locally; only the last window is sent

export type ChatMsg = { role: "user" | "assistant"; content: string };

// Full conversation for the transcript panel either pet can open. Module state,
// so it's in-memory only and resets on reload; intentionally not persisted, and
// separate from the bounded window we send the model. Kept here so both pets
// show the same running conversation.
const sessionTranscript: ChatMsg[] = [];
export const transcript = (): readonly ChatMsg[] => sessionTranscript;
export const pushTranscript = (msg: ChatMsg) => sessionTranscript.push(msg);

// POST the recent window to /api/pet and stream the reply back. On success the
// route streams plain text; on error it returns the same plain-text body (a
// "nap" line) with a non-2xx status, so we read every response the same way.
// onChunk fires with the accumulated text as it grows (use it to drive the
// speech bubble). page is the visitor's pathname, for page-aware replies.
// Returns the final text and whether it's a real answer worth remembering.
export type PetSurface = "terminal" | "corner";

export async function talkToPet(
  name: string,
  history: ChatMsg[],
  opts: { page?: string | null; surface?: PetSurface; onChunk?: (full: string) => void } = {},
): Promise<{ text: string; remember: boolean }> {
  try {
    const res = await fetch("/api/pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        page: opts.page ?? null,
        surface: opts.surface ?? null,
        messages: history.slice(-CHAT_WINDOW),
      }),
    });
    const reader = res.body?.getReader();
    if (!reader) {
      const t = (await res.text().catch(() => "")).trim();
      return { text: t || "…?", remember: res.ok && !!t };
    }
    const decoder = new TextDecoder();
    let full = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      opts.onChunk?.(full);
    }
    full = (full + decoder.decode()).trim();
    if (full) opts.onChunk?.(full);
    return { text: full || "…?", remember: res.ok && !!full };
  } catch {
    return { text: "(couldn’t reach me — try again)", remember: false };
  }
}
