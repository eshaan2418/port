"use client";

import { useEffect } from "react";
import { isDayTime } from "@/lib/time";
import { runtime, useTown } from "../state";
import { cityAudio } from "./engine";

/**
 * Bridges the store to the audio engine: picking free roam starts it (see
 * the chooser), or the first click / key if the city was reached without one; mirrors mute / volume / day-night, pauses while the tab is
 * hidden, ticks footsteps from the player's speed, and swells passing
 * motorcycle / sportscar engines by distance.
 */
export function AudioController() {
  const sound = useTown((s) => s.sound);
  const volume = useTown((s) => s.volume);
  const night = useTown((s) => !isDayTime(s.timeOfDay));

  useEffect(() => {
    if (sound && !cityAudio.started) void cityAudio.start();
    cityAudio.setEnabled(sound);
  }, [sound]);
  // audio only ever plays in free roam: leaving the city (switch mode / the list) silences it
  useEffect(() => () => cityAudio.setEnabled(false), []);

  // reached the city without a click (?view=city): start on the first click or key press
  useEffect(() => {
    if (cityAudio.status.enabled || useTown.getState().muted) return;
    const go = () => {
      if (!useTown.getState().muted) {
        cityAudio.startFromGesture();
        useTown.setState({ sound: true });
      }
      window.removeEventListener("pointerdown", go, true);
      window.removeEventListener("keydown", go, true);
    };
    window.addEventListener("pointerdown", go, true);
    window.addEventListener("keydown", go, true);
    return () => {
      window.removeEventListener("pointerdown", go, true);
      window.removeEventListener("keydown", go, true);
    };
  }, []);
  useEffect(() => cityAudio.setVolume(volume), [volume]);
  // ?audio=day / ?audio=night pins a variant (to compare them by ear); otherwise it follows the clock
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("audio");
    cityAudio.setVariant(forced === "day" || forced === "night" ? forced : night ? "night" : "day");
  }, [night]);

  useEffect(() => {
    const onVis = () => cityAudio.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // footsteps: ~1.4 steps per metre walked
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let phase = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const p = runtime.player;
      cityAudio.setThrust(p.thrust); // the suit's thrusters
      if (p.speed > 0.4 && !p.flying) {
        phase += p.speed * dt * 0.62;
        if (phase >= 1) {
          phase -= 1;
          cityAudio.step(p.speed > 4.5);
        }
      } else phase = 0.6; // first step lands quickly

      // passing vehicles: loudness from the nearest motorcycle / sportscar
      for (const kind of ["moto", "sports"] as const) {
        let best = Infinity;
        let v = 0;
        for (const c of runtime.traffic) {
          if (c.kind !== kind) continue;
          const d = Math.hypot(c.x - p.x, c.z - p.z);
          if (d < best) {
            best = d;
            v = c.v;
          }
        }
        const near = Math.max(0, 1 - best / 16) ** 2;
        cityAudio.setVehicle(kind, near * Math.min(1, 0.25 + v / 4), 0.7 + v / 7);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
