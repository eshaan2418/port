"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Bot, Box, LayoutGrid } from "lucide-react";
import { site } from "@/data/site";
import { hasWebGL } from "@/lib/hooks";
import { lowPowerDevice, type Mode } from "@/lib/mode";
import { listBody } from "@/app/fonts/list";
import { useTown } from "@/components/town/state";
import { cityAudio } from "@/components/town/audio/engine";

const noop = () => () => {};

/**
 * The first-load mode chooser: free roam (the 3D city), normal website (the
 * list view) or the AI agent version (/agent). It's an overlay: the whole
 * site's content stays in the server-rendered HTML underneath. Cards work
 * with Tab + Enter and the keys 1 / 2 / 3. It shows on every visit to "/".
 */
export function Chooser({ pending }: { pending: boolean }) {
  const setMode = useTown((s) => s.setMode);
  const dialog = useRef<HTMLDivElement>(null);
  const agentLink = useRef<HTMLAnchorElement>(null);
  // client-only facts (false during SSR / hydration, so the markup matches)
  const lowPower = useSyncExternalStore(noop, () => lowPowerDevice(), () => false);
  const noGL = useSyncExternalStore(noop, () => !hasWebGL(), () => false);
  const reduced = useSyncExternalStore(noop, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);

  const pick = (m: Mode) => {
    if (m === "agent") return; // the link navigates
    if (m === "town") {
      // this click / key press is the user gesture: start the music right now, as the world loads
      cityAudio.startFromGesture();
      useTown.setState({ sound: true, muted: false });
    }
    setMode(m === "town" ? "town" : "list");
  };

  useEffect(() => {
    if (pending) return;
    dialog.current?.focus({ preventScroll: true }); // into the dialog (Tab then reaches the cards)
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "1" && !noGL) pick("town");
      if (e.key === "2") pick("list");
      if (e.key === "3") {
        pick("agent");
        agentLink.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, noGL]);

  const keyCap = "inline-flex h-7 min-w-7 self-start items-center justify-center rounded-[6px] border px-1.5 font-mono text-[0.75rem]";
  return (
    <div
      ref={dialog}
      tabIndex={-1}
      data-chooser
      data-pending={pending || undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chooser-title"
      className={`chooser fixed inset-0 z-50 overflow-y-auto bg-cream text-ink ${listBody.variable}`}
    >
      <div className="mx-auto flex min-h-full max-w-[72rem] flex-col justify-center px-5 py-12 md:px-10">
        <h1 id="chooser-title" className="mt-4 font-display text-[clamp(2.5rem,6.4vw,4.9rem)] leading-[0.98] tracking-[-0.025em] lowercase">
          welcome to {site.name.split(" ")[0].toLowerCase()}&apos;s website
        </h1>
        <p className="mt-4 max-w-[40rem] text-lg leading-snug text-ink/75 md:text-xl">
          please choose how you&apos;d like to look around. all three show the same things, so pick whichever suits you. you can switch any time.
        </p>

        <ul className="mt-9 grid gap-4 md:grid-cols-3">
          <li>
            <button
              type="button"
              disabled={noGL}
              onClick={() => pick("town")}
              className="group flex h-full w-full flex-col rounded-[22px] bg-orange p-6 text-left text-ink shadow-[0_18px_40px_-26px_rgb(18_18_18/0.6)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 md:p-7"
            >
              <span className="flex items-center justify-between">
                <span className={`${keyCap} border-ink/40`} aria-hidden="true">
                  1
                </span>
                <Box size={26} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="mt-6 font-display text-[2.1rem] leading-none tracking-[-0.02em]">free roam</span>
              <span className="mt-3 text-[1rem] leading-snug">explore my city in 3D: walk the block, fly over the rooftops and step inside each building. needs a good laptop.</span>
              {(lowPower || reduced || noGL) && (
                <span className="mt-4 inline-block self-start rounded-full bg-ink px-3 py-1 text-[0.8rem] font-medium text-cream">
                  {noGL ? "needs WebGL, which this browser doesn't have" : reduced ? "heads up: it's animated (your device asks for reduced motion)" : "works best on a laptop"}
                </span>
              )}
              <span className="mt-auto pt-7 text-[0.95rem] font-semibold">
                enter the city <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => pick("list")}
              className="group flex h-full w-full flex-col rounded-[22px] border border-[#e6dccd] bg-[#fffdf8] p-6 text-left text-ink shadow-[0_18px_40px_-28px_rgb(18_18_18/0.45)] transition-transform hover:-translate-y-0.5 md:p-7"
            >
              <span className="flex items-center justify-between">
                <span className={`${keyCap} border-ink/30`} aria-hidden="true">
                  2
                </span>
                <LayoutGrid size={26} strokeWidth={1.6} aria-hidden="true" className="text-ink/70" />
              </span>
              <span className="mt-6 font-display text-[2.1rem] leading-none tracking-[-0.02em]">normal website</span>
              <span className="mt-3 text-[1rem] leading-snug text-ink/75">everything on one clean page. fast, works everywhere.</span>
              <span className="mt-auto pt-7 text-[0.95rem] font-semibold">
                open the website <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </button>
          </li>
          <li>
            <a
              ref={agentLink}
              href="/agent/"
              onClick={() => pick("agent")}
              className="group flex h-full w-full flex-col rounded-[22px] border border-tiffany bg-ink p-6 text-left font-mono text-tiffany no-underline shadow-[0_0_0_1px_rgb(129_216_208/0.25),0_0_44px_-10px_rgb(129_216_208/0.55)] transition-transform hover:-translate-y-0.5 md:p-7"
            >
              <span className="flex items-center justify-between">
                <span className={`${keyCap} border-tiffany/60`} aria-hidden="true">
                  3
                </span>
                <Bot size={26} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="mt-6 text-[1.7rem] leading-none font-semibold">ai agent version</span>
              <span className="mt-3 text-[0.95rem] leading-snug">clean, structured, machine-readable.</span>
              <span className="mt-auto pt-7 text-[0.9rem] font-semibold">
                open the agent view <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </span>
            </a>
          </li>
        </ul>

        <div className="mt-7 flex flex-wrap items-center justify-end gap-4">
          <p className="text-[0.85rem] text-ink/70">
            press <kbd className="font-mono">1</kbd>, <kbd className="font-mono">2</kbd> or <kbd className="font-mono">3</kbd> · switch any time
          </p>
        </div>
      </div>
    </div>
  );
}
