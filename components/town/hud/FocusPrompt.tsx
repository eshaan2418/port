"use client";

import { useEffect, useRef } from "react";
import { runtime, useTown } from "../state";

/**
 * Shown when the camera has lost Eshaan (panned away, or he's off-screen /
 * hidden for over a second): a pill near the bottom, plus an arrow on the
 * screen edge pointing toward him when he's out of frame. Click / tap the
 * pill (or him, or press F) to bring the camera back. Never shown in
 * first person or inside an interior (CameraRig clears the flag there).
 */
export function FocusPrompt({ touch }: { touch: boolean }) {
  const lost = useTown((s) => s.focusLost);
  const interior = useTown((s) => s.interior);
  const pov = useTown((s) => s.pov);
  const arrow = useRef<HTMLDivElement>(null);
  const show = lost && !interior && !pov;

  // edge arrow follows his projected position every frame
  useEffect(() => {
    if (!show) return;
    let raf = 0;
    const loop = () => {
      const el = arrow.current;
      const f = runtime.focus;
      if (el) {
        el.style.opacity = f.offscreen ? "1" : "0";
        if (f.offscreen) {
          const ang = Math.atan2(-f.sy, f.sx); // screen space (y down)
          const w = window.innerWidth / 2 - 36;
          const h = window.innerHeight / 2 - 36;
          const k = Math.min(w / Math.abs(Math.cos(ang) || 1e-3), h / Math.abs(Math.sin(ang) || 1e-3));
          el.style.transform = `translate(${Math.cos(ang) * k}px, ${Math.sin(ang) * k}px) rotate(${ang}rad)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;
  return (
    <>
      <div className="absolute inset-x-0 top-[8.6rem] flex justify-center px-3 md:top-auto md:bottom-[8.8rem]">
        <button
          type="button"
          onClick={() => (runtime.camera.recenter = true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/85 px-4 py-2 text-[0.82rem] text-cream shadow-[0_10px_30px_-14px_rgb(18_18_18/0.5)] backdrop-blur-md transition-colors hover:bg-ink"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tiffany opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tiffany" />
          </span>
          {touch ? "tap eshaan to get back focus" : "click on eshaan to get back focus"}
          {!touch && <kbd className="rounded border border-cream/30 px-1.5 font-mono text-[0.7rem]">F</kbd>}
        </button>
      </div>
      <div className="absolute top-1/2 left-1/2 -mt-4 -ml-4" aria-hidden="true">
        <div ref={arrow} className="h-8 w-8 opacity-0 transition-opacity">
          <svg viewBox="0 0 32 32" className="h-8 w-8 drop-shadow">
            <circle cx="16" cy="16" r="15" fill="#121212" fillOpacity="0.8" />
            <path d="M11 9l10 7-10 7z" fill="#81D8D0" />
          </svg>
        </div>
      </div>
    </>
  );
}
