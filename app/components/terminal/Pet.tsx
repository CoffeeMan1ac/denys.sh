"use client";

import { useEffect, useRef, useState } from "react";

// A tiny ASCII companion inside the terminal. Mood decays when ignored and
// recovers when booped, it's livelier by day and dozier at night, does small
// idle animations on its own, gets dizzy if spammed, and remembers its name and
// mood between sessions (a long gap earns a "missed you"). Space boops, n names,
// q quits.

// timing / tuning (ms)
const BOOP_MS = 1300;
const STARTLE_MS = 600;
const DIZZY_MS = 2600; // cool-down after overstimulation
const MISSED_SHOW_MS = 3500; // how long the "missed you" greeting shows

const BORED_MS = 12000; // idle → bored (base; scaled by time-of-day energy)
const SLEEPY_MS = 22000; // idle → sleepy
const ASLEEP_MS = 32000; // idle → asleep

const AFFECTION_DECAY_MS = 200000; // time for mood to drift 1 → 0 if left alone
const BOOP_BOOST = 0.34;
const DIZZY_PENALTY = 0.1;

const OVERSTIM_WINDOW = 2500; // this many boops…
const OVERSTIM_COUNT = 5; // …within the window → dizzy/grumpy

const IDLE_MIN_GAP = 6000; // spacing between unprompted idle animations
const IDLE_MAX_GAP = 13000;
const IDLE_ANIM_MS = 1600;

const MISSED_AWAY_MS = 3 * 60 * 60 * 1000; // gone > 3h → "missed you" on return

const NAME_MIN = 2;
const NAME_MAX = 16;
const NAME_ALLOWED = /[^\p{L}\p{N} _-]/gu;
const PET_KEY = "terminal:pet";

// Boop reactions, picked at random so it doesn't feel canned. Every face is
// 7 chars wide so the creature doesn't shift sideways.
const BOOP_REACTIONS = [
  { eyes: "( ^o^ )", tag: "~prrr" },
  { eyes: "( ^v^ )", tag: "nya~" },
  { eyes: "( owo )", tag: "!" },
  { eyes: "( ^_^ )", tag: "♪" },
  { eyes: "( =w= )", tag: "~mrr" },
];

// Rare easter eggs, rolled on a happy boop.
const EGG_SPECIAL_CHANCE = 0.05; // 1 in 20 → a sparkly special reaction
const EGG_CURSOR_CHANCE = 0.02; // 1 in 50 → swaps the site cursor (this session)
const PAW_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="26" font-size="26">🐾</text></svg>',
)}") 16 24, auto`;

const IDLE_TYPES = ["yawn", "stretch", "chase"] as const;
type IdleType = (typeof IDLE_TYPES)[number];

// Ambient "weather" that drifts through occasionally. Not real weather (no API);
// the type and timing are picked at random, not tied to the date.
const WEATHER_TYPES = ["snow", "rain", "sparkle"] as const;
type WeatherType = (typeof WEATHER_TYPES)[number];
const WEATHER: Record<
  WeatherType,
  {
    behavior: "fall" | "twinkle";
    chance: number; // spawn probability per tick while active
    chars: string[];
    tone: string;
    dur: [number, number]; // particle lifetime range (ms)
  }
> = {
  snow: { behavior: "fall", chance: 0.35, chars: ["❄", "*", "·"], tone: "text-sky-300", dur: [5000, 8000] },
  rain: { behavior: "fall", chance: 0.7, chars: ["│", "|"], tone: "text-sky-400", dur: [1400, 2200] },
  sparkle: { behavior: "twinkle", chance: 0.3, chars: ["✦", "✧", "·", "+"], tone: "text-amber-300", dur: [1400, 2400] },
};
const WEATHER_MIN_GAP = 18000;
const WEATHER_MAX_GAP = 40000;
const WEATHER_MIN_DUR = 7000;
const WEATHER_MAX_DUR = 14000;
const MAX_PARTICLES = 16;

// A butterfly that occasionally flutters across while the pet is awake and
// watches it. The body glyph flaps between two frames, both 3 chars so it
// doesn't jitter.
const VISITOR_MIN_GAP = 45000;
const VISITOR_MAX_GAP = 120000;
const VISITOR_MIN_DUR = 7000;
const VISITOR_MAX_DUR = 10000;
const VISITOR_FRAMES = ["}Ӝ{", ")Ӝ("];

type Particle = {
  id: number;
  left: number; // %
  top: number; // % (twinkle only; fall is driven by the keyframe)
  dur: number;
  char: string;
  behavior: "fall" | "twinkle";
  tone: string;
  spawnAt: number;
};

type PetSave = {
  name: string;
  affection: number;
  lastSeen: number;
  focus?: FocusSession | null;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Energy from the wall clock: ~0 at 3am, ~1 at 3pm. Only a bias: it shifts how
// soon the pet dozes and what it does idly, but you can always boop it awake.
function energyAt(now: number) {
  const d = new Date(now);
  const hour = d.getHours() + d.getMinutes() / 60;
  return 0.5 - 0.5 * Math.cos((hour - 3) * (Math.PI / 12));
}
// Scales the idle→sleep thresholds: dozes ~40% sooner at night, ~20% later by day.
const idleScale = (now: number) => 0.6 + 0.6 * energyAt(now);

// Pick an idle animation, biased by energy (low → yawn/stretch, high → chase).
function pickIdle(energy: number): IdleType {
  const r = Math.random();
  if (energy < 0.4) return r < 0.45 ? "yawn" : r < 0.85 ? "stretch" : "chase";
  if (energy > 0.7) return r < 0.45 ? "chase" : r < 0.85 ? "stretch" : "yawn";
  return r < 0.34 ? "yawn" : r < 0.67 ? "stretch" : "chase";
}

// Small cosmetic worn above the head on a few holidays.
function holidayTopper(now: number): string | null {
  const d = new Date(now);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if ((m === 12 && day === 31) || (m === 1 && day === 1)) return "🎉"; // New Year
  if (m === 10 && day === 31) return "🎃"; // Halloween
  if (m === 7 && day === 4) return "🎆"; // Independence Day
  if (m === 12 && (day === 24 || day === 25)) return "🎄"; // Christmas
  return null;
}

// focus / pomodoro
// A configurable Pomodoro the pet sits with you through. Block lengths are the
// user's to set, and timing is wall-clock so a backgrounded tab or reopened
// terminal stays accurate.
type FocusPhase = "work" | "short" | "long";
type FocusConfig = {
  task: string;
  workMin: number;
  shortMin: number;
  longMin: number;
  blocks: number; // work blocks between long breaks
};
type FocusSession = {
  config: FocusConfig;
  phase: FocusPhase;
  endAt: number; // wall-clock end of the running phase
  remainingMs: number; // frozen time left while paused
  paused: boolean;
  completed: number; // work blocks finished this session
};
type SetupField = "task" | "workMin" | "shortMin" | "longMin" | "blocks";
const SETUP_FIELDS: SetupField[] = ["task", "workMin", "shortMin", "longMin", "blocks"];
const FOCUS_DEFAULTS = { workMin: 25, shortMin: 5, longMin: 15, blocks: 4 };
type SetupDraft = typeof FOCUS_DEFAULTS & { task: string; field: number };
const FOCUS_LIMITS: Record<
  Exclude<SetupField, "task">,
  { min: number; max: number; step: number }
> = {
  workMin: { min: 5, max: 90, step: 5 },
  shortMin: { min: 1, max: 30, step: 1 },
  longMin: { min: 5, max: 45, step: 5 },
  blocks: { min: 2, max: 8, step: 1 },
};
const TASK_MAX = 40;
const TASK_ALLOWED = /[^\p{L}\p{N} .,!?'’&+/_-]/gu;
const FLASH_MS = 700; // block-complete screen flash
const SHUSH_MS = 1000; // "not now" rebuff when booped mid-work
const FOCUS_CATCHUP_CAP = 16; // phases to reconstruct on resume before giving up

const phaseMinutes = (c: FocusConfig, p: FocusPhase) =>
  p === "work" ? c.workMin : p === "short" ? c.shortMin : c.longMin;
const phaseLabel = (p: FocusPhase) =>
  p === "work" ? "focus" : p === "short" ? "short break" : "long break";

// mm:ss for the countdown.
function fmtClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Pet({
  onExit,
  autoName = false,
  onAutoNameConsumed,
}: {
  onExit: () => void;
  // From the corner pet's "name me" nudge: open the naming screen on mount,
  // as if `n` was pressed.
  autoName?: boolean;
  onAutoNameConsumed?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const now0 = Date.now();
  const lastInteraction = useRef(now0);
  const boopUntil = useRef(0);
  const startleUntil = useRef(0);
  const overstimUntil = useRef(0);
  const missUntil = useRef(0);
  const specialUntil = useRef(0); // rare easter-egg reaction window
  const cursorEgg = useRef(false); // whether the cursor swap has fired
  const recentBoops = useRef<number[]>([]);
  const reaction = useRef(0); // current boop reaction index
  const lastReaction = useRef(-1);
  // Mood decays over time: its value plus when it was set.
  const affection = useRef({ value: 0.5, at: now0 });
  const idleType = useRef<IdleType | null>(null);
  const idleUntil = useRef(0);
  const nextIdleAt = useRef(now0 + 7000);
  const blinkOffset = useRef(Math.random() * 3000);
  const twitchOffset = useRef(Math.random() * 5000);
  const bump = useRef({ x: 0, until: 0 }); // brief sideways hop on terminal resize
  const weather = useRef<{ type: WeatherType | null; until: number }>({
    type: null,
    until: 0,
  });
  const nextWeatherAt = useRef(now0 + 4000 + Math.random() * 8000);
  const particleId = useRef(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const visitor = useRef<{
    id: number;
    startAt: number;
    dur: number;
    dir: "ltr" | "rtl";
  } | null>(null);
  const nextVisitorAt = useRef(now0 + 20000 + Math.random() * 30000);
  const visitorId = useRef(0);

  // Focus session lives in a ref (source of truth for the tick + render). The
  // setup form and quit-confirmation are interactive, so they're state.
  const focusRef = useRef<FocusSession | null>(null);
  const flashUntil = useRef(0);
  const shushUntil = useRef(0);
  const cheerUntil = useRef(0);
  const [setup, setSetup] = useState<SetupDraft | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const setupPanelRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef(false);
  const confirmRef = useRef(false);
  const setupActive = setup !== null;
  useEffect(() => {
    setupRef.current = setupActive;
  }, [setupActive]);
  useEffect(() => {
    confirmRef.current = confirmQuit;
  }, [confirmQuit]);
  useEffect(() => {
    if (setupActive) setupPanelRef.current?.focus();
  }, [setupActive]);

  const [name, setName] = useState("");
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");

  // Refs mirroring state, so interval closures read current values, not stale ones.
  const nameRef = useRef("");
  const namingRef = useRef(false);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);
  useEffect(() => {
    namingRef.current = naming;
  }, [naming]);

  // Handle the autoName nudge: open the naming screen on mount, as if `n` was
  // pressed. Runs once.
  useEffect(() => {
    if (!autoName) return;
    setDraft("");
    setNaming(true);
    onAutoNameConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [, setTick] = useState(0);

  function liveAffection(now: number) {
    const a = affection.current;
    return clamp(a.value - (now - a.at) / AFFECTION_DECAY_MS, 0, 1);
  }
  function setAffection(value: number, at: number) {
    affection.current = { value: clamp(value, 0, 1), at };
  }

  // persistence (localStorage; survives refresh)
  function save() {
    try {
      const now = Date.now();
      let petName = nameRef.current;
      if (!petName) {
        // Don't overwrite a stored name with an empty one, e.g. a save firing
        // (including StrictMode's dev double-mount) before the stored name has
        // loaded into the ref.
        const raw = window.localStorage.getItem(PET_KEY);
        const prev = raw ? JSON.parse(raw) : null;
        if (typeof prev?.name === "string") petName = prev.name;
      }
      const payload: PetSave = {
        name: petName,
        affection: liveAffection(now),
        lastSeen: now,
        focus: focusRef.current,
      };
      window.localStorage.setItem(PET_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failure
    }
  }

  // Load remembered state, decay mood across the absence, and greet on return.
  useEffect(() => {
    const now = Date.now();
    try {
      const raw = window.localStorage.getItem(PET_KEY);
      const s: Partial<PetSave> | null = raw ? JSON.parse(raw) : null;
      if (s) {
        if (typeof s.name === "string") {
          setName(s.name);
          nameRef.current = s.name; // keep the ref in sync immediately
        }
        const away = now - (typeof s.lastSeen === "number" ? s.lastSeen : now);
        const stored = typeof s.affection === "number" ? s.affection : 0.5;
        setAffection(stored - away / AFFECTION_DECAY_MS, now);
        if (away > MISSED_AWAY_MS) {
          missUntil.current = now + MISSED_SHOW_MS;
          lastInteraction.current = now; // arriving counts as activity
        }

        // Revive a focus session. A still-running phase just resumes (wall-clock
        // timing); phases that elapsed while away are replayed up to a cap,
        // beyond which the session is too stale and we drop it.
        const sf = s.focus;
        if (sf && sf.config && typeof sf.endAt === "number") {
          let revived: FocusSession | null = sf;
          if (!sf.paused && now >= sf.endAt) {
            let guard = 0;
            while (
              revived &&
              !revived.paused &&
              now >= revived.endAt &&
              guard < FOCUS_CATCHUP_CAP
            ) {
              const f = revived;
              const base = f.endAt;
              if (f.phase === "work") {
                f.completed += 1;
                f.phase = f.completed % f.config.blocks === 0 ? "long" : "short";
              } else {
                f.phase = "work";
              }
              const ms = phaseMinutes(f.config, f.phase) * 60000;
              f.endAt = base + ms;
              f.remainingMs = ms;
              guard += 1;
            }
            if (revived && now >= revived.endAt) revived = null;
          }
          focusRef.current = revived;
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Save periodically and on unmount so lastSeen stays fresh.
  useEffect(() => {
    const id = window.setInterval(save, 5000);
    return () => {
      window.clearInterval(id);
      save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulation tick: drives re-renders and schedules unprompted idle animations.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();

      // Focus engine: advance phases as their wall-clock time elapses. Ambient
      // effects are held back during a work block and allowed again on breaks.
      {
        const f = focusRef.current;
        if (f && !f.paused && now >= f.endAt) advanceFocus(now);
      }
      const suppress =
        setupRef.current ||
        confirmRef.current ||
        (!!focusRef.current && focusRef.current.phase === "work");

      if (idleUntil.current && now >= idleUntil.current) {
        idleType.current = null;
        idleUntil.current = 0;
      } else if (
        !idleType.current &&
        !suppress &&
        now >= nextIdleAt.current &&
        !namingRef.current &&
        now >= boopUntil.current &&
        now >= startleUntil.current &&
        now >= overstimUntil.current &&
        now >= missUntil.current &&
        now - lastInteraction.current < BORED_MS * idleScale(now)
      ) {
        idleType.current = pickIdle(energyAt(now));
        idleUntil.current = now + IDLE_ANIM_MS;
        nextIdleAt.current =
          now + IDLE_ANIM_MS + IDLE_MIN_GAP + Math.random() * (IDLE_MAX_GAP - IDLE_MIN_GAP);
      }

      // Weather lifecycle: drift in occasionally, then clear. While suppressed
      // (setup / work block) any active weather is cleared immediately.
      const w = weather.current;
      if (w.type && (suppress || now >= w.until)) {
        weather.current = { type: null, until: 0 };
        nextWeatherAt.current =
          now + WEATHER_MIN_GAP + Math.random() * (WEATHER_MAX_GAP - WEATHER_MIN_GAP);
      } else if (!w.type && !suppress && now >= nextWeatherAt.current) {
        const type = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
        weather.current = {
          type,
          until: now + WEATHER_MIN_DUR + Math.random() * (WEATHER_MAX_DUR - WEATHER_MIN_DUR),
        };
      }

      // Butterfly: flutters across now and then, but only before the pet gets
      // sleepy (below the SLEEPY_MS threshold), so it won't appear during a nap.
      const v = visitor.current;
      if (v && (suppress || now >= v.startAt + v.dur)) {
        visitor.current = null;
        nextVisitorAt.current =
          now + VISITOR_MIN_GAP + Math.random() * (VISITOR_MAX_GAP - VISITOR_MIN_GAP);
      } else if (
        !v &&
        !suppress &&
        now >= nextVisitorAt.current &&
        !namingRef.current &&
        now - lastInteraction.current < SLEEPY_MS * idleScale(now)
      ) {
        visitor.current = {
          id: visitorId.current++,
          startAt: now,
          dur: VISITOR_MIN_DUR + Math.random() * (VISITOR_MAX_DUR - VISITOR_MIN_DUR),
          dir: Math.random() < 0.5 ? "ltr" : "rtl",
        };
      }

      // Expire old particles and maybe spawn one for the active weather. While
      // suppressed, clear them so nothing competes with the task.
      setParticles((prev) => {
        if (suppress) return prev.length ? [] : prev;
        const kept = prev.filter((p) => now - p.spawnAt < p.dur);
        const type = weather.current.type;
        let next = kept;
        if (type && kept.length < MAX_PARTICLES) {
          const cfg = WEATHER[type];
          if (Math.random() < cfg.chance) {
            next = [
              ...kept,
              {
                id: particleId.current++,
                left: Math.random() * 100,
                top: 5 + Math.random() * 85,
                dur: cfg.dur[0] + Math.random() * (cfg.dur[1] - cfg.dur[0]),
                char: cfg.chars[Math.floor(Math.random() * cfg.chars.length)],
                behavior: cfg.behavior,
                tone: cfg.tone,
                spawnAt: now,
              },
            ];
          }
        }
        // Skip the state update when nothing actually changed.
        return next.length === prev.length && next.every((p, i) => p === prev[i])
          ? prev
          : next;
      });

      setTick((t) => t + 1);
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);
  useEffect(() => {
    if (naming) nameInputRef.current?.focus();
  }, [naming]);

  // Startle + hop when the terminal is resized around it.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false; // ignore the initial measurement
        return;
      }
      const now = Date.now();
      startleUntil.current = now + STARTLE_MS;
      lastInteraction.current = now; // a resize disturbs (and wakes) it
      bump.current = { x: (Math.random() * 2 - 1) * 18, until: now + 500 };
      setTick((t) => t + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rare boop egg: swap the whole site's cursor for this session.
  function triggerCursorEgg() {
    if (cursorEgg.current) return;
    cursorEgg.current = true;
    document.documentElement.style.cursor = PAW_CURSOR;
  }

  // Click the butterfly: it bursts into a scatter of stars and the pet startles.
  // Reuses the twinkle particles for the pop.
  function popButterfly(now: number, x: number, y: number) {
    const chars = ["✦", "✧", "★", "✨", "·", "+"];
    // Scatter each star to a random radius/angle around the pop, with varied
    // lifetimes so they don't all fade at once.
    const burst: Particle[] = Array.from({ length: 14 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.6) * 22; // bias outward
      return {
        id: particleId.current++,
        left: clamp(x + Math.cos(angle) * radius, 0, 100),
        top: clamp(y + Math.sin(angle) * radius * 1.1, 0, 100),
        dur: 450 + Math.random() * 1500,
        char: chars[Math.floor(Math.random() * chars.length)],
        behavior: "twinkle",
        tone: Math.random() < 0.5 ? "text-amber-300" : "text-violet-400",
        spawnAt: now,
      };
    });
    setParticles((prev) => [...prev, ...burst]);

    visitor.current = null; // the butterfly is gone
    nextVisitorAt.current =
      now + VISITOR_MIN_GAP + Math.random() * (VISITOR_MAX_GAP - VISITOR_MIN_GAP);
    startleUntil.current = now + STARTLE_MS; // the pop startles it
    lastInteraction.current = now; // and wakes it
    idleType.current = null;
    idleUntil.current = 0;
    setTick((t) => t + 1);
  }

  // focus session helpers
  function startFocusPhase(f: FocusSession, phase: FocusPhase, at: number) {
    const ms = phaseMinutes(f.config, phase) * 60000;
    f.phase = phase;
    f.endAt = at + ms;
    f.remainingMs = ms;
    f.paused = false;
  }
  function pauseFocus(now: number) {
    const f = focusRef.current;
    if (f && !f.paused) {
      f.remainingMs = f.endAt - now;
      f.paused = true;
    }
  }
  function resumeFocus(now: number) {
    const f = focusRef.current;
    if (f && f.paused) {
      f.endAt = now + f.remainingMs;
      f.paused = false;
    }
  }
  function endFocus() {
    focusRef.current = null;
    setConfirmQuit(false);
    save();
    rootRef.current?.focus();
    setTick((t) => t + 1);
  }
  // A burst of color when a work block completes.
  function spawnCelebration(now: number) {
    const chars = ["✦", "✧", "★", "✨", "♥", "♪"];
    const tones = [
      "text-emerald-400",
      "text-amber-300",
      "text-sky-400",
      "text-pink-400",
      "text-violet-400",
    ];
    const burst: Particle[] = Array.from({ length: 20 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.6) * 40;
      return {
        id: particleId.current++,
        left: clamp(50 + Math.cos(angle) * radius, 0, 100),
        top: clamp(34 + Math.sin(angle) * radius * 1.1, 0, 100),
        dur: 600 + Math.random() * 1600,
        char: chars[Math.floor(Math.random() * chars.length)],
        behavior: "twinkle",
        tone: tones[Math.floor(Math.random() * tones.length)],
        spawnAt: now,
      };
    });
    setParticles((prev) => [...prev, ...burst]);
  }
  // Move to the next phase when the current one's time runs out. Finishing a work
  // block celebrates and takes a long break every config.blocks blocks.
  function advanceFocus(now: number) {
    const f = focusRef.current;
    if (!f) return;
    if (f.phase === "work") {
      f.completed += 1;
      cheerUntil.current = now + BOOP_MS;
      flashUntil.current = now + FLASH_MS;
      spawnCelebration(now);
      startFocusPhase(f, f.completed % f.config.blocks === 0 ? "long" : "short", now);
    } else {
      startFocusPhase(f, "work", now);
    }
    lastInteraction.current = now;
    save();
    setTick((t) => t + 1);
  }
  function startSession(d: SetupDraft) {
    const task = d.task.trim();
    if (!task) {
      setSetup({ ...d, field: 0 }); // a task is required; jump back to it
      return;
    }
    const now = Date.now();
    const f: FocusSession = {
      config: {
        task,
        workMin: d.workMin,
        shortMin: d.shortMin,
        longMin: d.longMin,
        blocks: d.blocks,
      },
      phase: "work",
      endAt: 0,
      remainingMs: 0,
      paused: false,
      completed: 0,
    };
    startFocusPhase(f, "work", now);
    focusRef.current = f;
    setSetup(null);
    lastInteraction.current = now;
    idleType.current = null;
    idleUntil.current = 0;
    save();
    rootRef.current?.focus();
    setTick((t) => t + 1);
  }
  function adjustField(field: Exclude<SetupField, "task">, dir: number) {
    setSetup((d) => {
      if (!d) return d;
      const lim = FOCUS_LIMITS[field];
      return { ...d, [field]: clamp(d[field] + dir * lim.step, lim.min, lim.max) };
    });
  }
  function onSetupKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation(); // the panel owns the keyboard while configuring
    const d = setup;
    if (!d) return;
    const field = SETUP_FIELDS[d.field];
    if (e.key === "Escape" || (e.ctrlKey && e.key === "c")) {
      e.preventDefault();
      setSetup(null);
      rootRef.current?.focus();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      startSession(d);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSetup({ ...d, field: (d.field + SETUP_FIELDS.length - 1) % SETUP_FIELDS.length });
      return;
    }
    if (e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();
      setSetup({ ...d, field: (d.field + 1) % SETUP_FIELDS.length });
      return;
    }
    if (field === "task") {
      if (e.key === "Backspace") {
        e.preventDefault();
        setSetup({ ...d, task: d.task.slice(0, -1) });
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const ch = e.key.replace(TASK_ALLOWED, "");
        if (ch && d.task.length < TASK_MAX) setSetup({ ...d, task: d.task + ch });
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      adjustField(field, -1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      adjustField(field, +1);
    }
  }

  // interactions
  function registerBoop(now: number) {
    recentBoops.current = recentBoops.current.filter((t) => now - t < OVERSTIM_WINDOW);
    recentBoops.current.push(now);

    if (now < overstimUntil.current) return; // already dizzy: ignore

    if (recentBoops.current.length >= OVERSTIM_COUNT) {
      // Overstimulated: go dizzy and lose a little affection.
      overstimUntil.current = now + DIZZY_MS;
      recentBoops.current = [];
      setAffection(liveAffection(now) - DIZZY_PENALTY, now);
      return;
    }

    let r = Math.floor(Math.random() * BOOP_REACTIONS.length);
    if (r === lastReaction.current) r = (r + 1) % BOOP_REACTIONS.length;
    lastReaction.current = r;
    reaction.current = r;
    setAffection(liveAffection(now) + BOOP_BOOST, now);

    // Roll for the rare eggs; otherwise a normal happy boop.
    const roll = Math.random();
    if (roll < EGG_CURSOR_CHANCE) {
      triggerCursorEgg();
      specialUntil.current = now + BOOP_MS;
    } else if (roll < EGG_SPECIAL_CHANCE) {
      specialUntil.current = now + BOOP_MS;
    } else {
      boopUntil.current = now + BOOP_MS;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const now = Date.now();

    // The quit-confirmation prompt owns the keyboard while it's up.
    if (confirmQuit) {
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        endFocus();
      } else if (e.key === "n" || e.key === "N" || e.key === "Escape") {
        e.preventDefault();
        resumeFocus(now);
        setConfirmQuit(false);
        save();
        setTick((t) => t + 1);
      }
      return;
    }

    // A running focus session is modal: only its own controls respond, and
    // quitting mid-work asks for confirmation first.
    const f = focusRef.current;
    if (f) {
      if ((e.ctrlKey && e.key === "c") || e.key === "q") {
        e.preventDefault();
        if (f.phase === "work" && !f.paused) {
          pauseFocus(now);
          setConfirmQuit(true);
          setTick((t) => t + 1);
        } else {
          endFocus();
        }
        return;
      }
      if (e.key === "p") {
        e.preventDefault();
        if (f.paused) resumeFocus(now);
        else pauseFocus(now);
        save();
        setTick((t) => t + 1);
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        // Skip to the next phase. Skipping a work block still counts it toward
        // the long-break cadence, it just isn't celebrated.
        if (f.phase === "work") {
          f.completed += 1;
          startFocusPhase(f, f.completed % f.config.blocks === 0 ? "long" : "short", now);
        } else {
          startFocusPhase(f, "work", now);
        }
        save();
        setTick((t) => t + 1);
        return;
      }
      if (e.key === "r") {
        e.preventDefault();
        f.completed = 0;
        startFocusPhase(f, "work", now);
        save();
        setTick((t) => t + 1);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        lastInteraction.current = now;
        if (f.phase === "work") shushUntil.current = now + SHUSH_MS; // gently rebuffed
        else registerBoop(now); // booping is fine on a break
        setTick((t) => t + 1);
        return;
      }
      return; // swallow other keys while focused
    }

    // normal pet mode
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      onExit();
      return;
    }
    if (e.key === "q") {
      e.preventDefault();
      onExit();
      return;
    }
    // Hidden.
    // if (e.key === "f") {
    //   e.preventDefault();
    //   setSetup({ task: "", ...FOCUS_DEFAULTS, field: 0 });
    //   return;
    // }
    if (e.key === "n") {
      e.preventDefault();
      setDraft(name);
      setNaming(true);
      return;
    }

    const wasDozing = now - lastInteraction.current >= BORED_MS * idleScale(now);
    lastInteraction.current = now;
    idleType.current = null; // any key interrupts an idle animation
    idleUntil.current = 0;

    if (e.key === " ") {
      e.preventDefault(); // don't scroll the page
      registerBoop(now);
    } else if (wasDozing) {
      startleUntil.current = now + STARTLE_MS;
    }
    setTick((t) => t + 1);
  }

  // name field handlers
  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDraft(e.target.value.replace(NAME_ALLOWED, "").slice(0, NAME_MAX));
  }
  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation(); // keep keys out of the pet's own handler
    if (e.key === "Escape" || (e.ctrlKey && e.key === "c")) {
      e.preventDefault();
      setNaming(false);
      setDraft("");
      rootRef.current?.focus();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = draft.trim();
      if (trimmed.length < NAME_MIN) return;
      setName(trimmed);
      nameRef.current = trimmed;
      save();
      setNaming(false);
      const now = Date.now();
      lastInteraction.current = now;
      registerBoop(now); // a happy little reaction on naming
      rootRef.current?.focus();
    }
  }

  // derive the current frame
  const now = Date.now();
  const scale = idleScale(now);
  const since = now - lastInteraction.current;
  const aff = liveAffection(now);

  let phase: string;
  if (naming) phase = "awake";
  else if (confirmQuit) phase = "cry";
  else if (focusRef.current) {
    const f = focusRef.current;
    if (now < cheerUntil.current) phase = "cheer";
    else if (f.phase === "work") {
      if (now < shushUntil.current) phase = "shush";
      else if (f.paused) phase = "focus-paused";
      else phase = "focus-work";
    } else {
      // On a break the pet acts normal: boops land, hearts pop.
      if (now < boopUntil.current) phase = "booped";
      else if (now < specialUntil.current) phase = "special";
      else if (now < startleUntil.current) phase = "startled";
      else if (f.paused) phase = "focus-paused";
      else phase = "focus-break";
    }
  } else if (now < missUntil.current) phase = "missed";
  else if (now < overstimUntil.current) phase = "dizzy";
  else if (now < specialUntil.current) phase = "special";
  else if (now < boopUntil.current) phase = "booped";
  else if (now < startleUntil.current) phase = "startled";
  else if (visitor.current && now < visitor.current.startAt + visitor.current.dur)
    phase = "watch";
  else if (since >= ASLEEP_MS * scale) phase = "asleep";
  else if (since >= SLEEPY_MS * scale) phase = "sleepy";
  else if (since >= BORED_MS * scale) phase = "bored";
  else if (idleType.current && now < idleUntil.current) phase = `idle-${idleType.current}`;
  else phase = "awake";

  const mood = aff >= 0.66 ? "content" : aff < 0.33 ? "lonely" : "neutral";
  const blink = phase === "awake" && (now + blinkOffset.current) % 3400 < 160;
  const twitch = phase === "awake" && (now + twitchOffset.current) % 5200 < 220;

  let ears = twitch ? " /\\,/\\ " : " /\\_/\\ ";
  let paws = " (  ^  ) ";
  let eyes: string;
  let tag: { text: string; tone: string } | null = null;
  let bubble: { text: string; tone: string } | null = null;

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
      const r = BOOP_REACTIONS[reaction.current];
      eyes = r.eyes;
      tag = { text: r.tag, tone: "text-emerald-600" };
      const rise = (now - (boopUntil.current - BOOP_MS)) / BOOP_MS; // 0→1
      bubble = { text: rise < 0.5 ? "  ♥   ♥" : "♥       ♥", tone: "text-pink-500" };
      break;
    }
    case "startled":
      eyes = "( O.O )";
      tag = { text: "!", tone: "text-amber-600" };
      break;
    case "watch": {
      const v = visitor.current!;
      const p = clamp((now - v.startAt) / v.dur, 0, 1);
      const x = v.dir === "rtl" ? 1 - p : p; // 0 = butterfly at left edge
      eyes = x < 0.38 ? "( O.o )" : x > 0.62 ? "( o.O )" : "( ô.ô )";
      tag = { text: "~?", tone: "text-fuchsia-400" };
      break;
    }
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
    case "cheer":
      eyes = "( ^o^ )";
      tag = { text: "done!", tone: "text-emerald-600" };
      bubble = { text: "✦ ♪ ✦", tone: "text-amber-500" };
      break;
    case "shush":
      eyes = "( -.- )";
      tag = { text: "~shh", tone: "text-zinc-400" };
      break;
    case "focus-work":
      eyes = "( •_• )"; // steady, focused
      bubble = Math.floor(now / 1400) % 2 ? { text: "  ·", tone: "text-sky-300" } : null;
      break;
    case "focus-paused":
      eyes = "( o_o )";
      tag = { text: "paused", tone: "text-amber-600" };
      break;
    case "focus-break":
      eyes = "( ^_^ )";
      tag = {
        text: focusRef.current?.phase === "long" ? "rest~" : "break~",
        tone: "text-emerald-600",
      };
      break;
    case "cry":
      eyes = "( ╥﹏╥ )";
      bubble = { text: "  ;", tone: "text-sky-400" };
      break;
    default:
      // awake: mood shows in the eyes
      if (blink) eyes = "( -.- )";
      else if (mood === "content") eyes = "( ^.^ )";
      else if (mood === "lonely") eyes = "( ._. )";
      else eyes = "( o.o )";
  }
  if (naming) bubble = null;

  // Gentle breathing: bob the whole creature down a row on a slow cycle.
  const breathe = Math.floor(now / 1700) % 2 === 0;
  const remaining = NAME_MIN - draft.trim().length;
  const topper = holidayTopper(now);
  // Ease the resize hop back to center.
  const hop =
    bump.current.until > now
      ? bump.current.x * ((bump.current.until - now) / 500)
      : 0;

  // Butterfly position, computed in JS (like the rest of the pet) so it drifts
  // across instead of relying on a CSS keyframe.
  const fly = visitor.current;
  let butterfly: { x: number; y: number; opacity: number; frame: string } | null = null;
  if (fly) {
    const p = clamp((now - fly.startAt) / fly.dur, 0, 1);
    const x = fly.dir === "ltr" ? -10 + p * 120 : 110 - p * 120; // % across
    const y = 45 + 18 * Math.sin(p * Math.PI * 3); // three gentle swoops
    const edge = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1; // fade at edges
    butterfly = {
      x,
      y,
      opacity: clamp(edge, 0, 1) * 0.95,
      frame: Math.floor(now / 160) % 2 ? VISITOR_FRAMES[0] : VISITOR_FRAMES[1],
    };
  }

  // Focus-session view: countdown, a one-line status, and the block flash.
  const session = focusRef.current;
  const focusLeft = session ? (session.paused ? session.remainingMs : session.endAt - now) : 0;
  let focusSubtitle = "";
  if (session) {
    focusSubtitle =
      session.phase === "work"
        ? `focus · ${Math.min(session.completed + 1, session.config.blocks)}/${session.config.blocks}`
        : phaseLabel(session.phase);
    if (session.paused) focusSubtitle += " · paused";
  }
  const flashAmt = flashUntil.current > now ? (flashUntil.current - now) / FLASH_MS : 0;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => {
        if (naming || setupActive) return; // let inputs keep the keyboard
        rootRef.current?.focus();
      }}
      className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-white font-mono text-[17px] leading-tight text-zinc-800 outline-none"
    >
      {/* Block-complete flash. */}
      {flashAmt > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-emerald-200"
          style={{ opacity: flashAmt * 0.5 }}
        />
      )}

      {/* Ambient particle layer, behind the creature. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className={`absolute text-[12px] ${p.tone} ${
              p.behavior === "fall" ? "animate-pet-fall" : "animate-pet-twinkle"
            }`}
            style={{
              left: `${p.left}%`,
              ...(p.behavior === "twinkle" ? { top: `${p.top}%` } : null),
              animationDuration: `${p.dur}ms`,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      {setup ? (
        <div
          ref={setupPanelRef}
          tabIndex={0}
          onKeyDown={onSetupKeyDown}
          className="z-10 flex flex-col items-center outline-none"
        >
          <div className="mb-2 text-sm uppercase tracking-widest text-zinc-400">
            pomodoro timer
          </div>
          {/* task: typed in place */}
          <div
            className={`flex w-60 items-center justify-between rounded px-3 py-1 ${
              setup.field === 0 ? "bg-zinc-100 text-zinc-900" : "text-zinc-500"
            }`}
          >
            <span className="text-sm">task</span>
            <span className="font-mono text-base">
              {setup.task || <span className="text-zinc-300">name one task…</span>}
              {setup.field === 0 && (
                <span className="ml-px animate-pulse text-zinc-800">▏</span>
              )}
            </span>
          </div>
          {/* configurable lengths */}
          {(
            [
              [1, "work", `${setup.workMin} min`],
              [2, "short break", `${setup.shortMin} min`],
              [3, "long break", `${setup.longMin} min`],
              [4, "long every", `${setup.blocks} blocks`],
            ] as const
          ).map(([idx, label, value]) => {
            const sel = setup.field === idx;
            return (
              <div
                key={label}
                className={`flex w-60 items-center justify-between rounded px-3 py-1 ${
                  sel ? "bg-zinc-100 text-zinc-900" : "text-zinc-500"
                }`}
              >
                <span className="text-sm">{label}</span>
                <span className="font-mono text-base tabular-nums">
                  {sel ? `‹ ${value} ›` : value}
                </span>
              </div>
            );
          })}
          <div className="mt-3 text-sm text-zinc-400">
            ↑↓ field · {setup.field === 0 ? "type" : "←→ adjust"} · enter start · esc
            cancel
          </div>
        </div>
      ) : (
      <div
        className="flex flex-col items-center"
        style={{ transform: `translateX(${hop}px)` }}
      >
        {/* bubble row (reserved so the creature doesn't jump) */}
        <div className={`h-5 whitespace-pre ${bubble?.tone ?? ""}`}>
          {bubble?.text ?? ""}
        </div>
        {breathe && <div className="h-3" aria-hidden />}

        {/* Just above the creature, bobbing with it: focus status while a
            session runs, the name field while naming, else the chosen name. */}
        {session ? (
          <div className="mb-1 flex flex-col items-center leading-tight">
            <div className="max-w-[12rem] truncate text-sm text-zinc-500">
              {session.config.task}
            </div>
            <div className="text-lg tabular-nums text-zinc-800">
              {fmtClock(focusLeft)}
            </div>
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              {focusSubtitle}
            </div>
          </div>
        ) : naming ? (
          <div className="mb-1 flex flex-col items-center">
            <div className="h-4 text-sm">
              {remaining <= 0 ? (
                <span className="text-emerald-600">[Enter]</span>
              ) : (
                <span className="text-zinc-400">
                  (min {remaining} character{remaining === 1 ? "" : "s"})
                </span>
              )}
            </div>
            <input
              ref={nameInputRef}
              value={draft}
              onChange={onNameChange}
              onKeyDown={onNameKeyDown}
              maxLength={NAME_MAX}
              spellCheck={false}
              aria-label="Name your companion"
              className="w-32 bg-transparent text-center font-mono text-[17px] text-zinc-800 outline-none"
            />
          </div>
        ) : name ? (
          <div className="mb-1 text-sm text-zinc-500">{name}</div>
        ) : null}

        {/* The creature itself, sized up from the base text so the pet reads
            bigger than the surrounding name/HUD. */}
        <div className="flex flex-col items-center text-[26px] leading-tight">
          {/* Holiday cosmetic, worn on the head and bobbing with it. */}
          {topper && <div className="leading-none">{topper}</div>}

          <div className="whitespace-pre">{ears}</div>
          {/* Tag is absolutely positioned so it doesn't shift the face. */}
          <div className="relative whitespace-pre">
            {eyes}
            {tag && (
              <span className={`absolute left-full top-0 ml-2 text-sm ${tag.tone}`}>
                {tag.text}
              </span>
            )}
          </div>
          <div className="whitespace-pre">{paws}</div>
        </div>
        {!breathe && <div className="h-3" aria-hidden />}
      </div>
      )}

      {/* The butterfly, drifting across on a wavy path; position updates every
          tick, body flaps between two frames. Click it to burst it into stars.
          The padding/negative-margin pair enlarges the hit target without moving
          the glyph. */}
      {butterfly && !setupActive && (
        <span
          role="button"
          aria-label="Catch the butterfly"
          onClick={() => popButterfly(Date.now(), butterfly.x, butterfly.y)}
          className="absolute z-10 -m-2 cursor-pointer select-none p-2 text-fuchsia-400"
          style={{
            left: `${butterfly.x}%`,
            top: `${butterfly.y}%`,
            opacity: butterfly.opacity,
          }}
        >
          {butterfly.frame}
        </span>
      )}

      {!setup && !naming && (
        <div className="mt-8 select-none text-center text-sm text-zinc-400">
          {confirmQuit && session ? (
            <span>
              leave “{session.config.task}”? this block isn’t done ·{" "}
              <span className="text-zinc-600">y</span> /{" "}
              <span className="text-zinc-600">n</span>
            </span>
          ) : session ? (
            <span>
              p: {session.paused ? "resume" : "pause"} · s: skip · r: reset · q: quit
            </span>
          ) : (
            <span>space: boop{!name ? " · n: name" : ""} · q: quit</span>
          )}
        </div>
      )}
    </div>
  );
}
