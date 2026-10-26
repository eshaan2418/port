"use client";

import { useEffect, useRef, useState } from "react";
import { runtime, useTown } from "../state";

/**
 * The first-visit tutorial: Eshaan teaches the controls himself, one step at
 * a time, in a speech bubble over his head. Each step waits until you've
 * actually done it (walked every direction, run, flown up, flown around,
 * landed, fast travelled, gone inside), says "nice!", then moves on. It runs
 * once (remembered in localStorage); "skip" ends it, and the "?" card can
 * replay it. While he's off screen (first person) the bubble docks above the
 * fast-travel bar.
 */

const DONE_KEY = "eshaan-city-tutorial";

export function tutorialDone() {
  try {
    return localStorage.getItem(DONE_KEY) === "done";
  } catch {
    return false;
  }
}

export function startTutorial() {
  useTown.getState().setTutorial(0);
}

function finishTutorial() {
  try {
    localStorage.setItem(DONE_KEY, "done");
  } catch {}
  useTown.getState().setTutorial(null);
}

const DIRS = {
  up: ["KeyW", "ArrowUp"],
  left: ["KeyA", "ArrowLeft"],
  down: ["KeyS", "ArrowDown"],
  right: ["KeyD", "ArrowRight"],
} as const;
type Dir = keyof typeof DIRS;

type Progress = { dirs: Set<Dir>; walked: number; ran: number; flown: number; wasUp: boolean; last: { x: number; z: number } | null };
type Step = {
  id: string;
  desktop: React.ReactNode;
  touch: React.ReactNode;
  /** checked every frame while this step is showing */
  done: (g: Progress, touch: boolean) => boolean;
};

const key = "inline-flex h-6 min-w-6 items-center justify-center rounded-[5px] border border-ink/25 bg-cream px-1.5 font-mono text-[0.7rem] font-medium text-ink";
const K = ({ children }: { children: React.ReactNode }) => <kbd className={key}>{children}</kbd>;

const STEPS: Step[] = [
  {
    id: "walk",
    desktop: (
      <>
        hey! let me show you around. walk with <K>W</K> <K>A</K> <K>S</K> <K>D</K> (or the arrow keys): try all four.
      </>
    ),
    touch: <>hey! let me show you around. drag the joystick to walk me around.</>,
    done: (g, touch) => (touch ? g.walked > 4 : g.dirs.size === 4),
  },
  {
    id: "run",
    desktop: (
      <>
        now hold <K>shift</K> while you walk to run.
      </>
    ),
    touch: <>push the joystick all the way out to run.</>,
    done: (g) => g.ran > 0.8,
  },
  {
    id: "up",
    desktop: (
      <>
        time to fly. hold <K>space</K> to go up.
      </>
    ),
    touch: <>time to fly. hold ▲ to go up.</>,
    done: () => runtime.player.flying && runtime.player.y > 3,
  },
  {
    id: "fly",
    desktop: (
      <>
        let go and I hover. fly around with <K>W</K> <K>A</K> <K>S</K> <K>D</K> (<K>shift</K> to boost).
      </>
    ),
    touch: <>let go and I hover. use the joystick to fly around.</>,
    done: (g) => g.flown > 10,
  },
  {
    id: "land",
    desktop: (
      <>
        hold <K>C</K> to come down and land. a rooftop works too!
      </>
    ),
    touch: <>hold ▼ to come down and land. a rooftop works too!</>,
    done: () => !runtime.player.flying,
  },
  {
    id: "travel",
    desktop: <>to get somewhere fast, pick a building in the bar at the bottom (or click a building).</>,
    touch: <>to get somewhere fast, tap a building in the bar at the bottom (or tap a building).</>,
    done: () => useTown.getState().travelling !== null || useTown.getState().interior !== null,
  },
  {
    id: "enter",
    desktop: (
      <>
        at a door, press <K>E</K> to go inside.
      </>
    ),
    touch: <>at a door, tap &quot;enter&quot; to go inside.</>,
    done: () => useTown.getState().interior !== null,
  },
];

/** the closing line, shown once he's back outside after the last step */
const OUTRO = STEPS.length;

export function Tutorial({ touch }: { touch: boolean }) {
  const step = useTown((s) => s.tutorial);
  const inside = useTown((s) => s.interior !== null);
  const startOpen = useTown((s) => s.startOpen);
  const speaking = useTown((s) => s.speech !== null);
  const [nice, setNice] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const g = useRef<Progress>({ dirs: new Set(), walked: 0, ran: 0, flown: 0, wasUp: false, last: null });

  // watch what he's doing; advance when the step's done
  useEffect(() => {
    if (step === null || step >= OUTRO || nice) return;
    g.current = { dirs: new Set(), walked: 0, ran: 0, flown: 0, wasUp: false, last: null };
    let raf = 0;
    let prev = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const p = runtime.player;
      const pr = g.current;
      for (const d of Object.keys(DIRS) as Dir[]) if (DIRS[d].some((k) => runtime.input.keys.has(k))) pr.dirs.add(d);
      if (pr.last) {
        const moved = Math.hypot(p.x - pr.last.x, p.z - pr.last.z);
        if (p.flying) pr.flown += moved;
        else pr.walked += moved;
      }
      pr.last = { x: p.x, z: p.z };
      if (p.running && p.moving) pr.ran += dt;
      if (STEPS[step].done(pr, touch)) {
        setNice(true);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, nice, touch]);

  // "nice!" for a beat, then the next step
  useEffect(() => {
    if (!nice || step === null) return;
    const id = setTimeout(() => {
      setNice(false);
      useTown.getState().setTutorial(step + 1);
    }, 1100);
    return () => clearTimeout(id);
  }, [nice, step]);

  // the closing line goes away on its own
  useEffect(() => {
    if (step !== OUTRO || inside) return;
    const id = setTimeout(finishTutorial, 6000);
    return () => clearTimeout(id);
  }, [step, inside]);

  // follow his head (docked above the fast-travel bar when he isn't in view)
  useEffect(() => {
    if (step === null) return;
    let raf = 0;
    const loop = () => {
      const el = box.current;
      const h = runtime.head;
      if (el) {
        const w = el.offsetWidth;
        const docked = !h.visible || runtime.focus.lost;
        const ax = docked ? window.innerWidth / 2 : h.x;
        const ay = docked ? window.innerHeight - (touch ? 150 : 110) : h.y;
        const x = Math.min(window.innerWidth - w / 2 - 12, Math.max(w / 2 + 12, ax));
        const y = Math.max(el.offsetHeight + 80, ay);
        el.style.transform = `translate(${x - w / 2}px, ${y - el.offsetHeight - 12}px)`;
        el.dataset.docked = docked ? "1" : "";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, touch]);

  if (step === null || inside || startOpen || speaking) return null;
  const outro = step >= OUTRO;
  const s = STEPS[Math.min(step, STEPS.length - 1)];
  const walkKeys = !touch && s.id === "walk" && !nice && !outro;
  return (
    <div ref={box} className="pointer-events-none absolute top-0 left-0 z-20 w-max max-w-[min(21rem,calc(100vw-1.5rem))]">
      <div role="status" className="relative rounded-[18px] border border-ink/10 bg-paper px-4 pt-3 pb-2.5 shadow-[0_18px_40px_-18px_rgb(18_18_18/0.55)]">
        <p className="text-[0.9rem] leading-relaxed text-ink">
          {outro ? (
            <>that&apos;s everything! have fun looking around. press ? any time to see the controls again.</>
          ) : nice ? (
            <span className="font-semibold">nice! ✓</span>
          ) : touch ? (
            s.touch
          ) : (
            s.desktop
          )}
        </p>
        {walkKeys && <WalkKeys />}
        {!outro && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="flex gap-1" aria-label={`step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((x, i) => (
                <span key={x.id} className={`h-1.5 w-4 rounded-full ${i < step || (i === step && nice) ? "bg-tiffany" : i === step ? "bg-orange" : "bg-ink/15"}`} />
              ))}
            </span>
            <button
              type="button"
              onClick={finishTutorial}
              className="pointer-events-auto micro-label rounded-full px-2 py-1 text-[0.58rem] text-muted hover:bg-ink hover:text-cream"
            >
              skip tutorial
            </button>
          </div>
        )}
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r border-b border-ink/10 bg-paper" />
      </div>
    </div>
  );
}

/** W / A / S / D, each lighting up once it's been pressed */
function WalkKeys() {
  const [seen, setSeen] = useState<Dir[]>([]);
  useEffect(() => {
    let raf = 0;
    const got = new Set<Dir>();
    const loop = () => {
      let changed = false;
      for (const d of Object.keys(DIRS) as Dir[])
        if (!got.has(d) && DIRS[d].some((k) => runtime.input.keys.has(k))) {
          got.add(d);
          changed = true;
        }
      if (changed) setSeen([...got]);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const cap = (d: Dir, label: string) => (
    <kbd className={`${key} h-7 min-w-7 transition-colors ${seen.includes(d) ? "border-tiffany bg-tiffany" : ""}`}>{label}</kbd>
  );
  return (
    <div className="mt-2 flex flex-col items-center gap-1" aria-hidden="true">
      {cap("up", "W")}
      <span className="flex gap-1">
        {cap("left", "A")}
        {cap("down", "S")}
        {cap("right", "D")}
      </span>
    </div>
  );
}
