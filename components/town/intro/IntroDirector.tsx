"use client";

import { useFrame } from "@react-three/fiber";
import { useTown } from "../state";
import { intro, nextPhase, tickPhase } from "./intro";

/** Runs the intro timeline on frame time (so it pauses with the tab). */
export function IntroDirector() {
  useFrame((_, rawDt) => {
    if (!intro.phase || intro.skipping || !useTown.getState().ready) return;
    const dt = Math.min(rawDt, 0.1);
    tickPhase(dt);
    if (intro.t >= intro.dur) nextPhase();
  });
  return null;
}
