"use client";

import { useEffect, useRef } from "react";
import { cityAudio } from "../audio/engine";
import { useTown } from "../state";
import { startTutorial } from "./Tutorial";

const Key = ({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) => (
  <kbd
    className={`inline-flex h-8 items-center justify-center rounded-[7px] border border-ink/25 bg-paper px-2 font-mono text-[0.72rem] font-medium text-ink shadow-[0_2px_0_rgb(18_18_18/0.25)] ${
      wide ? "min-w-[3.4rem]" : "min-w-8"
    }`}
  >
    {children}
  </kbd>
);

const Gesture = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex h-8 items-center justify-center rounded-full border border-ink/20 bg-tiffany/50 px-3 font-mono text-[0.68rem] font-medium tracking-[0.04em] text-ink">
    {children}
  </span>
);

const DESKTOP: { keys: React.ReactNode; label: string }[] = [
  {
    keys: (
      <span className="flex flex-col items-center gap-1">
        <Key>W</Key>
        <span className="flex gap-1">
          <Key>A</Key>
          <Key>S</Key>
          <Key>D</Key>
        </span>
      </span>
    ),
    label: "walk (or the arrow keys)",
  },
  { keys: <Key wide>shift</Key>, label: "run (or boost, flying)" },
  { keys: <Key wide>space</Key>, label: "fly up (hold), hover when released" },
  { keys: <Key>C</Key>, label: "fly down / land" },
  { keys: <Gesture>click ground</Gesture>, label: "walk there" },
  { keys: <Key>E</Key>, label: "enter a door" },
  { keys: <Gesture>drag</Gesture>, label: "orbit the camera" },
  {
    keys: (
      <span className="flex items-center gap-1">
        <Gesture>right-drag</Gesture>
        <span className="text-xs text-muted">or</span>
        <Key wide>shift</Key>
        <Gesture>drag</Gesture>
      </span>
    ),
    label: "pan",
  },
  { keys: <Gesture>scroll</Gesture>, label: "zoom" },
  { keys: <Key>V</Key>, label: "first-person view" },
  { keys: <Key>F</Key>, label: "back to eshaan" },
];

const TOUCH: { keys: React.ReactNode; label: string }[] = [
  { keys: <Gesture>joystick</Gesture>, label: "walk (or fly around)" },
  { keys: <Gesture>▲ ▼ buttons</Gesture>, label: "fly up / come down" },
  { keys: <Gesture>tap ground</Gesture>, label: "walk there" },
  { keys: <Gesture>tap a door</Gesture>, label: "enter" },
  { keys: <Gesture>1 finger drag</Gesture>, label: "look around" },
  { keys: <Gesture>2 finger drag</Gesture>, label: "pan" },
  { keys: <Gesture>pinch</Gesture>, label: "zoom" },
];

/**
 * "How to move around": opens right after every intro, and whenever "?" is
 * pressed. Enter / Esc / the button close it.
 */
export function StartCard({ touch }: { touch: boolean }) {
  const open = useTown((s) => s.startOpen);
  const close = useTown((s) => s.closeStart);
  const button = useRef<HTMLButtonElement>(null);
  const replay = useRef<HTMLButtonElement>(null);
  const start = () => {
    close();
    void cityAudio.start(); // (a gesture: harmless if audio is already running)
  };


  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Escape" || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        start();
      }
      if (e.key === "Tab") {
        e.preventDefault(); // two controls: Tab swaps between them
        (document.activeElement === button.current ? replay : button).current?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const rows = touch ? TOUCH : DESKTOP;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-title"
        className="max-h-full w-full max-w-[32rem] overflow-y-auto rounded-[22px] border border-ink/10 bg-cream p-6 shadow-[0_40px_80px_-30px_rgb(18_18_18/0.6)] md:p-8"
      >
        <p className="micro-label text-muted">eshaan&apos;s city</p>
        <h2 id="start-title" className="mt-2 font-display text-3xl lowercase md:text-4xl">
          how to move around
        </h2>
        <ul className="mt-6 grid gap-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-3">
              <span className={`flex shrink-0 justify-start ${touch ? "w-[8.5rem]" : "w-[13.5rem]"}`}>{r.keys}</span>
              <span className="text-[0.92rem] text-ink/85">{r.label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">{touch ? "reopen this anytime with ?" : "press ? to see this again"}</p>
            <button
              ref={replay}
              type="button"
              onClick={() => {
                start();
                startTutorial();
              }}
              className="mt-1 text-[0.85rem] font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              replay the tutorial
            </button>
          </div>
          <button
            ref={button}
            type="button"
            onClick={start}
            className="h-12 shrink-0 rounded-full bg-ink px-5 text-[0.95rem] font-semibold whitespace-nowrap md:px-6 text-cream transition-colors hover:bg-orange hover:text-ink"
          >
            start exploring →
          </button>
        </div>
      </div>
    </div>
  );
}
