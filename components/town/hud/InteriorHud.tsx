"use client";

import { useEffect, useRef, useState } from "react";
import { BedDouble, DoorOpen, Footprints, Laptop, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { activityAt, fmtHour, type HomeRoom } from "@/lib/schedule";
import { runtime, useTown } from "../state";
import { ROOMS, roomDef } from "../interior/rooms";
import { leaveInterior, speak } from "../interior/transitions";

const ICON: Record<HomeRoom, LucideIcon> = { bedroom: BedDouble, study: Laptop, kitchen: UtensilsCrossed };
const pill = "pointer-events-auto rounded-full border border-ink/10 bg-cream/90 shadow-[0_10px_30px_-14px_rgb(18_18_18/0.4)] backdrop-blur-md";

/**
 * Inside Home: a room selector (top to bottom, like the floors), the plaque
 * with what he's doing right now, a "back outside" button, and the motion
 * streaks + tint when you jump between rooms.
 */
export function InteriorHud() {
  const interior = useTown((s) => s.interior);
  const homeRoom = useTown((s) => s.homeRoom);
  const setHomeRoom = useTown((s) => s.setHomeRoom);
  const time = useTown((s) => s.timeOfDay);
  const intro = useTown((s) => s.intro);
  const act = activityAt(time);
  const view = homeRoom ?? act.room;
  const [streak, setStreak] = useState<{ key: number; color: string } | null>(null);
  const prev = useRef(view);

  // streaks + tint whenever the framed room changes
  useEffect(() => {
    if (prev.current !== view) setStreak({ key: performance.now(), color: roomDef(view).mood });
    prev.current = view;
  }, [view]);

  // Esc leaves
  useEffect(() => {
    if (interior !== "home") return;
    const onKey = (e: KeyboardEvent) => {
      const s = useTown.getState();
      if (e.key === "Escape" && !s.startOpen && !s.intro) leaveInterior();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interior]);

  if (interior !== "home") return null;
  return (
    <>
      {streak && <Streaks key={streak.key} color={streak.color} onDone={() => setStreak(null)} />}

      {!intro && (
        <nav
          aria-label="Rooms"
          className="absolute inset-x-0 bottom-[4.1rem] flex justify-center px-3 md:inset-x-auto md:top-1/2 md:right-6 md:bottom-auto md:-translate-y-1/2 md:px-0"
        >
          <ol className="pointer-events-auto flex gap-1 rounded-[2px] border border-ink/15 bg-cream/92 p-1 shadow-[0_10px_30px_-14px_rgb(18_18_18/0.4)] backdrop-blur-md md:flex-col md:p-1.5">
            {ROOMS.map((r) => {
              const Icon = ICON[r.id];
              const here = act.room === r.id;
              const current = view === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-current={current ? "true" : undefined}
                    onClick={() => {
                      setHomeRoom(r.id);
                      speak(`home-${r.id}`);
                    }}
                    className={`flex w-full items-center gap-1.5 rounded-[1px] border px-2.5 py-2 text-left text-[0.74rem] transition-colors md:gap-2.5 md:px-3 md:text-[0.82rem] ${
                      current ? "border-ink bg-ink text-cream" : "border-ink/15 hover:bg-ink/10"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                    <span className="lowercase">{r.label}</span>
                    {here && <span className="ml-auto h-2 w-2 rounded-full bg-orange" title="he's here" aria-label="(Eshaan is here)" />}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setHomeRoom(null)}
                aria-pressed={homeRoom === null}
                className={`flex w-full items-center gap-1.5 rounded-[1px] border px-2.5 py-2 text-left text-[0.72rem] transition-colors md:gap-2.5 md:px-3 md:text-[0.78rem] ${
                  homeRoom === null ? "border-ink/60 bg-tiffany text-ink" : "border-ink/15 hover:bg-ink/10"
                }`}
              >
                <Footprints size={15} strokeWidth={1.7} aria-hidden="true" />
                <span className="hidden sm:inline">follow eshaan</span>
                <span className="sm:hidden">follow</span>
              </button>
            </li>
          </ol>
        </nav>
      )}

      {/* plaque */}
      {!intro && (
        <section aria-label="Home" className="absolute inset-x-3 bottom-[7.6rem] md:inset-x-auto md:bottom-6 md:left-6 md:max-w-[19rem]">
          <div className="pointer-events-auto rounded-[18px] border border-ink/10 bg-paper/95 px-4 py-3 md:p-4 shadow-[0_20px_40px_-20px_rgb(18_18_18/0.5)] backdrop-blur-md">
            <p className="micro-label text-[0.58rem] text-muted">home · {roomDef(view).label}</p>
            <p className="mt-2 font-display text-[1.35rem] leading-tight lowercase">{act.label}</p>
            <p className="mt-1 font-mono text-[0.72rem] text-muted">
              {fmtHour(act.from)}–{fmtHour(act.to === 24 ? 0 : act.to)} · {act.room}
            </p>
            <p className="mt-3 hidden text-[0.8rem] leading-snug text-ink/75 md:block">scrub the clock (top left) to watch his day.</p>
          </div>
        </section>
      )}

      {!intro && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center md:bottom-6">
          <button type="button" onClick={leaveInterior} className={`${pill} inline-flex h-11 items-center gap-2 px-5 text-[0.85rem] font-medium hover:bg-ink hover:text-cream`}>
            <DoorOpen size={16} strokeWidth={1.7} aria-hidden="true" />
            back outside
            <kbd className="rounded border border-current/30 px-1.5 font-mono text-[0.68rem] opacity-70">esc</kbd>
          </button>
        </div>
      )}
    </>
  );
}

/** quick horizontal motion streaks and a tint flash in the room's mood */
export function Streaks({ color, onDone }: { color: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 650);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div aria-hidden="true" className="streaks pointer-events-none absolute inset-0 overflow-hidden" style={{ ["--mood" as string]: color }}>
      <div className="absolute inset-0 bg-[var(--mood)] opacity-0 [animation:tint_0.65s_ease-out]" />
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="absolute h-[2px] rounded-full bg-cream/80"
          style={{
            top: `${6 + i * 6.6 + ((i * 37) % 5)}%`,
            width: `${18 + ((i * 53) % 30)}%`,
            left: "-40%",
            animation: `streak 0.55s ${(i % 5) * 0.03}s cubic-bezier(.2,.7,.2,1)`,
          }}
        />
      ))}
    </div>
  );
}

/** Typewriter speech bubble above whoever is talking (anchored each frame). */
export function SpeechBubble() {
  const speech = useTown((s) => s.speech);
  const intro = useTown((s) => s.intro); // the intro paces itself: no skip / close, no auto-close
  const say = useTown((s) => s.say);
  // typed characters, keyed by the line so a new line starts from zero
  const [typed, setTyped] = useState({ key: 0, n: 0 });
  const box = useRef<HTMLDivElement>(null);
  const text = speech?.text ?? "";
  const shown = speech && typed.key === speech.key ? typed.n : 0;
  const done = shown >= text.length;
  const setShown = (n: number) => speech && setTyped({ key: speech.key, n });

  useEffect(() => {
    if (!speech) return;
    const id = setInterval(
      () => setTyped((t) => (t.key !== speech.key ? { key: speech.key, n: 1 } : { key: t.key, n: Math.min(speech.text.length, t.n + 1) })),
      32,
    );
    return () => clearInterval(id);
  }, [speech]);

  // linger once typed, then close
  useEffect(() => {
    if (!speech || !done || intro) return;
    const id = setTimeout(() => say(null), 6500);
    return () => clearTimeout(id);
  }, [speech, done, say, intro]);

  // follow the anchor
  useEffect(() => {
    if (!speech) return;
    let raf = 0;
    const loop = () => {
      const el = box.current;
      const b = runtime.bubble;
      if (el) {
        const w = el.offsetWidth;
        const x = Math.min(window.innerWidth - w / 2 - 12, Math.max(w / 2 + 12, b.x));
        const y = Math.max(el.offsetHeight + 90, b.y);
        el.style.transform = `translate(${x - w / 2}px, ${y - el.offsetHeight - 14}px)`;
        el.style.opacity = b.visible ? "1" : "0";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [speech]);

  if (!speech) return null;
  return (
    // the words are announced by the Hud's live region; this is the visual bubble
    <div ref={box} className="absolute top-0 left-0 z-20 max-w-[min(22rem,80vw)]">
      <div
        className={`relative rounded-[18px] border border-ink/10 bg-paper px-4 py-3 shadow-[0_18px_40px_-18px_rgb(18_18_18/0.55)] ${
          intro ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
        <p aria-hidden="true" className="text-[0.92rem] leading-snug text-ink">
          {/* the full line reserves the bubble's size; the typed part draws on top */}
          <span className="relative block">
            <span className="invisible">{text}</span>
            <span className="absolute inset-0">
              {text.slice(0, shown)}
              {!done && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-ink/60" />}
            </span>
          </span>
        </p>
        {!intro && (
          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => (done ? say(null) : setShown(text.length))}
              className="micro-label rounded-full px-2 py-1 text-[0.58rem] text-muted hover:bg-ink hover:text-cream"
            >
              {done ? "close" : "skip"}
            </button>
          </div>
        )}
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r border-b border-ink/10 bg-paper" />
      </div>
    </div>
  );
}

/** Cream cross-fade for entering / leaving interiors. */
export function Fade() {
  const fade = useTown((s) => s.fade);
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-30 bg-cream transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
    />
  );
}
