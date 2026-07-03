"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTerminal } from "../terminal/TerminalProvider";
import * as pet from "@/lib/pet/core";

// The pet on the main page. Same creature as in the terminal: name, mood, look,
// shared merged localStorage. Only one is visible at a time: while the pet
// command runs in the terminal, this is hidden. It re-adopts the latest state
// the terminal pet exited with. It does not appear until named.

export default function CornerPet() {
  const { activeProgram, isOpen, open, run, requestPetName } = useTerminal();
  const pathname = usePathname();
  // The terminal owns the pet while the pet command is running, so only one copy
  // simulates at once. Owned in two cases: the popup while the pet program runs,
  // and the /terminal route (which covers the corner anyway). Ownership is
  // released when the popup closes, the pet quits, or we leave /terminal.
  const onTerminalRoute = pathname === "/terminal";
  const claimed = onTerminalRoute || (activeProgram === "pet" && isOpen);

  const cardRef = useRef<HTMLDivElement>(null);

  const now0 = Date.now();
  const lastInteraction = useRef(now0);
  const boopUntil = useRef(0);
  const startleUntil = useRef(0);
  const overstimUntil = useRef(0);
  const missUntil = useRef(0);
  const specialUntil = useRef(0);
  const recentBoops = useRef<number[]>([]);
  const reaction = useRef(0);
  const lastReaction = useRef(-1);
  const affection = useRef({ value: 0.5, at: now0 });
  const idleType = useRef<pet.IdleType | null>(null);
  const idleUntil = useRef(0);
  const nextIdleAt = useRef(now0 + 7000);
  const blinkOffset = useRef(Math.random() * 3000);
  const twitchOffset = useRef(Math.random() * 5000);
  const claimedRef = useRef(false); // true while the terminal owns the pet
  const aliveRef = useRef(true);
  const nameRef = useRef("");
  const chatLog = useRef<pet.ChatMsg[]>([]); // bounded conversation memory
  const chatRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null); // transcript scroll container

  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [inputFocused, setInputFocused] = useState(false); // cursor is in the talk field
  const [showLog, setShowLog] = useState(false); // the session transcript panel
  const [pending, setPending] = useState(false);
  const [speech, setSpeech] = useState<{ text: string; until: number } | null>(null);
  const [lift, setLift] = useState(0); // px to lift so we don't overlap the footer
  const [, setTick] = useState(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Pinned to the bottom of the viewport, but lifts above the footer once it
  // scrolls in, so the pet sits on its top edge. This component persists across
  // navigation, so besides scroll/resize we watch the body with a ResizeObserver
  // (catches the page-height change on a route swap and late font/image reflow)
  // and re-sync on pathname change. Without that the offset goes stale after a
  // client-side nav and the pet lands inside the footer until the next scroll.
  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const overlap = window.innerHeight - footer.getBoundingClientRect().top;
      setLift(overlap > 0 ? overlap : 0);
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Load the stored name/mood from localStorage. On the page's first load
  // (initial), a gap since lastSeen over MISSED_AWAY_MS shows the "missed you"
  // greeting. When re-adopting after the terminal releases (initial false), load
  // the state without any greeting.
  function hydrate(initial: boolean) {
    const now = Date.now();
    const s = pet.loadPet();
    const petName = typeof s?.name === "string" ? s.name : "";
    setName(petName);
    nameRef.current = petName;
    const away = now - (typeof s?.lastSeen === "number" ? s.lastSeen : now);
    const stored = typeof s?.affection === "number" ? s.affection : 0.5;
    affection.current = { value: pet.clamp(stored - away / pet.AFFECTION_DECAY_MS, 0, 1), at: now };
    if (initial && away > pet.MISSED_AWAY_MS) {
      missUntil.current = now + pet.MISSED_SHOW_MS;
      lastInteraction.current = now;
    }
  }
  function saveNow() {
    const now = Date.now();
    const patch: pet.PetSave = {
      affection: pet.liveAffection(affection.current.value, affection.current.at, now),
      lastSeen: now,
    };
    // Only write the name once we have one, so an unnamed corner can't merge
    // name:"" over a name set elsewhere. (`claimed` already stops us saving
    // while the terminal owns the pet; this is a second guard.)
    if (nameRef.current) patch.name = nameRef.current;
    pet.savePet(patch);
  }

  // Initial load.
  useEffect(() => {
    hydrate(true);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save our state so the terminal pet can pick it up when it takes over, and
  // re-adopt whatever it left when it releases.
  useEffect(() => {
    if (claimed && !claimedRef.current) saveNow();
    else if (!claimed && claimedRef.current) hydrate(false);
    claimedRef.current = claimed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimed]);

  // Save periodically and on unmount, but never while the terminal owns the pet.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!claimedRef.current) saveNow();
    }, 5000);
    return () => {
      window.clearInterval(id);
      if (!claimedRef.current) saveNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick: schedule unprompted idle animations and drive re-renders.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (claimedRef.current) return; // idle while the terminal owns the pet
      const now = Date.now();
      if (idleUntil.current && now >= idleUntil.current) {
        idleType.current = null;
        idleUntil.current = 0;
      } else if (
        !idleType.current &&
        now >= nextIdleAt.current &&
        now >= boopUntil.current &&
        now >= startleUntil.current &&
        now >= overstimUntil.current &&
        now >= missUntil.current &&
        now - lastInteraction.current < pet.BORED_MS * pet.idleScale(now)
      ) {
        idleType.current = pet.pickIdle(pet.energyAt(now));
        idleUntil.current = now + pet.IDLE_ANIM_MS;
        nextIdleAt.current =
          now + pet.IDLE_ANIM_MS + pet.IDLE_MIN_GAP + Math.random() * (pet.IDLE_MAX_GAP - pet.IDLE_MIN_GAP);
      }
      setTick((t) => t + 1);
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  // interactions
  function registerBoop(now: number) {
    recentBoops.current = recentBoops.current.filter((t) => now - t < pet.OVERSTIM_WINDOW);
    recentBoops.current.push(now);
    if (now < overstimUntil.current) return;
    if (recentBoops.current.length >= pet.OVERSTIM_COUNT) {
      overstimUntil.current = now + pet.DIZZY_MS;
      recentBoops.current = [];
      const aff = pet.liveAffection(affection.current.value, affection.current.at, now);
      affection.current = { value: pet.clamp(aff - pet.DIZZY_PENALTY, 0, 1), at: now };
      return;
    }
    let r = Math.floor(Math.random() * pet.BOOP_REACTIONS.length);
    if (r === lastReaction.current) r = (r + 1) % pet.BOOP_REACTIONS.length;
    lastReaction.current = r;
    reaction.current = r;
    const aff = pet.liveAffection(affection.current.value, affection.current.at, now);
    affection.current = { value: pet.clamp(aff + pet.BOOP_BOOST, 0, 1), at: now };
    if (Math.random() < 0.05) specialUntil.current = now + pet.BOOP_MS;
    else boopUntil.current = now + pet.BOOP_MS;
  }

  function boop() {
    const now = Date.now();
    lastInteraction.current = now;
    idleType.current = null;
    idleUntil.current = 0;
    registerBoop(now);
    setTick((t) => t + 1);
  }

  function showSpeech(text: string) {
    setSpeech({ text, until: Date.now() + pet.speechMs(text) });
    lastInteraction.current = Date.now();
  }
  async function sendMessage(raw: string) {
    const msg = raw.trim().slice(0, pet.CHAT_MAX);
    if (!msg || pending) return;
    setChatDraft("");
    setSpeech(null);
    setPending(true);
    lastInteraction.current = Date.now();
    pet.pushTranscript({ role: "user", content: msg }); // transcript, display only
    setTick((t) => t + 1);
    const history: pet.ChatMsg[] = [...chatLog.current, { role: "user", content: msg }];
    try {
      const { text, remember } = await pet.talkToPet(nameRef.current, history, {
        page: pathname,
        surface: "corner",
        onChunk: (full) => {
          if (!aliveRef.current) return;
          setPending(false); // first token: drop the thinking dots
          // Keep the bubble up while streaming; showSpeech sets the real fade timer after.
          setSpeech({ text: full, until: Date.now() + 60_000 });
          lastInteraction.current = Date.now();
        },
      });
      if (!aliveRef.current) return;
      // Only remember turns the model actually answered (skip naps/errors).
      if (remember) {
        chatLog.current = [
          ...history,
          { role: "assistant" as const, content: text },
        ].slice(-pet.CHAT_KEEP);
      }
      pet.pushTranscript({ role: "assistant", content: text });
      showSpeech(text);
    } finally {
      if (aliveRef.current) setPending(false);
    }
  }
  function onChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setChatDraft("");
      e.currentTarget.blur();
    } else if (e.key === "Enter") {
      // Enter sends; the field wraps on its own, so no newline is needed.
      e.preventDefault();
      void sendMessage(chatDraft);
    }
  }

  // Auto-size the talk field to its content: long messages wrap and grow the box
  // upward (it's anchored above the pet).
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [chatDraft]);

  // Keep the transcript scrolled to the newest line while it's open or grows.
  const turns = pet.transcript().length;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [showLog, turns]);

  // One at a time: stay hidden while the pet shows in the terminal.
  if (!hydrated || claimed) return null;

  // No name yet: show a nudge. Clicking opens the terminal and runs the pet
  // straight into its naming screen.
  if (!name) {
    return (
      <button
        type="button"
        onClick={() => {
          // Open the terminal, launch the pet, and open the naming screen.
          requestPetName();
          open();
          run("pet");
        }}
        style={{ transform: `translateY(-${lift}px)` }}
        className="fixed bottom-4 right-32 z-40 cursor-pointer text-xl text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        psst — name me!{" "}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">(click!)</span>
      </button>
    );
  }

  // derive the current frame
  const now = Date.now();
  const scale = pet.idleScale(now);
  const since = now - lastInteraction.current;
  const aff = pet.liveAffection(affection.current.value, affection.current.at, now);

  let phase = "awake";
  if (pending) phase = "thinking";
  else if (inputFocused) phase = "talking"; // attentive while the cursor is in the field
  else if (now < missUntil.current) phase = "missed";
  else if (now < overstimUntil.current) phase = "dizzy";
  else if (now < specialUntil.current) phase = "special";
  else if (now < boopUntil.current) phase = "booped";
  else if (now < startleUntil.current) phase = "startled";
  else if (since >= pet.ASLEEP_MS * scale) phase = "asleep";
  else if (since >= pet.SLEEPY_MS * scale) phase = "sleepy";
  else if (since >= pet.BORED_MS * scale) phase = "bored";
  else if (idleType.current && now < idleUntil.current) phase = `idle-${idleType.current}`;

  const blink = phase === "awake" && (now + blinkOffset.current) % 3400 < 160;
  const twitch = phase === "awake" && (now + twitchOffset.current) % 5200 < 220;
  const face = pet.petFace(phase, {
    now,
    mood: pet.moodFor(aff),
    blink,
    twitch,
    reaction: reaction.current,
  });
  const breathe = Math.floor(now / 1700) % 2 === 0;
  const topper = pet.holidayTopper(now);

  // Reply bubble and transcript are mutually exclusive; never both at once.
  const showBubble = !showLog && (pending || (!!speech && now < speech.until));
  const bubbleText = pending
    ? ".".repeat((Math.floor(now / 350) % 3) + 1)
    : (speech?.text ?? "");

  return (
    <div
      ref={cardRef}
      style={{ transform: `translateY(-${lift}px)` }}
      className="fixed bottom-4 right-32 z-40 flex select-none flex-col items-center font-mono text-zinc-700 dark:text-zinc-300"
    >
      {/* On top of the pet: the chat input while talking, otherwise the bubble. */}
      <div className="relative flex flex-col items-center">
      {/* Above the pet (out of flow, so the pet doesn't shift): reply bubble,
          then the talk field. The "talk" placeholder is the only affordance. */}
      <div className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 flex-col items-center gap-1">
        {/* Session transcript: everything said this page load. In-memory only,
            gone on reload. */}
        {showLog && turns > 0 && (
          <div
            ref={logRef}
            className="max-h-48 w-56 overflow-y-auto rounded-2xl bg-white/95 px-3 py-2 text-left text-sm leading-snug shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/95 dark:ring-zinc-800"
          >
            {pet.transcript().map((m, i) => (
              <p key={i} className={i ? "mt-1.5" : ""}>
                <span className={m.role === "user" ? "text-zinc-400" : "text-zinc-500"}>
                  {m.role === "user" ? "you" : name}:{" "}
                </span>
                <span className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
                  {m.content}
                </span>
              </p>
            ))}
          </div>
        )}
        {showBubble && (
          <div className="w-max max-w-[15rem] whitespace-pre-wrap break-words rounded-2xl bg-white/95 px-3 py-1.5 text-center text-sm leading-snug text-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/95 dark:text-zinc-300 dark:ring-zinc-800">
            {bubbleText}
          </div>
        )}
        {/* Talk field, with a toggle to its right (out of flow, so the field
            stays centered over the pet) to reveal the conversation. */}
        <div className="relative flex items-center">
          <textarea
            ref={chatRef}
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            onKeyDown={onChatKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            maxLength={pet.CHAT_MAX}
            placeholder="talk"
            rows={1}
            spellCheck={false}
            aria-label={`Talk to ${name}`}
            className="w-40 resize-none overflow-hidden bg-transparent text-center text-base leading-snug text-zinc-700 caret-zinc-600 outline-none placeholder:text-zinc-400 hover:placeholder:text-zinc-600 dark:text-zinc-300 dark:caret-zinc-400 dark:hover:placeholder:text-zinc-400"
          />
          {turns > 0 && (
            <button
              type="button"
              onClick={() => setShowLog((v) => !v)}
              aria-label={showLog ? "Hide conversation" : "Show conversation"}
              aria-expanded={showLog}
              className="absolute left-full ml-1 shrink-0 scale-x-150 text-2xl leading-none text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showLog ? "▾" : "▴"}
            </button>
          )}
        </div>
      </div>

      {/* The pet: click to boop. */}
      <div
        role="button"
        aria-label={`Boop ${name}`}
        onClick={boop}
        className="flex cursor-pointer flex-col items-center text-2xl leading-tight"
      >
        <div className={`h-5 whitespace-pre text-center text-sm ${face.bubble?.tone ?? ""}`}>
          {face.bubble?.text ?? ""}
        </div>
        <div className="mb-0.5 text-base text-zinc-500">{name}</div>
        {topper && <div className="leading-none">{topper}</div>}
        {breathe && <div className="h-1" aria-hidden />}
        <div className="whitespace-pre">{face.ears}</div>
        {/* Tag sits to the left (inward) so it doesn't run off-screen. */}
        <div className="relative whitespace-pre">
          {face.tag && (
            <span className={`absolute right-full top-0 mr-2 text-sm ${face.tag.tone}`}>
              {face.tag.text}
            </span>
          )}
          {face.eyes}
        </div>
        <div className="whitespace-pre">{face.paws}</div>
        {!breathe && <div className="h-1" aria-hidden />}
      </div>
      </div>
    </div>
  );
}
