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

// Small cosmetic worn above the head on a few holidays.
export function holidayTopper(now: number): string | null {
  const d = new Date(now);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 12 && day === 31) || (m === 1 && day === 1)) return "🎉";
  if (m === 10 && day === 31) return "🎃";
  if (m === 7 && day === 4) return "🎆";
  if (m === 12 && (day === 24 || day === 25)) return "🎄";
  return null;
}

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
      tag = { text: "missed you!", tone: "text-emerald-600" };
      bubble = { text: "  ♥", tone: "text-pink-500" };
      break;
    case "dizzy":
      eyes = "( @_@ )";
      tag = { text: "~grr", tone: "text-amber-600" };
      break;
    case "special":
      eyes = "( *o* )";
      tag = { text: "✧!", tone: "text-violet-600" };
      bubble = { text: "✦ ✧ ✦", tone: "text-violet-500" };
      break;
    case "booped": {
      const r = BOOP_REACTIONS[reaction];
      eyes = r.eyes;
      tag = { text: r.tag, tone: "text-emerald-600" };
      bubble = { text: "  ♥   ♥", tone: "text-pink-500" };
      break;
    }
    case "startled":
      eyes = "( O.O )";
      tag = { text: "!", tone: "text-amber-600" };
      break;
    case "idle-yawn":
      eyes = "( o3o )";
      tag = { text: "~yawn", tone: "text-zinc-400" };
      bubble = { text: "  o", tone: "text-zinc-300" };
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
    default:
      // awake: mood shows in the eyes
      if (blink) eyes = "( -.- )";
      else if (mood === "content") eyes = "( ^.^ )";
      else if (mood === "lonely") eyes = "( ._. )";
      else eyes = "( o.o )";
  }
  return { ears, eyes, paws, tag, bubble };
}
