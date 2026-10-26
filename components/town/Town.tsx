"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTown, runtime } from "./state";
import { setPov, togglePov } from "./controls";
import { registry } from "./world/registry";
import { Buildings } from "./scene/Buildings";
import { CameraRig } from "./scene/CameraRig";
import { Island } from "./scene/Island";
import { Player, spawnPoint } from "./scene/Player";
import { PointerInput } from "./scene/PointerInput";
import { Benches, Clouds, Fountain, Trees } from "./scene/Props";
import { SignPosts } from "./scene/SignPosts";
import { Sky } from "./scene/Sky";
import { Skyline } from "./scene/Skyline";
import { StreetProps } from "./scene/StreetProps";
import { TimeOfDay } from "./scene/TimeOfDay";
import { Pigeons, Traffic } from "./scene/Traffic";
import { AudioController } from "./audio/AudioController";
import { cityAudio } from "./audio/engine";
import { Hud } from "./hud/Hud";
import { Birds, Cat, Fireflies } from "./scene/Ambient";
import { Interiors } from "./interior/Interiors";
import { enterBuilding, leaveInterior } from "./interior/transitions";
import { IntroDirector } from "./intro/IntroDirector";
import { abortIntro, beginIntro, cameraDefaults, intro as introState, skipIntro } from "./intro/intro";
import { COLLIDERS, FLY_CEILING } from "./world/layout";

/** Phones / tablets get the light build: no shadows, dpr ≤ 1.5, fewer props. */
function useLowDetail() {
  const [low] = useState(
    () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768),
  );
  return low;
}

export default function Town() {
  const lowDetail = useLowDetail();
  const active = useTown((s) => s.mode === "town");
  const setLoading = useTown((s) => s.setLoading);

  useEffect(() => {
    setLoading(0.55);
    const s = spawnPoint();
    Object.assign(runtime.player, { x: s.x, y: 0, z: s.z, yaw: s.yaw, speed: 0 });
    runtime.camera.yaw = 0; // camera on the square side, looking back at Eshaan and his front door
    // portrait phones need more boom (and a flatter angle) to fit the door + sign
    Object.assign(runtime.camera, cameraDefaults(lowDetail));
    // dev-only handle for the screenshot harness (scripts/screenshot.mjs)
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __town: unknown }).__town = { runtime, useTown, setPov, cityAudio, leaveInterior, enterBuilding, skipIntro, intro: introState, colliders: COLLIDERS, ceiling: FLY_CEILING };
    }
  }, [setLoading, lowDetail]);

  // the opening sequence, once the world is up (intro/intro.ts)
  const ready = useTown((s) => s.ready);
  useEffect(() => {
    if (ready) beginIntro();
  }, [ready]);

  // the simulated clock runs in real time
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const s = useTown.getState();
      s.setTimeOfDay(s.timeOfDay + (now - last) / 3_600_000);
      last = now;
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // keyboard → runtime.input (ignored while typing in a field)
  useEffect(() => {
    const keys = runtime.input.keys;
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      // during the intro nothing is controllable; only Esc / Enter (skip)
      if (useTown.getState().intro) {
        if ((e.key === "Escape" || e.key === "Enter") && !e.repeat && useTown.getState().ready) {
          e.preventDefault();
          skipIntro();
        }
        return;
      }
      if (e.key === "?" && !e.repeat) useTown.getState().openStart();
      // M: a silent mute / unmute (no visible sound control)
      if (e.code === "KeyM" && !e.repeat) {
        const st = useTown.getState();
        if (!st.sound && !cityAudio.started) cityAudio.startFromGesture();
        st.toggleSound();
      }
      if (e.code === "KeyE" && !e.repeat) runtime.input.enter = true;
      if (e.code === "KeyV" && !e.repeat && !useTown.getState().interior) togglePov();
      if (e.code === "Escape" && useTown.getState().pov) setPov(false);
      if (e.code === "KeyF" && !e.repeat && !useTown.getState().startOpen) runtime.camera.recenter = true; // get the camera back to Eshaan
      // Space = fly up (held; see Player). Let Space still press a focused button.
      if (e.code === "Space") {
        if (t.tagName === "BUTTON" || useTown.getState().startOpen) return;
        e.preventDefault();
      }
      if (e.code.startsWith("Arrow")) e.preventDefault();
      keys.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => keys.delete(e.code);
    const clear = () => keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-cream">
      <div aria-hidden="true" className="absolute inset-0">
        <Canvas
          frameloop={active ? "always" : "never"}
          shadows={!lowDetail}
          dpr={lowDetail ? [1, 1.5] : [1, 2]}
          camera={{ fov: 45, near: 0.1, far: 500, position: [0, 6, 0] }}
          gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, powerPreference: "high-performance" }}
          onCreated={({ gl, scene, camera }) => {
            registry.canvas = gl.domElement;
            if (process.env.NODE_ENV !== "production") Object.assign((window as unknown as { __town: object }).__town ?? {}, { scene, camera });
            setLoading(0.7);
          }}
        >
          <Suspense fallback={null}>
            <World lowDetail={lowDetail} />
            <ReadySignal />
            <PerfCheck />
          </Suspense>
        </Canvas>
      </div>
      <AudioController />
      <Hud touch={lowDetail} />
    </div>
  );
}

function World({ lowDetail }: { lowDetail: boolean }) {
  return (
    <>
      <Sky />
      <TimeOfDay lowDetail={lowDetail} />
      <Island lowDetail={lowDetail} />
      <Skyline lowDetail={lowDetail} />
      <Buildings />
      <SignPosts />
      <StreetProps lowDetail={lowDetail} />
      <Trees />
      <Benches />
      <Fountain lowDetail={lowDetail} />
      <Traffic lowDetail={lowDetail} />
      <Pigeons lowDetail={lowDetail} />
      <Clouds lowDetail={lowDetail} />
      <Fireflies lowDetail={lowDetail} />
      <Cat />
      <Birds lowDetail={lowDetail} />
      <IntroDirector />
      <Interiors />
      <Player />
      <CameraRig />
      <PointerInput />
    </>
  );
}

/**
 * Weak-device check: right after load, sample ~60 frames (skipping the first
 * few, which compile shaders). If the median frame takes longer than ~42 ms
 * (under ~24 fps), fall back to the list view with a notice; "enter the town
 * anyway" brings you back (and isn't second-guessed).
 */
function PerfCheck() {
  const samples = useRef<number[]>([]);
  const done = useRef(false);
  useFrame((_, dt) => {
    if (done.current) return;
    const s = useTown.getState();
    if (!s.ready || document.hidden) return;
    if (s.chosen) {
      done.current = true;
      return;
    }
    samples.current.push(dt);
    if (samples.current.length < 75) return;
    done.current = true;
    const sorted = samples.current.slice(12).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0.042) {
      abortIntro();
      s.setMode("list", "the 3D city looks slow on this device");
    }
  });
  return null;
}

/** Flags the loading screen done once the world has rendered a couple of frames. */
function ReadySignal() {
  const setReady = useTown((s) => s.setReady);
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current++ === 2) setReady();
  });
  return null;
}
