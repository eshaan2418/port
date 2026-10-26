"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { runtime } from "../state";

/**
 * Touch: hold ▲ to fly up (release to hover), hold ▼ to come down and land.
 * Keyboard users have Space / C (see Player). He tells you which (FlyHint).
 */
export function FlyButtons() {
  const hold = (key: "flyUp" | "flyDown") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      runtime.input[key] = true;
    },
    onPointerUp: () => (runtime.input[key] = false),
    onPointerCancel: () => (runtime.input[key] = false),
    onLostPointerCapture: () => (runtime.input[key] = false),
  });
  const btn =
    "pointer-events-auto flex h-14 w-14 touch-none items-center justify-center rounded-full border border-ink/15 bg-cream/80 text-ink shadow-[0_10px_30px_-12px_rgb(18_18_18/0.35)] backdrop-blur-sm active:bg-tiffany";
  return (
    <div className="absolute right-3 bottom-[8.2rem] flex flex-col gap-2.5">
      <button type="button" aria-label="Fly up (hold)" className={btn} {...hold("flyUp")}>
        <ChevronUp size={26} strokeWidth={2} />
      </button>
      <button type="button" aria-label="Fly down (hold)" className={btn} {...hold("flyDown")}>
        <ChevronDown size={26} strokeWidth={2} />
      </button>
    </div>
  );
}
