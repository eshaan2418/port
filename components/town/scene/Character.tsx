"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame pose updates. */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { runtime, useTown } from "../state";

/**
 * Eshaan. If /models/eshaan.glb exists it's used (clips: idle, walk, run, sit,
 * sleep, eat, type, read, kick, punch, skate, wave, celebrate — see README);
 * otherwise a low-poly placeholder built from primitives with procedural
 * poses. Both are driven by a `pose`: "auto" follows the player's movement
 * (idle / walk / run, plus his outdoor idles), anything else is a set pose
 * used by the Home routines.
 */
export const MODEL_URL = "/models/eshaan.glb";
export const CHARACTER_HEIGHT = 1.75;

/* Placeholder look: edit freely. */
export const LOOK = {
  skin: "#F3D5BC",
  skinShade: "#E6BC9C", // nose, ears
  cheeks: "#EDAFA0",
  hair: "#2A211D",
  eyes: "#1E1917",
  brows: "#2A211D",
  mouth: "#9C4E46",
  sweater: "#81D8D0",
  sweaterTrim: "#4FA9A0",
  trousers: "#2A2626",
  shoes: "#F37021",
  soles: "#F6EFE3",
};

export type Pose =
  | "auto"
  | "idle"
  | "sit"
  | "sleep"
  | "stretch"
  | "eat"
  | "type"
  | "read"
  | "relax"
  | "coffee"
  | "sunset"
  | "stargaze"
  | "wave"
  | "walk"
  | "stance"
  | "punch"
  | "kick"
  | "skate"
  | "present"
  | "cheer";

/** something on his feet (the rink) */
export type Gear = "inline" | "ice" | null;

/** clip to try for each pose when a glTF model is present */
const CLIP_FOR: Record<Exclude<Pose, "auto">, string[]> = {
  idle: ["idle"],
  sit: ["sit", "idle"],
  sleep: ["sleep", "idle"],
  stretch: ["celebrate", "idle"],
  eat: ["eat", "sit", "idle"],
  type: ["type", "sit", "idle"],
  read: ["read", "sit", "idle"],
  relax: ["sit", "idle"],
  coffee: ["idle"],
  sunset: ["idle"],
  stargaze: ["idle"],
  wave: ["wave", "idle"],
  walk: ["walk", "idle"],
  stance: ["idle"],
  punch: ["punch", "idle"],
  kick: ["kick", "idle"],
  skate: ["skate", "walk", "idle"],
  present: ["idle"],
  cheer: ["celebrate", "idle"],
};

/**
 * `suit`: the flight suit he wears outdoors (an original armour in the site's
 * palette: navy plates, orange accents, a Tiffany visor and chest core,
 * thrusters in the boots and palms). Interiors show him without it.
 */
export function Character({ pose = "auto", isPlayer = false, gear = null, suit = false }: { pose?: Pose; isPlayer?: boolean; gear?: Gear; suit?: boolean }) {
  const [hasModel, setHasModel] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => alive && setHasModel(r.ok && !(r.headers.get("content-type") ?? "").includes("text/html")))
      .catch(() => alive && setHasModel(false));
    return () => {
      alive = false;
    };
  }, []);

  if (hasModel) {
    return (
      <Suspense fallback={<Placeholder pose={pose} isPlayer={isPlayer} gear={gear} suit={suit} />}>
        <ModelCharacter pose={pose} isPlayer={isPlayer} />
      </Suspense>
    );
  }
  return <Placeholder pose={pose} isPlayer={isPlayer} gear={gear} suit={suit} />;
}

/** what "auto" resolves to this frame */
function resolvePose(pose: Pose): { kind: "move"; speed: number } | { kind: "pose"; pose: Exclude<Pose, "auto"> } {
  if (pose === "walk") return { kind: "move", speed: 1.9 }; // scripted walking (the Home actor in the intro)
  if (pose !== "auto") return { kind: "pose", pose };
  const p = runtime.player;
  if (p.speed > 0.2 || !p.idle) return { kind: "move", speed: p.speed };
  return { kind: "pose", pose: p.idle };
}

/* ── glTF model ──────────────────────────────────────────────────────── */
function ModelCharacter({ pose, isPlayer }: { pose: Pose; isPlayer: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene: original, animations } = useGLTF(MODEL_URL);
  // each instance (outdoor player, Home actor) needs its own copy
  const scene = useMemo(() => original.clone(true), [original]);
  const { actions } = useAnimations(animations, group);
  const current = useRef<string | null>(null);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const h = box.max.y - box.min.y || 1;
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return CHARACTER_HEIGHT / h;
  }, [scene]);

  const headParts = useMemo(() => {
    const out: THREE.Object3D[] = [];
    scene.traverse((o) => /head|hair|face|eye|brow|lash|teeth|tongue/i.test(o.name) && out.push(o));
    return out;
  }, [scene]);

  useFrame(() => {
    const pov = isPlayer && useTown.getState().pov;
    for (const o of headParts) o.visible = !pov;
    const r = resolvePose(pose);
    let want = "idle";
    if (r.kind === "move") want = r.speed > 4.2 && actions.run ? "run" : r.speed > 0.25 && actions.walk ? "walk" : "idle";
    else want = CLIP_FOR[r.pose].find((c) => actions[c]) ?? "idle";
    if (want !== current.current && actions[want]) {
      actions[want]!.reset().fadeIn(0.25).play();
      if (current.current) actions[current.current]?.fadeOut(0.25);
      current.current = want;
    }
    if (actions.walk) actions.walk.timeScale = Math.max(0.6, (r.kind === "move" ? r.speed : 0) / 3.2);
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
      <Props pose={pose} />
    </group>
  );
}

/* ── placeholder ─────────────────────────────────────────────────────── */

type Joints = {
  rootY: number;
  rootRX: number;
  torsoRX: number;
  headRX: number;
  headRY: number;
  shL: [number, number]; // shoulder x (− forward), z (out)
  shR: [number, number];
  elL: number; // elbow (− bends forward)
  elR: number;
  hipL: number; // thigh (− forward)
  hipR: number;
  kneeL: number; // shin (+ bends back)
  kneeR: number;
};

const REST: Joints = { rootY: 0, rootRX: 0, torsoRX: 0, headRX: 0, headRY: 0, shL: [0, 0.12], shR: [0, -0.12], elL: -0.12, elR: -0.12, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0 };
const SEAT = { rootY: -0.4, hipL: -1.5, hipR: -1.5, kneeL: 1.5, kneeR: 1.5 };

/** target joint angles for a pose at time t */
function poseJoints(pose: Exclude<Pose, "auto">, t: number): Joints {
  const j: Joints = { ...REST, shL: [...REST.shL], shR: [...REST.shR] };
  const sit = () => Object.assign(j, SEAT);
  switch (pose) {
    case "idle":
      j.headRY = Math.sin(t * 0.5) * 0.18;
      break;
    case "sit":
      sit();
      break;
    case "sleep":
      // lying on his back (the bed sets the height); a slow breath
      j.rootRX = -Math.PI / 2;
      j.torsoRX = Math.sin(t * 1.2) * 0.015;
      j.headRX = -0.15;
      j.shL = [0.1, 0.25];
      j.shR = [0.1, -0.25];
      break;
    case "stretch": {
      const k = 0.5 + 0.5 * Math.sin(t * 1.4);
      j.shL = [-2.9 + k * 0.25, 0.3];
      j.shR = [-2.9 + k * 0.25, -0.3];
      j.elL = -0.2;
      j.elR = -0.2;
      j.torsoRX = -0.12 * k;
      j.headRX = -0.25 * k;
      break;
    }
    case "type": {
      sit();
      j.shL = [-0.95, 0.12];
      j.shR = [-0.95, -0.12];
      j.elL = -0.75 + Math.sin(t * 14) * 0.05;
      j.elR = -0.75 + Math.sin(t * 13 + 1) * 0.05;
      j.headRX = 0.12;
      j.torsoRX = 0.08;
      break;
    }
    case "eat": {
      sit();
      const bite = Math.max(0, Math.sin(t * 1.6)) ** 2; // fork up to mouth, back down
      j.shR = [-0.9 - bite * 0.55, -0.15];
      j.elR = -0.8 - bite * 1.15;
      j.shL = [-0.7, 0.12];
      j.elL = -0.7;
      j.headRX = 0.12 - bite * 0.12;
      break;
    }
    case "read": {
      sit();
      j.shL = [-0.85, 0.22];
      j.shR = [-0.85, -0.22];
      j.elL = -1.25;
      j.elR = -1.25;
      j.headRX = 0.35 + Math.sin(t * 0.3) * 0.04;
      break;
    }
    case "relax": {
      sit();
      j.torsoRX = 0.28;
      j.headRX = -0.05;
      j.headRY = Math.sin(t * 0.25) * 0.15;
      j.shL = [-0.2, 0.35];
      j.shR = [-0.2, -0.35];
      j.elL = -0.6;
      j.elR = -0.6;
      break;
    }
    case "coffee": {
      const sip = Math.max(0, Math.sin(t * 0.9 - 1)) ** 4;
      j.shR = [-0.55 - sip * 0.7, -0.1];
      j.elR = -1.5 - sip * 0.55;
      j.headRX = -sip * 0.15;
      j.headRY = Math.sin(t * 0.4) * 0.12;
      break;
    }
    case "sunset":
      // hands on hips, taking it in
      j.shL = [0.15, 0.55];
      j.shR = [0.15, -0.55];
      j.elL = -1.25;
      j.elR = -1.25;
      j.headRX = -0.08;
      j.torsoRX = Math.sin(t * 0.8) * 0.01;
      break;
    case "stargaze":
      j.headRX = -0.75;
      j.torsoRX = -0.1;
      j.shL = [0.35, 0.08];
      j.shR = [0.35, -0.08];
      j.elL = -0.35;
      j.elR = -0.35;
      j.headRY = Math.sin(t * 0.2) * 0.25;
      break;
    case "stance": {
      // fighting stance: feet apart, fists up
      j.rootY = -0.1;
      j.hipL = -0.5;
      j.kneeL = 0.65;
      j.hipR = 0.35;
      j.kneeR = 0.25;
      j.shL = [-1.05, 0.25];
      j.elL = -1.7;
      j.shR = [-0.75, -0.2];
      j.elR = -1.8;
      j.torsoRX = 0.06 + Math.sin(t * 3) * 0.02;
      break;
    }
    case "punch":
      j.rootY = -0.1;
      j.hipL = -0.55;
      j.kneeL = 0.6;
      j.hipR = 0.4;
      j.kneeR = 0.2;
      j.shR = [-1.6, -0.05]; // right arm straight out
      j.elR = -0.05;
      j.shL = [-1.0, 0.3];
      j.elL = -1.8;
      j.torsoRX = 0.12;
      break;
    case "kick":
      j.hipR = -1.7; // right leg up high
      j.kneeR = 0.12;
      j.hipL = 0.1;
      j.shL = [-0.3, 1.0];
      j.shR = [-0.3, -1.0];
      j.elL = -0.3;
      j.elR = -0.3;
      j.torsoRX = -0.2;
      j.headRX = 0.1;
      break;
    case "skate": {
      // low and leaning forward, alternating pushes, arms swinging
      const s = Math.sin(t * 5.5);
      j.rootY = -0.16;
      j.torsoRX = 0.55;
      j.headRX = -0.45;
      j.hipL = -0.75 + s * 0.35;
      j.kneeL = 0.95 - s * 0.2;
      j.hipR = -0.75 - s * 0.35;
      j.kneeR = 0.95 + s * 0.2;
      j.shL = [s * 0.9, 0.2];
      j.shR = [-s * 0.9, -0.2];
      j.elL = -0.4;
      j.elR = -0.4;
      break;
    }
    case "present":
      // an open hand toward what he's showing
      j.shR = [-1.0, -0.75];
      j.elR = -0.15;
      j.headRY = -0.25;
      break;
    case "cheer":
      j.shL = [-2.95, 0.35 + Math.sin(t * 6) * 0.08];
      j.shR = [-2.95, -0.35 - Math.sin(t * 6) * 0.08];
      j.elL = -0.15;
      j.elR = -0.15;
      j.headRX = -0.2;
      j.rootY = Math.abs(Math.sin(t * 6)) * 0.05;
      break;
    case "wave":
      // hand up beside his head, swaying side to side (reads from the front)
      j.shR = [-0.15, -2.45 + Math.sin(t * 8) * 0.28];
      j.elR = -0.3;
      j.headRX = -0.05;
      j.headRY = 0.08;
      break;
  }
  return j;
}

/** the suit's materials (shared) */
const SUIT = {
  armor: new THREE.MeshStandardMaterial({ color: "#1c2e5e", roughness: 0.32, metalness: 0.6, flatShading: true }),
  armorDark: new THREE.MeshStandardMaterial({ color: "#121d3d", roughness: 0.38, metalness: 0.55, flatShading: true }),
  accent: new THREE.MeshStandardMaterial({ color: "#f37021", roughness: 0.35, metalness: 0.45, flatShading: true }),
  glow: new THREE.MeshStandardMaterial({ color: "#c9f4ef", emissive: new THREE.Color("#81d8d0"), emissiveIntensity: 2.2, roughness: 0.2 }),
  flame: new THREE.MeshBasicMaterial({ color: "#ffb35c", transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  flameCore: new THREE.MeshBasicMaterial({ color: "#bff3ee", transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
};
const CRUISE = 8; // the suit's cruise speed (see Player FLY_SPEED)

function Placeholder({ pose, isPlayer, gear = null, suit = false }: { pose: Pose; isPlayer: boolean; gear?: Gear; suit?: boolean }) {
  const m = useMemo(() => {
    const mat = (c: string, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: true });
    return {
      skin: mat(LOOK.skin, 0.7),
      skinShade: mat(LOOK.skinShade, 0.75),
      cheeks: new THREE.MeshStandardMaterial({ color: LOOK.cheeks, roughness: 0.9, transparent: true, opacity: 0.55 }),
      hair: mat(LOOK.hair, 0.6),
      sweater: mat(LOOK.sweater),
      trim: mat(LOOK.sweaterTrim),
      trousers: mat(LOOK.trousers),
      shoes: mat(LOOK.shoes, 0.5),
      soles: mat(LOOK.soles),
      eye: mat(LOOK.eyes, 0.3),
      brow: mat(LOOK.brows, 0.6),
      mouth: mat(LOOK.mouth, 0.6),
    };
  }, []);

  const jRoot = useRef<THREE.Group>(null);
  const jTorso = useRef<THREE.Group>(null);
  const jHead = useRef<THREE.Group>(null);
  const jShL = useRef<THREE.Group>(null);
  const jShR = useRef<THREE.Group>(null);
  const jElL = useRef<THREE.Group>(null);
  const jElR = useRef<THREE.Group>(null);
  const jHipL = useRef<THREE.Group>(null);
  const jHipR = useRef<THREE.Group>(null);
  const jKneeL = useRef<THREE.Group>(null);
  const jKneeR = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const cur = useRef<Joints>({ ...REST, shL: [...REST.shL], shR: [...REST.shR] });
  const flames = useRef<(THREE.Group | null)[]>([]);
  // body materials: the clothes, or the suit
  const body = suit ? SUIT.armor : m.sweater;
  const trimM = suit ? SUIT.accent : m.trim;
  const legM = suit ? SUIT.armorDark : m.trousers;
  const shoeM = suit ? SUIT.accent : m.shoes;
  const soleM = suit ? SUIT.armorDark : m.soles;
  const handM = suit ? SUIT.accent : m.skin;

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const r = resolvePose(pose);
    let target: Joints;
    const fp = runtime.player;
    const flying = suit && isPlayer && fp.flying;
    if (flying) {
      // flight: hovering upright with palms down, leaning into it as he speeds up
      const lean = Math.min(1, fp.speed / CRUISE);
      const out = 0.42 * (1 - lean) + 0.1;
      target = {
        ...REST,
        rootRX: lean * 1.15,
        rootY: 0.3 * lean + Math.sin(t * 2.2) * 0.03,
        torsoRX: -0.05 * lean,
        headRX: -lean * 0.85,
        headRY: 0,
        shL: [0.15 + lean * 0.35, out],
        shR: [0.15 + lean * 0.35, -out],
        elL: -0.12,
        elR: -0.12,
        hipL: 0.04 + Math.sin(t * 1.7) * 0.03,
        hipR: -0.04 - Math.sin(t * 1.7) * 0.03,
        kneeL: 0.18 * (1 - lean) + 0.04,
        kneeR: 0.12 * (1 - lean) + 0.04,
      };
    } else if (r.kind === "move") {
      const run = r.speed > 4.2;
      phase.current += dt * r.speed * (run ? 2.0 : 2.6);
      const a = Math.min(1, r.speed / 3.2) * (run ? 1.25 : 1);
      const s = Math.sin(phase.current);
      target = {
        ...REST,
        rootY: Math.abs(Math.cos(phase.current)) * 0.07 * a + Math.sin(t * 2.1) * 0.012 * (1 - a),
        torsoRX: (run ? 0.22 : 0.06) * a,
        headRX: -0.04 * a,
        headRY: Math.sin(t * 0.5) * 0.18 * (1 - a),
        shL: [-s * 0.7 * a, 0.12],
        shR: [s * 0.7 * a, -0.12],
        elL: -0.2 - Math.max(0, -s) * 0.5 * a,
        elR: -0.2 - Math.max(0, s) * 0.5 * a,
        hipL: s * 0.75 * a,
        hipR: -s * 0.75 * a,
        kneeL: Math.max(0, -s) * 0.9 * a + 0.05,
        kneeR: Math.max(0, s) * 0.9 * a + 0.05,
      };
    } else {
      target = poseJoints(r.pose, t);
    }

    // ease every joint toward its target (fast while walking, softer for poses)
    const k = 1 - Math.exp(-dt * (flying ? 5 : r.kind === "move" ? 16 : 6));
    const c = cur.current;
    const L = (a: number, b: number) => a + (b - a) * k;
    c.rootY = L(c.rootY, target.rootY);
    c.rootRX = L(c.rootRX, target.rootRX);
    c.torsoRX = L(c.torsoRX, target.torsoRX);
    c.headRX = L(c.headRX, target.headRX);
    c.headRY = L(c.headRY, target.headRY);
    c.shL = [L(c.shL[0], target.shL[0]), L(c.shL[1], target.shL[1])];
    c.shR = [L(c.shR[0], target.shR[0]), L(c.shR[1], target.shR[1])];
    for (const key of ["elL", "elR", "hipL", "hipR", "kneeL", "kneeR"] as const) c[key] = L(c[key], target[key]);

    jRoot.current!.position.y = c.rootY;
    jRoot.current!.rotation.x = c.rootRX;
    jTorso.current!.rotation.x = c.torsoRX;
    jHead.current!.rotation.set(c.headRX, c.headRY, 0);
    jShL.current!.rotation.set(c.shL[0], 0, c.shL[1]);
    jShR.current!.rotation.set(c.shR[0], 0, c.shR[1]);
    jElL.current!.rotation.x = c.elL;
    jElR.current!.rotation.x = c.elR;
    jHipL.current!.rotation.x = c.hipL;
    jHipR.current!.rotation.x = c.hipR;
    jKneeL.current!.rotation.x = c.kneeL;
    jKneeR.current!.rotation.x = c.kneeR;
    jHead.current!.visible = !(isPlayer && useTown.getState().pov); // first person: no head in your eyes
    // thruster flames (boots + palms), flickering with the thrust
    const th = suit && isPlayer ? fp.thrust : 0;
    for (const f of flames.current) {
      if (!f) continue;
      f.visible = th > 0.03;
      if (f.visible) f.scale.set(0.7 + th * 0.5, th * (0.85 + Math.random() * 0.35), 0.7 + th * 0.5);
    }
  });

  /** a thruster flame pointing down from where it's attached */
  const flame = (at: [number, number, number], r: number, len: number, i: number) => (
    <group ref={(g) => void (flames.current[i] = g)} position={at} visible={false}>
      <mesh position={[0, -len / 2, 0]} rotation-x={Math.PI} material={SUIT.flame}>
        <coneGeometry args={[r, len, 10, 1, true]} />
      </mesh>
      <mesh position={[0, -len * 0.3, 0]} rotation-x={Math.PI} material={SUIT.flameCore}>
        <coneGeometry args={[r * 0.5, len * 0.6, 8, 1, true]} />
      </mesh>
    </group>
  );

  const leg = (hip: React.RefObject<THREE.Group | null>, knee: React.RefObject<THREE.Group | null>, x: number, i: number) => (
    <group ref={hip} position={[x, 0.88, 0]}>
      <mesh position={[0, -0.21, 0]} material={legM} castShadow>
        <capsuleGeometry args={[0.105, 0.3, 3, 8]} />
      </mesh>
      <group ref={knee} position={[0, -0.43, 0]}>
        <mesh position={[0, -0.18, 0]} material={legM} castShadow>
          <capsuleGeometry args={[0.095, 0.28, 3, 8]} />
        </mesh>
        {suit && (
          // knee guard + a shin plate
          <>
            <mesh position={[0, 0.0, 0.08]} material={SUIT.accent}>
              <sphereGeometry args={[0.07, 8, 6]} />
            </mesh>
            <mesh position={[0, -0.2, 0.085]} material={SUIT.armor}>
              <boxGeometry args={[0.13, 0.24, 0.04]} />
            </mesh>
          </>
        )}
        <mesh position={[0, -0.4, 0.07]} material={shoeM} castShadow>
          <boxGeometry args={[0.17, 0.11, 0.32]} />
        </mesh>
        <mesh position={[0, -0.46, 0.07]} material={soleM}>
          <boxGeometry args={[0.18, 0.03, 0.33]} />
        </mesh>
        {suit && flame([0, -0.48, 0.02], 0.075, 0.42, i)}
        {gear && <Skate kind={gear} />}
      </group>
    </group>
  );

  const arm = (sh: React.RefObject<THREE.Group | null>, el: React.RefObject<THREE.Group | null>, x: number, right: boolean, i: number) => (
    <group ref={sh} position={[x, 0.5, 0]}>
      <mesh position={[0, -0.13, 0]} material={body} castShadow>
        <capsuleGeometry args={[0.075, 0.16, 3, 8]} />
      </mesh>
      {suit && (
        // a shoulder plate
        <mesh position={[x > 0 ? 0.02 : -0.02, 0.0, 0]} material={SUIT.accent}>
          <sphereGeometry args={[0.105, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      )}
      <group ref={el} position={[0, -0.27, 0]}>
        <mesh position={[0, -0.11, 0]} material={suit ? SUIT.accent : m.sweater} castShadow>
          <capsuleGeometry args={[suit ? 0.075 : 0.068, 0.15, 3, 8]} />
        </mesh>
        <mesh position={[0, -0.25, 0]} material={handM}>
          <icosahedronGeometry args={[0.072, 1]} />
        </mesh>
        {suit && (
          // the palm repulsor
          <mesh position={[0, -0.3, 0]} rotation-x={Math.PI / 2} material={SUIT.glow}>
            <circleGeometry args={[0.03, 12]} />
          </mesh>
        )}
        {suit && flame([0, -0.31, 0], 0.045, 0.24, i)}
        {right && !suit && <HandProp pose={pose} />}
      </group>
    </group>
  );

  return (
    <group ref={jRoot}>
      {leg(jHipL, jKneeL, -0.12, 0)}
      {leg(jHipR, jKneeR, 0.12, 1)}
      <group ref={jTorso} position={[0, 0.9, 0]}>
        <mesh position={[0, 0.3, 0]} material={body} castShadow>
          <capsuleGeometry args={[0.22, 0.32, 4, 10]} />
        </mesh>
        <mesh position={[0, 0.05, 0]} material={trimM}>
          <cylinderGeometry args={[0.235, 0.235, 0.07, 12]} />
        </mesh>
        <mesh position={[0, 0.6, 0]} material={trimM}>
          <cylinderGeometry args={[0.1, 0.12, 0.07, 10]} />
        </mesh>
        {suit && (
          // chest plate with the glowing core, and a pair of ab plates
          <>
            <mesh position={[0, 0.4, 0.17]} rotation-x={-0.1} material={SUIT.accent}>
              <boxGeometry args={[0.3, 0.2, 0.08]} />
            </mesh>
            <mesh position={[0, 0.42, 0.215]} material={SUIT.glow}>
              <circleGeometry args={[0.048, 16]} />
            </mesh>
            <mesh position={[0, 0.42, 0.212]} material={SUIT.armorDark}>
              <torusGeometry args={[0.058, 0.012, 6, 16]} />
            </mesh>
            {[-0.06, 0.06].map((x) => (
              <mesh key={x} position={[x, 0.2, 0.2]} material={SUIT.armorDark}>
                <boxGeometry args={[0.1, 0.1, 0.03]} />
              </mesh>
            ))}
          </>
        )}
        {arm(jShL, jElL, -0.3, false, 2)}
        {arm(jShR, jElR, 0.3, true, 3)}

        {suit ? (
          <group ref={jHead} position={[0, 0.8, 0]}>
            {/* helmet: shell, an orange faceplate, a glowing visor slit */}
            <mesh material={SUIT.armor} castShadow>
              <icosahedronGeometry args={[0.215, 2]} />
            </mesh>
            <mesh position={[0, -0.03, 0.105]} scale={[0.9, 0.95, 0.65]} material={SUIT.accent}>
              <sphereGeometry args={[0.19, 14, 10, -Math.PI / 2, Math.PI, 0.5, 2.1]} />
            </mesh>
            <mesh position={[0, 0.03, 0.205]} material={SUIT.glow}>
              <boxGeometry args={[0.2, 0.035, 0.02]} />
            </mesh>
            <mesh position={[0, 0.17, 0.04]} rotation-x={-0.3} material={SUIT.armorDark}>
              <boxGeometry args={[0.05, 0.03, 0.3]} />
            </mesh>
          </group>
        ) : (
        <group ref={jHead} position={[0, 0.8, 0]}>
          <mesh material={m.skin} castShadow>
            <icosahedronGeometry args={[0.2, 2]} />
          </mesh>
          {/* short dark hair: a close cap, a tidy swept fringe, trimmed sides */}
          <mesh position={[0, 0.055, -0.02]} scale={[1.05, 0.78, 1.06]} material={m.hair} castShadow>
            <sphereGeometry args={[0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          </mesh>
          <mesh position={[0.03, 0.135, 0.13]} rotation={[0.85, 0.15, -0.12]} scale={[1, 0.5, 1]} material={m.hair}>
            <sphereGeometry args={[0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.178, 0.04, -0.03]} rotation-z={sx * 0.2} scale={[0.35, 1, 0.9]} material={m.hair}>
              <sphereGeometry args={[0.1, 8, 6]} />
            </mesh>
          ))}
          {/* face */}
          {[-0.068, 0.068].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.005, 0.18]} scale={[1, 1.25, 0.6]} material={m.eye}>
                <sphereGeometry args={[0.021, 8, 6]} />
              </mesh>
              <mesh position={[x, 0.065, 0.178]} rotation-z={x > 0 ? -0.12 : 0.12} material={m.brow}>
                <boxGeometry args={[0.06, 0.013, 0.012]} />
              </mesh>
              <mesh position={[x * 1.45, -0.05, 0.155]} rotation-y={x > 0 ? 0.5 : -0.5} material={m.cheeks}>
                <circleGeometry args={[0.028, 12]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, -0.025, 0.196]} scale={[0.8, 1, 0.9]} material={m.skinShade}>
            <sphereGeometry args={[0.022, 8, 6]} />
          </mesh>
          <mesh position={[0, -0.085, 0.176]} rotation-z={Math.PI} material={m.mouth}>
            <torusGeometry args={[0.032, 0.008, 4, 12, Math.PI]} />
          </mesh>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, -0.01, 0]} scale={[0.6, 1, 0.9]} material={m.skinShade}>
              <sphereGeometry args={[0.045, 8, 6]} />
            </mesh>
          ))}
        </group>
        )}
      </group>
      <Props pose={pose} />
    </group>
  );
}

/* ── skates (on each foot, under the shoe) ────────────────────────────── */
const skateMats = {
  boot: new THREE.MeshStandardMaterial({ color: "#F6EFE3", roughness: 0.6, flatShading: true }),
  frame: new THREE.MeshStandardMaterial({ color: "#2A2626", roughness: 0.5 }),
  wheel: new THREE.MeshStandardMaterial({ color: "#F37021", roughness: 0.4, flatShading: true }),
  blade: new THREE.MeshStandardMaterial({ color: "#DCE7EE", roughness: 0.15, metalness: 0.8 }),
};
function Skate({ kind }: { kind: "inline" | "ice" }) {
  return (
    <group position={[0, -0.5, 0.07]}>
      <mesh position={[0, 0.1, -0.02]} material={skateMats.boot}>
        <boxGeometry args={[0.2, 0.14, 0.3]} />
      </mesh>
      {kind === "inline" ? (
        <>
          <mesh position={[0, -0.03, 0]} material={skateMats.frame}>
            <boxGeometry args={[0.05, 0.04, 0.34]} />
          </mesh>
          {[-0.13, -0.045, 0.045, 0.13].map((z) => (
            <mesh key={z} position={[0, -0.07, z]} rotation-z={Math.PI / 2} material={skateMats.wheel}>
              <cylinderGeometry args={[0.04, 0.04, 0.035, 10]} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh position={[0, -0.06, 0.01]} material={skateMats.blade}>
          <boxGeometry args={[0.015, 0.07, 0.38]} />
        </mesh>
      )}
    </group>
  );
}

/* ── props that belong to a pose ──────────────────────────────────────── */
const propMats = {
  mug: new THREE.MeshStandardMaterial({ color: "#F37021", roughness: 0.5, flatShading: true }),
  fork: new THREE.MeshStandardMaterial({ color: "#C7CBCF", roughness: 0.3, metalness: 0.7 }),
  book: new THREE.MeshStandardMaterial({ color: "#4FA9A0", roughness: 0.8, flatShading: true }),
  pages: new THREE.MeshStandardMaterial({ color: "#F6EFE3", roughness: 0.9 }),
};

/** held in the right hand (attached under the elbow) */
function HandProp({ pose }: { pose: Pose }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const r = resolvePose(pose);
    const which = r.kind === "pose" ? r.pose : null;
    const g = ref.current!;
    g.children.forEach((c) => (c.visible = c.name === which));
  });
  return (
    <group ref={ref} position={[0, -0.3, 0.03]}>
      <group name="coffee">
        <mesh position={[0, 0.02, 0.06]} material={propMats.mug}>
          <cylinderGeometry args={[0.055, 0.05, 0.12, 12]} />
        </mesh>
        <mesh position={[0.06, 0.02, 0.06]} rotation-y={Math.PI / 2} material={propMats.mug}>
          <torusGeometry args={[0.03, 0.01, 6, 10]} />
        </mesh>
      </group>
      <group name="eat">
        <mesh position={[0, 0.02, 0.08]} rotation-x={Math.PI / 2} material={propMats.fork}>
          <boxGeometry args={[0.015, 0.16, 0.008]} />
        </mesh>
      </group>
    </group>
  );
}

/** in front of him: the open book when reading */
function Props({ pose }: { pose: Pose }) {
  const book = useRef<THREE.Group>(null);
  useFrame(() => {
    const r = resolvePose(pose);
    book.current!.visible = r.kind === "pose" && r.pose === "read";
  });
  return (
    <group ref={book} position={[0, 0.98, 0.34]} rotation-x={-0.9}>
      {[-1, 1].map((s) => (
        <group key={s} rotation-y={s * 0.25}>
          <mesh position={[s * 0.1, 0, 0]} material={propMats.book}>
            <boxGeometry args={[0.2, 0.26, 0.015]} />
          </mesh>
          <mesh position={[s * 0.1, 0, 0.01]} material={propMats.pages}>
            <boxGeometry args={[0.18, 0.24, 0.01]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
