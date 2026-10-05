"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame updates. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { activityAt, type Activity, type HomeRoom } from "@/lib/schedule";
import { runtime, useTown, type IntroPhase } from "../state";
import { getMats } from "../scene/materials";
import { Character, type Pose } from "../scene/Character";
import { intro } from "../intro/intro";
import { BOARD_FONTS } from "../scene/Buildings";
import { sampleSky } from "../scene/skyKeys";
import { HOUSE, ROOMS, STAGE, floorY, roomDef } from "./rooms";
import { speak } from "./transitions";

const { w: W, d: D, floorH: FH, wall: WALL } = HOUSE;

/** where he is for each activity spot: floor, local position, facing */
const SPOTS: Record<Activity["spot"], { floor: number; pos: [number, number, number]; yaw: number }> = {
  bed: { floor: 2, pos: [-0.25, 0.56, -1.2], yaw: Math.PI / 2 }, // feet at the foot of the bed, head toward −x
  bedside: { floor: 2, pos: [1.2, 0, 0.3], yaw: 0 },
  table: { floor: 0, pos: [0.7, 0, -0.62], yaw: 0 }, // facing the camera across the table
  desk: { floor: 1, pos: [-0.75, 0, -0.95], yaw: Math.PI }, // back to us, screen toward us
  armchair: { floor: 1, pos: [1.95, 0.02, 0.55], yaw: -0.45 },
};

const local = (floor: number, x: number, y: number, z: number) => new THREE.Vector3(STAGE.x + x, floorY(floor) + y, STAGE.z + z);

type V3 = [number, number, number];
/**
 * Intro choreography per spot: where he sits up (from the bed), where he
 * stands, and his way out of the room (to the stairs, front right).
 */
const INTRO_MOVES: Record<Activity["spot"], { sit?: { pos: V3; yaw: number }; stand: V3; path: [number, number][] }> = {
  bed: { sit: { pos: [-1.0, 0.08, -0.55], yaw: 0 }, stand: [-0.95, 0, 0.05], path: [[0.6, 0.9], [2.55, 1.6]] },
  bedside: { stand: [1.2, 0, 0.3], path: [[2.55, 1.6]] },
  table: { stand: [1.45, 0, -0.55], path: [[2.0, 0.45], [2.55, 1.6]] },
  desk: { stand: [-0.75, 0, -0.4], path: [[0.6, 1.35], [2.6, 1.75]] },
  armchair: { stand: [1.7, 0, 1.25], path: [[2.6, 1.75]] },
};

const SEATED: Pose[] = ["eat", "type", "read", "relax", "sit"];

/** his pose for the activity, given where the intro is */
function introPose(act: Activity, phase: IntroPhase | null): Pose {
  switch (phase) {
    case "notice":
    case "speak":
      return act.pose === "stretch" ? "idle" : "sit"; // sat up in bed / turned round in his chair
    case "getup":
    case "out":
    case "wave":
    case "swing":
      return "idle";
    case "walk":
      return "walk";
    default:
      return act.pose;
  }
}

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/* ── a scrolling "code" texture for the monitor ─────────────────────── */
function useCodeTexture() {
  return useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 256;
    cv.height = 256;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#14161c";
    g.fillRect(0, 0, 256, 256);
    const colors = ["#81D8D0", "#F37021", "#F6EFE3", "#8aa0b8", "#F6EFE3", "#f6c177"];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 8; y < 256; y += 11) {
      let x = 10 + Math.floor(rnd() * 4) * 12;
      const words = 1 + Math.floor(rnd() * 5);
      for (let k = 0; k < words && x < 240; k++) {
        const len = 12 + rnd() * 46;
        g.fillStyle = colors[Math.floor(rnd() * colors.length)];
        g.fillRect(x, y, len, 4);
        x += len + 7;
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

export function HomeInterior() {
  const m = getMats();
  const { camera, size } = useThree();
  const inside = useTown((s) => s.interior === "home");
  const introPhase = useTown((s) => s.introPhase);
  const [act, setAct] = useState<Activity>(() => activityAt(useTown.getState().timeOfDay));
  const pose = introPose(act, introPhase);
  const lastRoom = useRef<HomeRoom | null>(null);
  const actor = useRef<THREE.Group>(null);
  const backdrop = useRef<THREE.MeshBasicMaterial>(null);
  const deskLamp = useRef<THREE.PointLight>(null);
  const lampShade = useRef<THREE.MeshStandardMaterial>(null);
  const zzz = useRef<THREE.Group>(null);
  const meal = useRef<THREE.Group>(null);
  const laptop = useRef<THREE.Group>(null);
  const books = useRef<THREE.Group>(null);
  const bang = useRef<THREE.Group>(null);
  const code = useCodeTexture();
  const cam = useMemo(
    () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), head: new THREE.Vector3(), snap: true, mood: new THREE.Color(), a: new THREE.Vector3(), b: new THREE.Vector3() }),
    [],
  );

  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({ color: "#B8865B", roughness: 0.85, flatShading: true }),
      rug: new THREE.MeshStandardMaterial({ color: "#81D8D0", roughness: 1 }),
      rugWarm: new THREE.MeshStandardMaterial({ color: "#E7A27A", roughness: 1 }),
      kitchenWall: new THREE.MeshStandardMaterial({ color: "#F4EBDD", roughness: 0.95 }),
      tile: new THREE.MeshStandardMaterial({ color: "#A9DED8", roughness: 0.4 }),
      studyWall: new THREE.MeshStandardMaterial({ color: "#D8EDE8", roughness: 0.95 }),
      bedWall: new THREE.MeshStandardMaterial({ color: "#C9CFE6", roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: "#8A6446", roughness: 0.8, flatShading: true }),
      white: new THREE.MeshStandardMaterial({ color: "#FBF7EF", roughness: 0.7 }),
      screen: new THREE.MeshBasicMaterial({ map: code, toneMapped: false }),
      window: new THREE.MeshBasicMaterial({ color: "#C3E2F6", toneMapped: false }),
      laptopScreen: new THREE.MeshBasicMaterial({ color: "#9FE3DC", toneMapped: false }),
      steel: new THREE.MeshStandardMaterial({ color: "#C7CBCF", roughness: 0.3, metalness: 0.6 }),
      plant: new THREE.MeshStandardMaterial({ color: "#5DA36F", roughness: 0.9, flatShading: true }),
      book: [ "#F37021", "#81D8D0", "#2B2A2E", "#F6EFE3", "#4FA9A0", "#D85E16" ].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
    }),
    [code],
  );

  // speak when his room changes while we're watching (time scrubbing / following)
  useEffect(() => {
    if (!inside) {
      lastRoom.current = null;
      cam.snap = true;
      return;
    }
    const s = useTown.getState();
    if (lastRoom.current && lastRoom.current !== act.room && !s.homeRoom && !s.intro) speak(`home-${act.room}`);
    lastRoom.current = act.room;
  }, [inside, act.room, cam]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const s = useTown.getState();
    // the intro keeps the activity it opened on, even if the clock ticks over
    const now = s.intro ? act : activityAt(runtime.env.hour);
    if (now.id !== act.id) setAct(now);
    if (!inside) {
      runtime.bubble.visible = false;
      return;
    }
    const view = s.homeRoom ?? now.room;
    const rd = roomDef(view);

    // ── actor at his spot; turns to face us while speaking (not while asleep).
    // In the intro: sits up / turns round, stands, and walks off to the stairs.
    const spot = SPOTS[now.spot];
    const a = actor.current!;
    const ip = s.introPhase;
    const mv = INTRO_MOVES[now.spot];
    const spotPos = cam.a.copy(local(spot.floor, ...spot.pos));
    let yaw = !!s.speech && now.pose !== "sleep" ? 0 : spot.yaw;
    let turnRate = 5;
    let follow = 0;
    if (ip === "notice" || ip === "speak") {
      yaw = mv.sit ? mv.sit.yaw : 0;
      if (mv.sit) a.position.lerpVectors(spotPos, local(spot.floor, ...mv.sit.pos), ip === "speak" ? 1 : smooth(intro.t / 0.55));
      else a.position.copy(spotPos);
      turnRate = 9; // a quick, surprised turn
    } else if (ip === "getup") {
      const from = mv.sit ? local(spot.floor, ...mv.sit.pos) : spotPos;
      a.position.lerpVectors(from, local(spot.floor, ...mv.stand), smooth(intro.t / intro.dur));
      yaw = 0;
    } else if (ip === "walk") {
      // along stand → path at an even pace, done just as the fade covers it
      const pts = [local(spot.floor, ...mv.stand), ...mv.path.map(([x, z]) => local(spot.floor, x, 0, z))];
      let total = 0;
      for (let i = 1; i < pts.length; i++) total += pts[i].distanceTo(pts[i - 1]);
      let left = Math.min(1, intro.t / Math.max(0.1, intro.dur - 0.25)) * total;
      let i = 1;
      while (i < pts.length - 1 && left > pts[i].distanceTo(pts[i - 1])) {
        left -= pts[i].distanceTo(pts[i - 1]);
        i++;
      }
      const seg = pts[i].distanceTo(pts[i - 1]) || 1;
      a.position.lerpVectors(pts[i - 1], pts[i], Math.min(1, left / seg));
      yaw = Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      turnRate = 10;
      follow = smooth(intro.t / intro.dur);
    } else {
      a.position.copy(spotPos);
    }
    a.rotation.y += Math.atan2(Math.sin(yaw - a.rotation.y), Math.cos(yaw - a.rotation.y)) * (1 - Math.exp(-dt * turnRate));

    // ── camera: a fixed side view framing the room (no free camera inside);
    // in the intro it drifts after him as he heads out
    const aspect = size.width / Math.max(1, size.height);
    const fitW = (W / 2 + 0.7) / (Math.tan(THREE.MathUtils.degToRad(45 / 2)) * aspect);
    const dist = THREE.MathUtils.clamp(fitW * 1.08, 8.4, 16) * (1 - 0.12 * follow);
    const fy = floorY(rd.floor);
    const drift = (a.position.x - STAGE.x) * 0.45 * follow;
    cam.pos.set(STAGE.x + 0.2 + drift, fy + 1.5 + (dist - 8.4) * 0.05, STAGE.z + dist);
    cam.look.set(STAGE.x + drift, fy + 1.3, STAGE.z - 0.3);
    const k = cam.snap ? 1 : 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(cam.pos, k);
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    const lookAt = camera.position.clone().add(cur.multiplyScalar(5)).lerp(cam.look, cam.snap ? 1 : k);
    camera.lookAt(cam.snap ? cam.look : lookAt);
    cam.snap = false;

    // ── backdrop: the room's mood, deeper at night
    const night = runtime.env.night;
    cam.mood.set(rd.mood).lerp(new THREE.Color("#0B1024"), night * 0.55);
    backdrop.current?.color.lerp(cam.mood, 1 - Math.exp(-dt * 3));

    // ── windows show the sky; dark at night
    const sky = sampleSky(runtime.env.hour);
    mats.window.color.setRGB(...sky.horizon.map((v) => v * (1 - night * 0.75)) as [number, number, number], THREE.SRGBColorSpace);

    // ── props for the activity
    const studying = now.id === "study";
    deskLamp.current!.intensity = studying ? 3.2 : 0;
    lampShade.current!.emissiveIntensity = studying ? 1.4 : 0;
    meal.current!.visible = now.pose === "eat";
    laptop.current!.visible = now.pose === "type";
    books.current!.visible = studying;
    code.offset.y = (t * 0.05) % 1;
    const z = zzz.current!;
    z.visible = pose === "sleep";
    z.children.forEach((c, i) => {
      const life = (t * 0.35 + i / 3) % 1;
      c.position.set(-1.9 + life * 0.5, 0.9 + life * 1.1, -1.15);
      c.scale.setScalar(0.6 + life * 0.6);
      (c as unknown as { fillOpacity: number; outlineOpacity: number }).fillOpacity = Math.sin(life * Math.PI);
      (c as unknown as { outlineOpacity: number }).outlineOpacity = Math.sin(life * Math.PI);
    });

    // ── speech bubble anchor: above his head, in screen pixels
    const asleep = pose === "sleep";
    cam.head.copy(a.position).add(cam.b.set(asleep ? -1.55 : 0, asleep ? 0.55 : SEATED.includes(pose) ? 1.65 : 2.1, 0));

    // ── the surprised "!" (intro): pops in over his head, then fades
    const g = bang.current!;
    const bt = ip === "notice" ? intro.t : ip === "speak" ? intro.t + 0.9 : 9;
    g.visible = bt < 1.25;
    if (g.visible) {
      g.position.copy(cam.head).add(cam.b.set(0.08, -0.05, 0));
      g.scale.setScalar(bt < 0.16 ? (bt / 0.16) * 1.35 : bt < 0.3 ? 1.35 - ((bt - 0.16) / 0.14) * 0.35 : 1);
      g.rotation.z = bt < 0.3 ? Math.sin(bt * 40) * 0.12 : 0;
      const o = bt > 0.95 ? Math.max(0, 1 - (bt - 0.95) / 0.3) : 1;
      for (const c of g.children) Object.assign(c, { fillOpacity: o, outlineOpacity: o });
    }

    cam.head.project(camera);
    runtime.bubble.x = (cam.head.x * 0.5 + 0.5) * size.width;
    runtime.bubble.y = (-cam.head.y * 0.5 + 0.5) * size.height;
    runtime.bubble.visible = true;
  });

  const wallMat = [mats.kitchenWall, mats.studyWall, mats.bedWall];

  return (
    <group visible={inside}>
      {/* backdrop: a soft coloured room around the diorama */}
      <mesh position={[STAGE.x, STAGE.y + 5, STAGE.z - 2]}>
        <boxGeometry args={[60, 34, 44]} />
        <meshBasicMaterial ref={backdrop} side={THREE.BackSide} color={ROOMS[1].mood} fog={false} />
      </mesh>
      {/* pedestal */}
      <mesh position={[STAGE.x, STAGE.y - 0.35, STAGE.z]} material={m.creamShade} receiveShadow>
        <boxGeometry args={[W + 1.6, 0.5, D + 1.4]} />
      </mesh>

      {/* the house, front wall removed */}
      {[0, 1, 2].map((f) => (
        <group key={f} position={[STAGE.x, floorY(f), STAGE.z]}>
          {/* floor */}
          <mesh position={[0, -0.09, 0]} material={mats.floor} receiveShadow>
            <boxGeometry args={[W, 0.18, D]} />
          </mesh>
          {/* back + side walls: brownstone outside, painted inside */}
          <mesh position={[0, FH / 2, -D / 2 - WALL / 2]} material={m.brownstone}>
            <boxGeometry args={[W + WALL * 2, FH, WALL]} />
          </mesh>
          <mesh position={[0, FH / 2, -D / 2 + 0.01]} material={wallMat[f]}>
            <planeGeometry args={[W, FH]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <mesh position={[sx * (W / 2 + WALL / 2), FH / 2, 0]} material={m.brownstone}>
                <boxGeometry args={[WALL, FH, D]} />
              </mesh>
              <mesh position={[sx * (W / 2 - 0.01), FH / 2, 0]} rotation-y={-sx * Math.PI / 2} material={wallMat[f]}>
                <planeGeometry args={[D, FH]} />
              </mesh>
            </group>
          ))}
          {/* back-wall window showing the sky */}
          <group position={[f === 1 ? 1.4 : f === 2 ? 1.5 : 1.25, 1.55, -D / 2 + 0.03]}>
            <mesh material={m.tiffany}>
              <boxGeometry args={[1.25, 1.15, 0.05]} />
            </mesh>
            <mesh position={[0, 0, 0.03]} material={mats.window}>
              <planeGeometry args={[1.05, 0.95]} />
            </mesh>
          </group>
          {/* a strip of cornice trim at each floor line (the cut edge) */}
          <mesh position={[0, -0.01, D / 2 - 0.04]} material={m.brownstoneDark}>
            <boxGeometry args={[W + WALL * 2, 0.2, 0.1]} />
          </mesh>
        </group>
      ))}

      {/* roof, cornice and the water tower, for continuity with the street */}
      <group position={[STAGE.x, floorY(3), STAGE.z]}>
        <mesh position={[0, -0.05, 0]} material={m.brownstoneDark}>
          <boxGeometry args={[W + 0.7, 0.4, D + 0.5]} />
        </mesh>
        <mesh position={[0, -0.3, D / 2 + 0.05]} material={m.tiffany}>
          <boxGeometry args={[W + 0.5, 0.1, 0.12]} />
        </mesh>
        {[[-0.55, -0.5], [0.55, -0.5], [-0.55, 0.5], [0.55, 0.5]].map(([x, z], i) => (
          <mesh key={i} position={[-1.8 + x, 0.9, -0.8 + z]} material={m.iron}>
            <boxGeometry args={[0.08, 1.6, 0.08]} />
          </mesh>
        ))}
        <mesh position={[-1.8, 2.45, -0.8]} material={m.wood}>
          <cylinderGeometry args={[0.8, 0.8, 1.5, 16]} />
        </mesh>
        <mesh position={[-1.8, 3.5, -0.8]} material={m.brownstoneDark}>
          <coneGeometry args={[0.92, 0.7, 16]} />
        </mesh>
      </group>

      {/* ── kitchen (ground floor) */}
      <group position={[STAGE.x, floorY(0), STAGE.z]}>
        <mesh position={[-1.55, 0.45, -1.72]} material={m.cream} castShadow>
          <boxGeometry args={[2.9, 0.9, 0.62]} />
        </mesh>
        <mesh position={[-1.55, 0.92, -1.72]} material={m.tiffanyDeep}>
          <boxGeometry args={[2.95, 0.06, 0.66]} />
        </mesh>
        <mesh position={[-1.55, 1.35, -D / 2 + 0.02]} material={mats.tile}>
          <planeGeometry args={[2.9, 0.75]} />
        </mesh>
        <mesh position={[-1.55, 2.0, -1.8]} material={m.cream}>
          <boxGeometry args={[2.9, 0.6, 0.4]} />
        </mesh>
        {[-2.4, -1.9].map((x) => (
          <mesh key={x} position={[x, 0.96, -1.72]} rotation-x={-Math.PI / 2} material={m.ink}>
            <ringGeometry args={[0.1, 0.16, 16]} />
          </mesh>
        ))}
        <RoundedBox args={[0.85, 1.9, 0.75]} radius={0.08} position={[2.55, 0.95, -1.6]} material={m.tiffany} castShadow />
        {/* table + two chairs */}
        <mesh position={[0.7, 0.74, 0.12]} material={mats.white} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 0.05, 24]} />
        </mesh>
        <mesh position={[0.7, 0.36, 0.12]} material={mats.wood}>
          <cylinderGeometry args={[0.06, 0.18, 0.72, 10]} />
        </mesh>
        <Chair at={[0.7, 0, -0.62]} yaw={0} mat={mats.wood} />
        <Chair at={[-0.2, 0, 0.12]} yaw={Math.PI / 2} mat={mats.wood} />
        <group ref={meal}>
          <mesh position={[0.7, 0.78, -0.12]} material={mats.white}>
            <cylinderGeometry args={[0.2, 0.17, 0.03, 18]} />
          </mesh>
          <mesh position={[0.7, 0.83, -0.12]} material={m.orange}>
            <icosahedronGeometry args={[0.08, 1]} />
          </mesh>
          <mesh position={[0.62, 0.81, -0.08]} material={m.lawnDeep}>
            <icosahedronGeometry args={[0.05, 0]} />
          </mesh>
          <mesh position={[1.05, 0.82, 0.0]} material={m.orange}>
            <cylinderGeometry args={[0.05, 0.045, 0.1, 10]} />
          </mesh>
        </group>
        {/* pendant lamp */}
        <mesh position={[0.7, 2.25, 0.12]} material={m.iron}>
          <cylinderGeometry args={[0.01, 0.01, 0.9, 4]} />
        </mesh>
        <mesh position={[0.7, 1.78, 0.12]} material={m.orange}>
          <coneGeometry args={[0.22, 0.18, 14, 1, true]} />
        </mesh>
        <pointLight position={[0.7, 1.6, 0.12]} intensity={2.2} distance={4.5} color="#ffd9a8" />
        <mesh position={[0, 0.01, 0.3]} rotation-x={-Math.PI / 2} material={mats.rugWarm}>
          <planeGeometry args={[2.4, 1.6]} />
        </mesh>
      </group>

      {/* ── study (middle floor) */}
      <group position={[STAGE.x, floorY(1), STAGE.z]}>
        <mesh position={[-0.75, 0.75, -1.6]} material={mats.wood} castShadow>
          <boxGeometry args={[2.0, 0.06, 0.8]} />
        </mesh>
        {[[-1.65, -1.95], [0.15, -1.95], [-1.65, -1.25], [0.15, -1.25]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.37, z]} material={mats.wood}>
            <boxGeometry args={[0.06, 0.74, 0.06]} />
          </mesh>
        ))}
        {/* monitor: screen faces the room, code scrolling */}
        <mesh position={[-0.75, 1.27, -1.82]} material={m.ink}>
          <boxGeometry args={[1.1, 0.68, 0.05]} />
        </mesh>
        <mesh position={[-0.75, 1.27, -1.79]} material={mats.screen}>
          <planeGeometry args={[1.0, 0.58]} />
        </mesh>
        <mesh position={[-0.75, 0.9, -1.84]} material={m.ink}>
          <boxGeometry args={[0.08, 0.3, 0.06]} />
        </mesh>
        <group ref={laptop} position={[-1.15, 0.79, -1.42]} rotation-y={0.25}>
          <mesh material={mats.steel}>
            <boxGeometry args={[0.46, 0.02, 0.32]} />
          </mesh>
          <group position={[0, 0.01, -0.15]} rotation-x={-1.85}>
            <mesh position={[0, 0, -0.15]} material={mats.steel}>
              <boxGeometry args={[0.46, 0.015, 0.3]} />
            </mesh>
            <mesh position={[0, -0.009, -0.15]} rotation-x={Math.PI / 2} material={mats.laptopScreen}>
              <planeGeometry args={[0.42, 0.26]} />
            </mesh>
          </group>
        </group>
        {/* books on the desk, out when he's studying */}
        <group ref={books} position={[-0.35, 0.79, -1.4]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.35, 0.03 + i * 0.05, -0.1]} rotation-y={i * 0.2} material={mats.book[i]}>
              <boxGeometry args={[0.3, 0.045, 0.22]} />
            </mesh>
          ))}
          <mesh position={[-0.1, 0.02, 0.05]} material={mats.white}>
            <boxGeometry args={[0.42, 0.02, 0.28]} />
          </mesh>
        </group>
        {/* desk lamp, on in the evening */}
        <mesh position={[0.05, 0.95, -1.75]} material={m.iron}>
          <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
        </mesh>
        <mesh position={[0.05, 1.15, -1.66]} rotation-x={0.6}>
          <coneGeometry args={[0.13, 0.17, 12, 1, true]} />
          <meshStandardMaterial ref={lampShade} color="#F37021" emissive="#FFC67A" emissiveIntensity={0} side={THREE.DoubleSide} />
        </mesh>
        <pointLight ref={deskLamp} position={[0, 1.0, -1.5]} intensity={0} distance={3.5} color="#ffcf8a" />
        <Chair at={[-0.75, 0, -0.95]} yaw={Math.PI} mat={m.ink} />
        {/* bookshelf on the right wall */}
        <group position={[W / 2 - 0.25, 0, -0.6]}>
          <mesh position={[0, 1.0, 0]} material={mats.wood}>
            <boxGeometry args={[0.4, 2.0, 1.4]} />
          </mesh>
          {[0.45, 0.95, 1.45].map((y, r) =>
            Array.from({ length: 6 }, (_, k) => (
              <mesh key={`${r}${k}`} position={[-0.21, y + 0.13, -0.55 + k * 0.2]} material={mats.book[(r * 2 + k) % mats.book.length]}>
                <boxGeometry args={[0.05, 0.28 - (k % 3) * 0.04, 0.16]} />
              </mesh>
            )),
          )}
        </group>
        {/* armchair for relaxing */}
        <group position={[1.95, 0, 0.55]} rotation-y={-0.45}>
          <RoundedBox args={[0.9, 0.44, 0.85]} radius={0.12} position={[0, 0.22, 0]} material={m.orange} castShadow />
          <RoundedBox args={[0.9, 0.7, 0.18]} radius={0.08} position={[0, 0.7, -0.36]} material={m.orange} />
          {[-0.42, 0.42].map((x) => (
            <RoundedBox key={x} args={[0.14, 0.3, 0.8]} radius={0.05} position={[x, 0.5, 0]} material={m.orangeDeep} />
          ))}
        </group>
        <mesh position={[-0.4, 0.01, 0.4]} rotation-x={-Math.PI / 2} material={mats.rug}>
          <planeGeometry args={[2.6, 1.7]} />
        </mesh>
        <Plant at={[2.7, 0, -1.7]} m={mats} pot={m.cream} />
      </group>

      {/* ── bedroom (top floor) */}
      <group position={[STAGE.x, floorY(2), STAGE.z]}>
        <mesh position={[-1.25, 0.22, -1.2]} material={mats.wood} castShadow>
          <boxGeometry args={[2.2, 0.36, 1.4]} />
        </mesh>
        <mesh position={[-1.25, 0.47, -1.2]} material={mats.white}>
          <boxGeometry args={[2.1, 0.16, 1.32]} />
        </mesh>
        <mesh position={[-0.95, 0.57, -1.2]} material={m.tiffany}>
          <boxGeometry args={[1.5, 0.07, 1.36]} />
        </mesh>
        <RoundedBox args={[0.42, 0.14, 0.9]} radius={0.06} position={[-2.1, 0.62, -1.2]} material={mats.white} />
        <mesh position={[-2.38, 0.75, -1.2]} material={mats.wood}>
          <boxGeometry args={[0.1, 0.9, 1.45]} />
        </mesh>
        <mesh position={[-2.7, 0.27, -0.25]} material={mats.wood}>
          <boxGeometry args={[0.45, 0.54, 0.45]} />
        </mesh>
        <mesh position={[-2.7, 0.66, -0.25]} material={m.lampGlow}>
          <cylinderGeometry args={[0.09, 0.14, 0.2, 12]} />
        </mesh>
        <pointLight position={[-2.7, 0.9, -0.2]} intensity={0.8} distance={2.6} color="#ffd59a" />
        <mesh position={[2.6, 1.0, -1.45]} material={m.cream} castShadow>
          <boxGeometry args={[1.1, 2.0, 0.7]} />
        </mesh>
        <mesh position={[2.6, 1.0, -1.09]} material={m.tiffanyDeep}>
          <boxGeometry args={[0.02, 1.8, 0.02]} />
        </mesh>
        <mesh position={[0.6, 0.01, 0.3]} rotation-x={-Math.PI / 2} material={mats.rugWarm}>
          <planeGeometry args={[2.2, 1.4]} />
        </mesh>
        <Plant at={[1.6, 0, -1.75]} m={mats} pot={m.orange} />
        {/* z z z */}
        <group ref={zzz}>
          {[0, 1, 2].map((i) => (
            <Text key={i} font={BOARD_FONTS.home.url} fontSize={0.26} color="#F6EFE3" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#26345F">
              z
            </Text>
          ))}
        </group>
      </group>

      {/* Eshaan */}
      <group ref={actor}>
        <Character pose={pose} />
      </group>
      <group ref={bang} visible={false}>
        <Text font={BOARD_FONTS.home.url} fontSize={0.5} color="#F37021" anchorX="center" anchorY="bottom" outlineWidth={0.03} outlineColor="#121212">
          !
        </Text>
      </group>
    </group>
  );
}

function Chair({ at, yaw, mat }: { at: [number, number, number]; yaw: number; mat: THREE.Material }) {
  return (
    <group position={at} rotation-y={yaw}>
      <mesh position={[0, 0.44, 0]} material={mat} castShadow>
        <boxGeometry args={[0.46, 0.05, 0.46]} />
      </mesh>
      <mesh position={[0, 0.72, -0.21]} material={mat}>
        <boxGeometry args={[0.46, 0.52, 0.05]} />
      </mesh>
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.21, z]} material={mat}>
          <boxGeometry args={[0.04, 0.42, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

function Plant({ at, m, pot }: { at: [number, number, number]; m: { plant: THREE.Material }; pot: THREE.Material }) {
  return (
    <group position={at}>
      <mesh position={[0, 0.2, 0]} material={pot}>
        <cylinderGeometry args={[0.18, 0.14, 0.4, 10]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2.1) * 0.1, 0.6 + i * 0.12, Math.cos(i * 2.1) * 0.1]} material={m.plant}>
          <icosahedronGeometry args={[0.2 - i * 0.03, 0]} />
        </mesh>
      ))}
    </group>
  );
}
