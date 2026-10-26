"use client";

import { useState } from "react";

import {
  Building2,
  CircleHelp,
  Eye,
  Moon,
  Sun,
  User,
  Frame,
  GraduationCap,
  House,
  List,
  Mail,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { site, mailto } from "@/data/site";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { BUILDINGS, type BuildingId } from "../world/layout";
import { useTown } from "../state";
import { enterBuilding } from "../scene/Player";
import { togglePov } from "../controls";
import { formatClock, isDayTime, clockHours } from "@/lib/time";
import { Joystick } from "./Joystick";
import { FocusPrompt } from "./FocusPrompt";
import { StartCard } from "./StartCard";
import { Fade, InteriorHud, SpeechBubble } from "./InteriorHud";
import { skipIntro } from "../intro/intro";
import { TowerHud } from "./TowerHud";
import { FlyButtons } from "./FlyButtons";
import { Tutorial } from "./Tutorial";

const ICONS: Record<BuildingId, LucideIcon> = {
  home: House,
  experience: Building2,
  projects: Frame,
  extracurriculars: Trophy,
  education: GraduationCap,
};

const pill =
  "pointer-events-auto rounded-full border border-ink/10 bg-cream/88 shadow-[0_10px_30px_-14px_rgb(18_18_18/0.4)] backdrop-blur-md";
const iconBtn =
  "inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full text-ink/80 transition-colors hover:bg-ink hover:text-cream";

export function Hud({ touch }: { touch: boolean }) {
  const inside = useTown((s) => s.interior !== null);
  const intro = useTown((s) => s.intro);
  const speech = useTown((s) => s.speech);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      {/* the game UI: hidden and unreachable during the intro, fades in at the handoff */}
      <div
        inert={intro}
        aria-hidden={intro}
        className={`absolute inset-0 transition-opacity duration-700 ${intro ? "opacity-0" : "opacity-100 delay-200"}`}
      >
        <Identity />
        <TimeBar />
        <TopRight />
        {!inside && <DoorPrompt touch={touch} />}
        {!inside && <FastTravel />}
        <FocusPrompt touch={touch} />
        <InteriorHud />
        <TowerHud />
        <Toast />
        {touch && !inside && !intro && <Joystick />}
        {touch && !inside && !intro && <FlyButtons />}
        {!intro && <Tutorial touch={touch} />}
      </div>
      <Letterbox intro={intro} />
      <SpeechBubble />
      {/* what he says, for screen readers (the canvas is aria-hidden) */}
      <p className="sr-only" role="status" aria-live="polite">
        {speech ? `Eshaan: ${speech.text}` : ""}
      </p>
      <StartCard touch={touch} />
      <Fade />
      <LoadingScreen />
    </div>
  );
}

/**
 * Cinematic bars while the intro plays, plus a small, quiet "skip" (it
 * appears after ~3 s; Esc / Enter skip too). The bars slide away at the
 * handoff.
 */
function Letterbox({ intro }: { intro: boolean }) {
  const ready = useTown((s) => s.ready);
  const bar = "absolute inset-x-0 h-[clamp(1.75rem,7vh,4.25rem)] bg-ink transition-transform duration-700 ease-in-out";
  return (
    <div aria-hidden={!intro}>
      <div className={`${bar} top-0 ${intro ? "" : "-translate-y-full"}`} />
      <div className={`${bar} bottom-0 ${intro ? "" : "translate-y-full"}`} />
      {/* skip: a real button, there from the start of the intro (fades in once the world is up) */}
      {intro && (
        <button
          type="button"
          onClick={skipIntro}
          aria-label="Skip the intro (Enter or Esc)"
          className={`skip-intro pointer-events-auto absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] inline-flex h-14 items-center gap-3 rounded-full border-2 border-tiffany bg-ink px-6 text-[18px] font-semibold text-tiffany shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)] transition-[opacity,background-color,color] duration-500 hover:bg-tiffany hover:text-ink focus-visible:bg-tiffany focus-visible:text-ink md:right-6 md:bottom-6 md:h-[52px] ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          skip intro <span aria-hidden="true">→</span>
          <kbd aria-hidden="true" className="hidden rounded-[6px] border border-current/50 px-1.5 py-0.5 font-mono text-[0.72rem] font-medium md:inline">
            Enter
          </kbd>
        </button>
      )}
    </div>
  );
}

function Identity() {
  return (
    <div className={`${pill} absolute top-3 left-3 rounded-[16px] px-3 py-2 md:top-6 md:left-6 md:rounded-[18px] md:px-5 md:py-4`}>
      <p className="font-display text-[1.25rem] leading-none lowercase md:text-[2.1rem]">eshaan kapooswalla</p>
    </div>
  );
}

/**
 * The clock (click to open the time scrubber; it runs on lib/time TIME_ZONE internally), day/night toggle and the
 * POV switch, under the name card. Inside Home the scrubber stays open so you
 * can watch his day.
 */
function TimeBar() {
  const time = useTown((s) => s.timeOfDay);
  const toggleDayNight = useTown((s) => s.toggleDayNight);
  const setTime = useTown((s) => s.setTimeOfDay);
  const pov = useTown((s) => s.pov);
  const interior = useTown((s) => s.interior);
  const [open, setOpen] = useState(false);
  const day = isDayTime(time);
  const showScrubber = open || interior === "home";
  return (
    <div className="absolute top-[4.1rem] left-3 flex flex-col items-start gap-2 md:top-[6.6rem] md:left-6">
      <div className={`${pill} flex items-center gap-0.5 p-1`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={showScrubber}
          aria-controls="time-scrubber"
          title="change the time"
          className="rounded-full px-2.5 py-1.5 font-mono text-[0.72rem] tracking-[0.08em] transition-colors hover:bg-ink hover:text-cream md:text-[0.8rem]"
        >
          <span className="tabular-nums">{formatClock(time)}</span>
        </button>
        <button type="button" onClick={toggleDayNight} className={iconBtn} aria-label={day ? "Switch to night" : "Switch to day"} title={day ? "night mode" : "day mode"}>
          {day ? <Sun size={17} strokeWidth={1.7} /> : <Moon size={17} strokeWidth={1.7} />}
        </button>
        {!interior && (
          <button
            type="button"
            onClick={togglePov}
            aria-pressed={pov}
            className={`${iconBtn} ${pov ? "bg-tiffany text-ink" : ""}`}
            aria-label={pov ? "Third-person view (V)" : "First-person view (V)"}
            title={pov ? "third person (V)" : "first person (V)"}
          >
            {pov ? <User size={17} strokeWidth={1.7} /> : <Eye size={17} strokeWidth={1.7} />}
          </button>
        )}
      </div>
      {showScrubber && (
        <div id="time-scrubber" className={`${pill} w-[min(20rem,calc(100vw-1.5rem))] rounded-[16px] px-4 pt-3 pb-2`}>
          <label className="flex items-center justify-between">
            <span className="micro-label text-[0.6rem] text-muted">time of day</span>
            <button type="button" onClick={() => setTime(clockHours())} className="micro-label rounded-full px-2 py-1 text-[0.6rem] text-ink hover:bg-ink hover:text-cream">
              now
            </button>
          </label>
          <input
            type="range"
            min={0}
            max={1435}
            step={5}
            value={Math.round(time * 60)}
            onChange={(e) => setTime(Number(e.target.value) / 60)}
            aria-label="Time of day"
            aria-valuetext={formatClock(time)}
            className="time-scrubber mt-2 w-full cursor-pointer accent-orange"
          />
          <div className="mt-0.5 flex justify-between font-mono text-[0.55rem] text-muted" aria-hidden="true">
            <span>00</span>
            <span>dawn</span>
            <span>noon</span>
            <span>sunset</span>
            <span>24</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TopRight() {
  const setMode = useTown((s) => s.setMode);
  return (
    <div className="absolute top-3 right-3 flex flex-col items-end gap-2 md:top-6 md:right-6 md:flex-row md:items-center">
      <div className={`${pill} flex items-center gap-0.5 p-1`}>
        <a href={mailto} className={iconBtn} aria-label="Email Eshaan">
          <Mail size={17} strokeWidth={1.7} aria-hidden="true" />
        </a>
        <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label="LinkedIn (opens in a new tab)">
          <LinkedInIcon size={15} />
        </a>
        <a href={site.github} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label="GitHub (opens in a new tab)">
          <GitHubIcon size={16} />
        </a>
        <button
          type="button"
          onClick={() => useTown.getState().openStart()}
          className={iconBtn}
          aria-label="How to move around (?)"
          title="how to move around (?)"
        >
          <CircleHelp size={17} strokeWidth={1.7} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => setMode("list")}
        className={`${pill} inline-flex h-9 items-center gap-2 px-3.5 text-[0.78rem] font-medium md:h-11 md:px-4 md:text-[0.85rem] transition-colors hover:bg-ink hover:text-cream`}
      >
        <List size={16} strokeWidth={1.8} aria-hidden="true" />
        view as list
      </button>
      <button
        type="button"
        onClick={() => setMode("choose")}
        className={`${pill} inline-flex h-9 items-center px-3.5 text-[0.78rem] font-medium md:h-11 md:px-4 md:text-[0.85rem] transition-colors hover:bg-ink hover:text-cream`}
      >
        switch mode
      </button>
    </div>
  );
}

function FastTravel() {
  const travelTo = useTown((s) => s.travelTo);
  const travelling = useTown((s) => s.travelling);
  const nearDoor = useTown((s) => s.nearDoor);
  return (
    <nav aria-label="Fast travel" className="absolute inset-x-0 bottom-3 flex justify-center px-2 md:bottom-6 md:px-3">
      <ul className={`${pill} flex max-w-full gap-0 overflow-x-auto p-1 md:gap-0.5 md:p-1.5`}>
        {BUILDINGS.map((b) => {
          const Icon = ICONS[b.id];
          const state = travelling === b.id ? "travelling" : nearDoor === b.id ? "here" : "idle";
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => travelTo(b.id)}
                data-state={state}
                aria-label={`Walk to ${b.name}`}
                className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[0.62rem] font-medium text-ink/80 transition-colors hover:bg-ink hover:text-cream data-[state=here]:bg-tiffany data-[state=here]:text-ink data-[state=travelling]:bg-orange data-[state=travelling]:text-ink md:h-11 md:flex-row md:gap-2 md:px-4 md:text-[0.85rem]"
              >
                <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                <span>{b.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DoorPrompt({ touch }: { touch: boolean }) {
  const nearDoor = useTown((s) => s.nearDoor);
  const travelling = useTown((s) => s.travelling);
  if (!nearDoor || travelling) return null;
  const b = BUILDINGS.find((x) => x.id === nearDoor)!;
  return (
    <div className="absolute inset-x-0 bottom-[4.6rem] flex justify-end px-3 md:bottom-[5.4rem] md:justify-center md:px-0">
      <div className={`${pill} flex items-center gap-3 py-1.5 pr-1.5 pl-4`}>
        <span className="text-[0.85rem]">
          {touch ? "tap to enter" : (
            <>
              press <kbd className="rounded border border-ink/20 bg-paper px-1.5 font-mono text-[0.75rem]">E</kbd> to enter
            </>
          )}{" "}
          <span className="font-display text-[1.05rem] lowercase">{b.sign}</span>
        </span>
        <button
          type="button"
          onClick={() => enterBuilding(b.id)}
          className="h-9 rounded-full bg-orange px-4 text-[0.85rem] font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          enter
        </button>
      </div>
    </div>
  );
}

function Toast() {
  const toast = useTown((s) => s.toast);
  if (!toast) return null;
  return (
    <div role="status" className="absolute inset-x-0 top-24 flex justify-center px-4 md:top-8">
      <p className={`${pill} px-5 py-2.5 text-[0.85rem]`}>{toast}</p>
    </div>
  );
}

function LoadingScreen() {
  const loading = useTown((s) => s.loading);
  const ready = useTown((s) => s.ready);
  return (
    <div
      aria-hidden={ready}
      className={`absolute inset-0 flex flex-col items-center justify-center gap-6 bg-cream transition-opacity duration-700 ${
        ready ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
      }`}
    >
      <svg width="88" height="72" viewBox="0 0 88 72" aria-hidden="true">
        <rect x="6" y="30" width="22" height="38" rx="2" fill="var(--cream)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="33" y="8" width="22" height="60" rx="2" fill="var(--cream)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="60" y="22" width="22" height="46" rx="2" fill="var(--cream)" stroke="var(--ink)" strokeWidth="2" />
        <rect x="39" y="54" width="10" height="14" fill="var(--tiffany)" />
        <path d="M35 52h18l-2 4H37z" fill="var(--orange)" />
        <rect x="12" y="38" width="10" height="8" fill="var(--tiffany)" />
        <rect x="66" y="30" width="10" height="8" fill="var(--tiffany)" />
      </svg>
      <p className="font-display text-4xl lowercase">eshaan&apos;s city</p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-orange transition-[width] duration-500" style={{ width: `${Math.round(loading * 100)}%` }} />
      </div>
      <p className="micro-label text-muted">Loading · {Math.round(loading * 100)}%</p>
    </div>
  );
}
