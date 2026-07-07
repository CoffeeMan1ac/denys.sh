"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/components/Icon";
import { useKeyboardInset } from "@/app/components/useKeyboardInset";
import * as pet from "@/lib/pet/core";
import { PET_GUTTER_CENTER, usePetDocked } from "@/lib/pet/dock";

// Launcher circle is h-14 (56px); DRAG_SLOP is how far a press travels before
// it counts as a drag rather than a tap.
const LAUNCHER = 56;
const DRAG_SLOP = 5;
const POS_KEY = "pet:pos"; // sessionStorage: dragged launcher spot for this session
// Docked side panel width (w-80). Docked only runs >=640px, where max-w-[90vw]
// never clamps it, so this is exact and safe to drive the drag math.
const PANEL_W = 320;

// The pet on the main page: name, mood, look, persisted to localStorage. It's
// named in place (click the nudge) and doesn't appear until named. Hidden on the
// /terminal route, a full terminal surface with no room for it. Below sm it
// collapses into a launcher button plus a bottom sheet; naming happens in the
// sheet there.

export default function CornerPet() {
  const pathname = usePathname();
  const onTerminalRoute = pathname === "/terminal";

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
  const aliveRef = useRef(true);
  const nameRef = useRef("");
  const chatLog = useRef<pet.ChatMsg[]>([]); // bounded conversation memory
  const chatRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null); // transcript scroll container
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [naming, setNaming] = useState(false); // in-place name field is open
  const [nameDraft, setNameDraft] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [inputFocused, setInputFocused] = useState(false); // cursor is in the talk field
  const [showLog, setShowLog] = useState(false); // the session transcript panel
  const [pending, setPending] = useState(false);
  const [speech, setSpeech] = useState<{ text: string; until: number } | null>(null);
  const [lift, setLift] = useState(0); // px to lift so we don't overlap the footer
  const [isMobile, setIsMobile] = useState(false); // below sm: launcher button + sheet
  const docked = usePetDocked(); // gutter too thin: pet rides the nav, not the corner
  const [sheetOpen, setSheetOpen] = useState(false);
  // Opened over the 640-950 burger drawer: that drawer stays up as the single
  // scrim, so this panel skips its own dimming. Ref mirror for event handlers.
  const [underMenu, setUnderMenu] = useState(false);
  const underMenuRef = useRef(false);
  const [sheetDragY, setSheetDragY] = useState(0); // grab handle: px dragged down
  const sheetDragRef = useRef<number | null>(null); // pointer's start Y
  const [petPos, setPetPos] = useState<{ x: number; y: number } | null>(null); // dragged launcher spot, null = default corner
  const petDragRef = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null);
  const petMovedRef = useRef(false); // gesture crossed the drag threshold; swallow its trailing click
  // Docked paw handle: drag up/down to reposition it along the edge, or
  // left/right to pull the panel out/in. pawY is its vertical center (null =
  // middle); dragX is the panel's live translateX while pulling (null = settled).
  const [pawY, setPawY] = useState<number | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);
  const pawDragRef = useRef<{
    x: number;
    y: number;
    axis: null | "x" | "y";
    startY: number;
    startT: number;
  } | null>(null);
  const pawMovedRef = useRef(false);
  // Lifts the sheet above the on-screen keyboard where the browser overlays it.
  const keyboardInset = useKeyboardInset(isMobile && sheetOpen);
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

  // Below sm the free-floating pet is too big next to full-width content, so it
  // collapses into a launcher button plus a bottom sheet.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The nav's Pet entry opens the pet, jumping into naming when unnamed. The
  // event says whether it opened over the burger drawer (640-950).
  useEffect(() => {
    const open = (e: Event) => {
      const um = (e as CustomEvent<{ underMenu?: boolean }>).detail?.underMenu ?? false;
      setUnderMenu(um);
      underMenuRef.current = um;
      setSheetOpen(true);
      if (!nameRef.current) setNaming(true);
    };
    window.addEventListener("pet:open", open);
    return () => window.removeEventListener("pet:open", open);
  }, []);

  // Remember the dragged launcher spot for the session.
  useEffect(() => {
    if (!petPos) return;
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify(petPos));
    } catch {}
  }, [petPos]);

  // Closing the sheet mid-naming drops back to the badged launcher.
  function closeSheet() {
    setSheetOpen(false);
    // Opened over the drawer: close it too so its shared scrim leaves and both
    // panels slide out together (the pet covers the drawer on the way out).
    // Don't clear underMenu here: flipping it back mid-fade would re-add this
    // panel's own dimming just as it fades, doubling the darkening. The next
    // open sets it fresh.
    if (underMenuRef.current) {
      window.dispatchEvent(new Event("pet:close-menu"));
    }
    if (!nameRef.current) {
      setNaming(false);
      setNameDraft("");
    }
  }

  // Sheet: close on Escape, lock background scroll while open.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  // Load the stored name/mood from localStorage. A gap since lastSeen over
  // MISSED_AWAY_MS shows the "missed you" greeting.
  function hydrate() {
    const now = Date.now();
    const s = pet.loadPet();
    const petName = typeof s?.name === "string" ? s.name : "";
    setName(petName);
    nameRef.current = petName;
    const away = now - (typeof s?.lastSeen === "number" ? s.lastSeen : now);
    const stored = typeof s?.affection === "number" ? s.affection : 0.5;
    affection.current = { value: pet.clamp(stored - away / pet.AFFECTION_DECAY_MS, 0, 1), at: now };
    if (away > pet.MISSED_AWAY_MS) {
      missUntil.current = now + pet.MISSED_SHOW_MS;
      lastInteraction.current = now;
    }
    // Restore the dragged launcher spot, clamped in case the viewport shrank.
    try {
      const raw = sessionStorage.getItem(POS_KEY);
      const p = raw ? JSON.parse(raw) : null;
      if (typeof p?.x === "number" && typeof p?.y === "number") {
        setPetPos({
          x: pet.clamp(p.x, 4, window.innerWidth - LAUNCHER - 4),
          y: pet.clamp(p.y, 4, window.innerHeight - LAUNCHER - 4),
        });
      }
    } catch {}
  }
  function saveNow() {
    const now = Date.now();
    const patch: pet.PetSave = {
      affection: pet.liveAffection(affection.current.value, affection.current.at, now),
      lastSeen: now,
    };
    // Only write the name once we have one, so an unnamed pet can't merge
    // name:"" over a stored name.
    if (nameRef.current) patch.name = nameRef.current;
    pet.savePet(patch);
  }

  // Initial load.
  useEffect(() => {
    hydrate();
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save periodically and on unmount.
  useEffect(() => {
    const id = window.setInterval(saveNow, 5000);
    return () => {
      window.clearInterval(id);
      saveNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick: schedule unprompted idle animations and drive re-renders.
  useEffect(() => {
    const id = window.setInterval(() => {
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

  // naming
  function onNameChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setNameDraft(e.target.value.replace(pet.NAME_ALLOWED, "").slice(0, pet.NAME_MAX));
  }
  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < pet.NAME_MIN) return;
    setName(trimmed);
    nameRef.current = trimmed;
    saveNow();
    setNaming(false);
    setNameDraft("");
    const now = Date.now();
    lastInteraction.current = now;
    registerBoop(now); // a happy little reaction on naming
  }
  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setNaming(false);
      setNameDraft("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitName();
    }
  }

  // Focus the name field the moment it opens. In a sheet/side panel (docked)
  // that's the shared composer textarea; on the wide desktop the dedicated input.
  useEffect(() => {
    if (!naming) return;
    (docked ? chatRef : nameInputRef).current?.focus();
  }, [naming, docked]);

  // Auto-size the talk field to its content: long messages wrap and grow the box
  // upward (it's anchored above the pet).
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [chatDraft]);

  // Keep the transcript scrolled to the newest line while it's open or grows
  // (on phones that includes the live row streaming in via `speech`).
  const turns = pet.transcript().length;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [showLog, turns, sheetOpen, pending, speech]);

  // Grab handle: drag the sheet down to close it.
  function onHandleDown(e: React.PointerEvent<HTMLDivElement>) {
    sheetDragRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onHandleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (sheetDragRef.current === null) return;
    setSheetDragY(Math.max(0, e.clientY - sheetDragRef.current));
  }
  function onHandleUp() {
    if (sheetDragRef.current === null) return;
    sheetDragRef.current = null;
    if (sheetDragY > 80) closeSheet();
    setSheetDragY(0);
  }

  // Draggable + tappable launcher. Pointer events drive the drag; the tap opens
  // via a plain onClick so its target stays the button. Opening on pointerup
  // instead lets the browser's follow-up click land on the just-mounted sheet
  // overlay and close it. Capture the pointer only once a real drag starts (past
  // DRAG_SLOP) so a tap's click is never suppressed.
  function onPetDown(e: React.PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    petDragRef.current = { x: e.clientX, y: e.clientY, baseX: r.left, baseY: r.top };
    petMovedRef.current = false;
  }
  function onPetMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = petDragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!petMovedRef.current) {
      if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
      petMovedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setPetPos({
      x: pet.clamp(d.baseX + dx, 4, window.innerWidth - LAUNCHER - 4),
      y: pet.clamp(d.baseY + dy, 4, window.innerHeight - LAUNCHER - 4),
    });
  }
  function onPetUp() {
    petDragRef.current = null;
  }
  function onPetClick() {
    if (petMovedRef.current) {
      petMovedRef.current = false; // tail of a drag, not a real tap
      return;
    }
    setSheetOpen(true);
  }

  // The docked paw both opens the panel and is its drag handle. Horizontal drags
  // pull the panel out (or push it back); vertical drags slide the handle along
  // the edge; a tap toggles. Opening from the paw is standalone, so it clears
  // underMenu and brings its own scrim.
  function openFromPaw() {
    // Close the burger drawer if it's open, else its scrim stacks with this
    // panel's own -> double darkening.
    window.dispatchEvent(new Event("pet:close-menu"));
    underMenuRef.current = false;
    setUnderMenu(false);
    setSheetOpen(true);
  }
  function onPawDown(e: React.PointerEvent<HTMLButtonElement>) {
    pawDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      axis: null,
      startY: pawY ?? window.innerHeight / 2,
      startT: sheetOpen ? 0 : PANEL_W,
    };
    pawMovedRef.current = false;
  }
  function onPawMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = pawDragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
      d.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      pawMovedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.axis === "x") setDragX(pet.clamp(d.startT + dx, 0, PANEL_W));
    else setPawY(pet.clamp(d.startY + dy, 40, window.innerHeight - 40));
  }
  function onPawUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = pawDragRef.current;
    pawDragRef.current = null;
    if (d?.axis === "x") {
      const t = pet.clamp(d.startT + (e.clientX - d.x), 0, PANEL_W);
      setDragX(null);
      if (t < PANEL_W / 2) openFromPaw();
      else closeSheet();
    }
  }
  function onPawClick() {
    if (pawMovedRef.current) {
      pawMovedRef.current = false; // tail of a drag, not a tap
      return;
    }
    if (sheetOpen) closeSheet();
    else openFromPaw();
  }

  // Hidden until hydrated, and on the full-screen terminal route.
  if (!hydrated || onTerminalRoute) return null;

  // No name yet, and not naming: the desktop nudge. Clicking summons the pet
  // right here with the name field focused, centered on the pet's spot
  // (translateX so its own width doesn't shift it). A single bright character
  // crawls left to right, snake-style. Phones have no nudge here; naming is
  // reached from the nav drawer's Pet entry.
  if (!name && !naming && isMobile) return null;

  // Docked and unnamed falls through to the docked branch, so its side panel
  // stays mounted (closed) and slides open when naming starts, matching the
  // always-mounted links drawer instead of popping in already-open.
  if (!name && !naming && !docked) {
    const lead = "psst — name me! ";
    const tail = "(click!)";
    const snake = Math.floor(Date.now() / 110) % (lead.length + tail.length);
    const glow = "text-zinc-900 dark:text-white";
    return (
      <button
        type="button"
        onClick={() => setNaming(true)}
        style={{ left: PET_GUTTER_CENTER, transform: `translate(-50%, -${lift}px)` }}
        className="fixed bottom-4 z-40 cursor-pointer whitespace-nowrap text-2xl text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        {[...lead].map((ch, i) => (
          <span key={i} className={i === snake ? glow : undefined}>
            {ch}
          </span>
        ))}
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {[...tail].map((ch, i) => (
            <span key={i} className={lead.length + i === snake ? glow : undefined}>
              {ch}
            </span>
          ))}
        </span>
      </button>
    );
  }

  // derive the current frame
  const now = Date.now();
  const scale = pet.idleScale(now);
  const since = now - lastInteraction.current;
  const aff = pet.liveAffection(affection.current.value, affection.current.at, now);

  let phase = "awake";
  if (naming) phase = "awake"; // stay alert while being named, never dozing
  else if (pending) phase = "thinking";
  else if (now < missUntil.current) phase = "missed";
  else if (now < overstimUntil.current) phase = "dizzy";
  else if (now < specialUntil.current) phase = "special";
  else if (now < boopUntil.current) phase = "booped";
  else if (now < startleUntil.current) phase = "startled";
  // Below the reactions: with the keyboard up the field stays focused, so if
  // "talking" sat above these a boop would register but never show, then all
  // fire at once (overstim) on blur. Here it's just the attentive-idle state.
  else if (inputFocused) phase = "talking";
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

  // Reply bubble and transcript are mutually exclusive; never both at once.
  const showBubble = !showLog && (pending || (!!speech && now < speech.until));
  const bubbleText = pending
    ? ".".repeat((Math.floor(now / 350) % 3) + 1)
    : (speech?.text ?? "");

  const nameRemaining = pet.NAME_MIN - nameDraft.trim().length;

  // Name field with its hint line; shown above the pet on desktop, inside the
  // sheet on phones.
  const namingBlock = (
    <div className="flex flex-col items-center">
      <div className="h-7 whitespace-nowrap text-xl">
        {nameRemaining <= 0 ? (
          <button
            type="button"
            // Commits before the input's blur handler can react to losing focus.
            onPointerDown={(e) => {
              e.preventDefault();
              commitName();
            }}
            className="cursor-pointer text-emerald-600 dark:text-emerald-400"
          >
            {isMobile ? "[done]" : "[Enter]"}
          </button>
        ) : (
          <span className="text-zinc-400">
            (min {nameRemaining} character{nameRemaining === 1 ? "" : "s"})
          </span>
        )}
      </div>
      <input
        ref={nameInputRef}
        value={nameDraft}
        onChange={onNameChange}
        onKeyDown={onNameKeyDown}
        enterKeyHint="done"
        onBlur={() => {
          // Clicking away without typing drops back to the nudge; keep an
          // in-progress draft so a stray blur doesn't lose it. In the sheet,
          // taps elsewhere blur the field without meaning "stop naming".
          if (!isMobile && !nameDraft.trim()) setNaming(false);
        }}
        maxLength={pet.NAME_MAX}
        spellCheck={false}
        aria-label="Name the pet"
        // Half the old width when empty, growing a character at a time (ch
        // tracks the mono glyph width) so the underline follows the name.
        style={{ width: `max(5rem, ${nameDraft.length + 1}ch)` }}
        className="border-b border-zinc-400 bg-transparent text-center text-xl text-zinc-800 caret-zinc-600 outline-none transition-[width] duration-150 dark:border-zinc-600 dark:text-zinc-200 dark:caret-zinc-400"
      />
    </div>
  );

  // On phones the reply streams straight into the transcript as a live row
  // (it only becomes a real entry once the reply finishes), so the sheet needs
  // no reply bubble.
  const liveRow =
    docked &&
    (pending || (!!speech && now < speech.until)) &&
    pet.transcript().at(-1)?.role === "user";

  // Session transcript: everything said this page load. In-memory only, gone on
  // reload. Behind the arrow toggle on desktop; always visible in the sheet,
  // where it grows with the conversation and scrolls once the sheet is full.
  const transcriptPanel = (docked ? turns > 0 || liveRow : showLog && turns > 0) && (
    <div
      ref={logRef}
      className={`overflow-y-auto rounded-2xl bg-white/95 px-3 py-2 text-left leading-snug shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/95 dark:ring-zinc-800 ${
        docked ? "min-h-0 w-full text-base" : "max-h-48 w-56 text-sm"
      }`}
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
      {liveRow && (
        <p className={turns ? "mt-1.5" : ""}>
          <span className="text-zinc-500">{name}: </span>
          <span className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
            {bubbleText}
          </span>
        </p>
      )}
    </div>
  );

  const bubble = showBubble && (
    <div className="w-max max-w-[15rem] whitespace-pre-wrap break-words rounded-2xl bg-white/95 px-3 py-1.5 text-center text-sm leading-snug text-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900/95 dark:text-zinc-300 dark:ring-zinc-800">
      {bubbleText}
    </div>
  );

  // Talk field. In the sheet it's a chat-app composer: a pill with a growing
  // field and a send button. On desktop it stays the bare centered field, with
  // a toggle to its right (out of flow, so the field stays centered over the
  // pet) to reveal the conversation.
  const talkRow = docked ? (
    // One composer for both phases: naming (green check, commits the name) and
    // talking (send). The element stays mounted across the switch so the field
    // morphs in place instead of remounting.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (naming) commitName();
        else void sendMessage(chatDraft);
      }}
      className="flex w-full items-end gap-2 rounded-3xl bg-zinc-100 py-2 pl-4 pr-2 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
    >
      <textarea
        ref={chatRef}
        value={naming ? nameDraft : chatDraft}
        onChange={naming ? onNameChange : (e) => setChatDraft(e.target.value)}
        onKeyDown={naming ? onNameKeyDown : onChatKeyDown}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        maxLength={naming ? pet.NAME_MAX : pet.CHAT_MAX}
        placeholder={naming ? "type a name…" : `message ${name}`}
        rows={1}
        spellCheck={false}
        enterKeyHint={naming ? "done" : "send"}
        aria-label={naming ? "Name the pet" : `Talk to ${name}`}
        className="max-h-32 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-lg leading-snug text-zinc-700 caret-zinc-600 outline-none placeholder:text-zinc-400 dark:text-zinc-300 dark:caret-zinc-400"
      />
      <button
        type="button"
        // Act on pointerdown with preventDefault so the button never steals
        // focus from the textarea: the keyboard stays up and the field morphs
        // from name to message without a blur/refocus flicker. Also suppresses
        // the trailing ghost click. Disabled controls don't fire pointer events,
        // so the disabled attr below is the guard.
        onPointerDown={(e) => {
          e.preventDefault();
          if (naming) commitName();
          else void sendMessage(chatDraft);
        }}
        disabled={naming ? nameDraft.trim().length < pet.NAME_MIN : !chatDraft.trim() || pending}
        aria-label={naming ? "Name the pet" : `Send to ${name}`}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition duration-300 disabled:opacity-30 ${
          naming ? "bg-emerald-600 dark:bg-emerald-500" : "bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900"
        }`}
      >
        {/* Both icons stacked; cross-fade so check → send dissolves in step with
            the color, instead of a hard swap (SVG paths can't tween). */}
        <span className="relative grid h-5 w-5 place-items-center">
          <Icon
            icon="mdi:check"
            className={`absolute h-5 w-5 transition-opacity duration-300 ${naming ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          />
          <Icon
            icon="mdi:send"
            className={`absolute h-5 w-5 transition-opacity duration-300 ${naming ? "opacity-0" : "opacity-100"}`}
            aria-hidden
          />
        </span>
      </button>
    </form>
  ) : (
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
        className="w-40 resize-none overflow-hidden bg-transparent text-center text-xl leading-normal text-zinc-700 caret-zinc-600 outline-none placeholder:text-zinc-400 hover:placeholder:text-zinc-600 dark:text-zinc-300 dark:caret-zinc-400 dark:hover:placeholder:text-zinc-400"
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
  );

  // The pet: click to boop.
  const figure = (
    <div
      role="button"
      aria-label={name ? `Boop ${name}` : "Boop the pet"}
      // Boop on pointerdown with preventDefault so poking the pet never steals
      // focus from the message field: the keyboard stays up.
      onPointerDown={(e) => {
        e.preventDefault();
        boop();
      }}
      // Always mono: the ASCII face relies on fixed-width glyphs to line up.
      className="flex cursor-pointer select-none flex-col items-center font-mono text-3xl leading-tight"
    >
      <div className={`h-6 whitespace-pre text-center text-base ${face.bubble?.tone ?? ""}`}>
        {face.bubble?.text ?? ""}
      </div>
      {name && <div className="mb-0.5 text-xl text-zinc-500">{name}</div>}
      {breathe && <div className="h-1" aria-hidden />}
      <div className="whitespace-pre">{face.ears}</div>
      {/* Tag sits to the left (inward) so it doesn't run off-screen. */}
      <div className="relative whitespace-pre">
        {face.tag && (
          <span className={`absolute right-full top-0 mr-2 text-base ${face.tag.tone}`}>
            {face.tag.text}
          </span>
        )}
        {face.eyes}
      </div>
      <div className="whitespace-pre">{face.paws}</div>
      {!breathe && <div className="h-1" aria-hidden />}
    </div>
  );

  // Shared body for both the phone bottom sheet and the docked side panel: the
  // first-run intro while naming, else the transcript, then the pet and the
  // composer (kept mounted so the name field morphs straight into the message
  // field). Each surface wraps this with its own frame and close affordance.
  const sheetInner = (
    <>
      {naming ? (
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200">
            Name your pet
          </h2>
          <p className="-mt-1 max-w-[16rem] text-lg leading-snug text-zinc-500 dark:text-zinc-400">
            It talks! Name to say hi.
          </p>
        </div>
      ) : (
        transcriptPanel
      )}
      <div className="shrink-0">{figure}</div>
      <div className="w-full shrink-0">{talkRow}</div>
    </>
  );

  // Phones: a paw launcher, only once named (unnamed pets are reached from the
  // nav drawer). The full pet opens in a bottom sheet so it never sits over the
  // page content.
  if (isMobile) {
    return (
      <>
        {name && (
          <button
            type="button"
            onPointerDown={onPetDown}
            onPointerMove={onPetMove}
            onPointerUp={onPetUp}
            onPointerCancel={onPetUp}
            onClick={onPetClick}
            aria-label={`Open ${name}`}
            style={
              petPos
                ? { left: petPos.x, top: petPos.y }
                : { transform: `translateY(-${lift}px)` }
            }
            className={`fixed z-40 grid h-14 w-14 cursor-grab touch-none place-items-center rounded-full border border-white/50 bg-white/40 shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-opacity active:cursor-grabbing dark:border-white/10 dark:bg-zinc-900/40 ${
              petPos ? "" : "bottom-4 right-4"
            } ${sheetOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <Icon icon="mdi:paw" className="h-6 w-6 -rotate-[30deg]" aria-hidden />
          </button>
        )}
        {/* Sheet, always mounted so it can slide; inert while closed. */}
        <div
          className={`fixed inset-0 z-50 ${sheetOpen ? "" : "pointer-events-none"}`}
          inert={!sheetOpen}
        >
          {/* Own fixed layer, not absolute-in-fixed: iOS samples the viewport
              directly so the blur covers the top band behind the toolbar. */}
          <div
            className={`fixed inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-200 ease-out dark:bg-zinc-950/50 ${
              sheetOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeSheet}
          />
          <div
            style={{
              ...(sheetDragY ? { transform: `translateY(${sheetDragY}px)` } : undefined),
              ...(keyboardInset
                ? {
                    bottom: keyboardInset,
                    maxHeight: `calc(85dvh - ${keyboardInset}px)`,
                  }
                : undefined),
            }}
            className={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col items-center gap-2 rounded-t-2xl border-t border-zinc-200 bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1.5 font-sans text-zinc-700 shadow-2xl ease-out dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 ${
              sheetDragY ? "" : "transition-transform duration-200"
            } ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            {/* Grab handle: drag down to close. */}
            <div
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              className="flex w-full shrink-0 cursor-grab touch-none justify-center py-1.5"
            >
              <span
                aria-hidden
                className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700"
              />
            </div>
            {/* Naming only: a corner close, matching the nav drawer's. */}
            {naming && (
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="absolute right-2 top-2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <Icon icon="mdi:close" className="h-6 w-6" aria-hidden />
              </button>
            )}
            {sheetInner}
          </div>
        </div>
      </>
    );
  }

  // Docked (laptop, thin gutter): the pet leaves the corner for a right-side
  // panel that reuses the phone sheet's body. A paw handle on the panel's left
  // edge opens it (tap or pull) and rides along the edge; the nav's Pet entry
  // opens it too. panelTx is how far off-screen the panel sits (0 = out, PANEL_W
  // = tucked away); the paw and scrim track it.
  if (docked) {
    const panelTx = dragX !== null ? dragX : sheetOpen ? 0 : PANEL_W;
    const dragging = dragX !== null;
    const scrimOpacity = dragging ? (PANEL_W - panelTx) / PANEL_W : sheetOpen ? 1 : 0;
    return (
      <div className={`fixed inset-0 z-50 ${sheetOpen ? "" : "pointer-events-none"}`}>
        {/* Under the burger drawer this is a bare click-catcher; the drawer's own
            scrim dims. Standalone it's the scrim, and its dim tracks the pull. */}
        <div
          onClick={closeSheet}
          style={{ opacity: scrimOpacity }}
          className={`fixed inset-0 ${dragging ? "" : "transition-opacity duration-200 ease-out"} ${
            sheetOpen ? "" : "pointer-events-none"
          } ${underMenu ? "" : "bg-zinc-900/20 backdrop-blur-sm dark:bg-zinc-950/50"}`}
        />
        {/* Panel, always mounted so it can slide; inert while closed. */}
        <div
          inert={!sheetOpen}
          style={{ translate: `${panelTx}px` }}
          className={`absolute inset-y-0 right-0 flex w-80 max-w-[90vw] flex-col overflow-y-auto border-l border-zinc-200 bg-white px-4 font-sans text-zinc-700 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 ${
            dragging ? "" : "transition-transform duration-200 ease-out"
          } ${sheetOpen ? "" : "pointer-events-none"}`}
        >
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <Icon icon="mdi:close" className="h-6 w-6" aria-hidden />
          </button>
          {/* Pet + composer sit at the bottom; the transcript grows above and
              scrolls once it fills. */}
          <div className="mt-auto flex w-full flex-col items-center gap-2 pb-6 pt-14">
            {sheetInner}
          </div>
        </div>
        {/* Paw handle on the panel's left edge: tap to toggle, pull left/right to
            drag the panel out/in, drag up/down to slide it along the edge. Same
            fill and no seam as the panel, so it reads as attached once named. */}
        {name && (
          <button
            type="button"
            onPointerDown={onPawDown}
            onPointerMove={onPawMove}
            onPointerUp={onPawUp}
            onPointerCancel={onPawUp}
            onClick={onPawClick}
            aria-label={sheetOpen ? `Close ${name}` : `Open ${name}`}
            // +6 slips the tab 6px over the panel edge (the viewBox's 28..34
            // strip) so its fill hides the panel's straight border there.
            style={{ top: pawY ?? "50%", translate: `${panelTx - PANEL_W + 6}px -50%` }}
            className={`pointer-events-auto absolute right-0 z-10 block h-[84px] w-[34px] cursor-grab touch-none [filter:drop-shadow(0_1px_2px_rgb(0_0_0/0.15))] active:cursor-grabbing ${
              dragging ? "" : "transition-transform duration-200 ease-out"
            }`}
          >
            {/* Tab that flares into the panel with concave tails. The stroke is
                the panel's border routed around the bump (its vertical ends meet
                the panel's border-l); the fill slips over the edge (x 28..34) to
                cover the straight border underneath. Tune the two curves freely. */}
            <svg viewBox="0 0 34 84" className="absolute inset-0 h-full w-full" aria-hidden>
              <path
                d="M34 0 L28 0 C28 28 0 14 0 42 C0 70 28 56 28 84 L34 84 Z"
                className="fill-white dark:fill-zinc-950"
              />
              <path
                d="M28 0 C28 28 0 14 0 42 C0 70 28 56 28 84"
                fill="none"
                strokeWidth={1}
                className="stroke-zinc-200 dark:stroke-zinc-800"
              />
            </svg>
            <span className="absolute inset-y-0 left-0 grid w-7 place-items-center text-zinc-500 dark:text-zinc-400">
              <Icon icon="mdi:paw" className="h-6 w-6 -rotate-[30deg]" aria-hidden />
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={{ left: PET_GUTTER_CENTER, transform: `translate(-50%, -${lift}px)` }}
      className="fixed bottom-4 z-40 flex select-none flex-col items-center font-mono text-zinc-700 dark:text-zinc-300"
    >
      {/* On top of the pet: the chat input while talking, otherwise the bubble. */}
      <div className="relative flex flex-col items-center">
        {/* Above the pet (out of flow, so the pet doesn't shift): the name field
            while naming, otherwise the reply bubble then the talk field. The
            "talk" placeholder is the only affordance. */}
        <div className="absolute bottom-full left-1/2 mb-1 flex -translate-x-1/2 flex-col items-center gap-1">
          {naming ? (
            namingBlock
          ) : (
            <>
              {transcriptPanel}
              {bubble}
              {talkRow}
            </>
          )}
        </div>
        {figure}
      </div>
    </div>
  );
}
