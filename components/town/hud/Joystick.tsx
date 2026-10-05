"use client";

import { useRef } from "react";
import { runtime } from "../state";

const RADIUS = 46;

/** Virtual joystick for touch: writes a −1..1 vector to runtime.input.joy. */
export function Joystick() {
  const knob = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);

  const set = (dx: number, dy: number) => {
    const d = Math.hypot(dx, dy);
    const k = d > RADIUS ? RADIUS / d : 1;
    const x = dx * k;
    const y = dy * k;
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
    runtime.input.joy.x = x / RADIUS;
    runtime.input.joy.y = -y / RADIUS;
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-auto absolute bottom-[8.2rem] left-3 h-[112px] w-[112px] touch-none rounded-full border border-ink/15 bg-cream/70 shadow-[0_10px_30px_-12px_rgb(18_18_18/0.35)] backdrop-blur-sm"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
        runtime.input.joy.active = true;
        set(e.clientX - origin.current.x, e.clientY - origin.current.y);
      }}
      onPointerMove={(e) => {
        if (origin.current?.id !== e.pointerId) return;
        set(e.clientX - origin.current.x, e.clientY - origin.current.y);
      }}
      onPointerUp={() => {
        origin.current = null;
        runtime.input.joy = { x: 0, y: 0, active: false };
        if (knob.current) knob.current.style.transform = "";
      }}
      onPointerCancel={() => {
        origin.current = null;
        runtime.input.joy = { x: 0, y: 0, active: false };
        if (knob.current) knob.current.style.transform = "";
      }}
    >
      <div
        ref={knob}
        className="absolute top-1/2 left-1/2 -mt-7 -ml-7 h-14 w-14 rounded-full bg-tiffany shadow-[inset_0_-3px_0_rgb(18_18_18/0.15)] transition-transform duration-75"
      />
    </div>
  );
}
