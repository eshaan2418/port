"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame updates. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { runtime } from "../../state";
import { EXTRA_FLOORS } from "../floors";
import { Tower, type ActorFrame, type FloorDef, type RoomProps } from "../Tower";
import { Box, Chair, Cyl, Desk, mat, type V3 } from "../kit";
import { BOARD_FONTS, STREET_FONT } from "../../scene/Buildings";

/**
 * Extracurriculars Tower: 5 floors, each with one signature animation that
 * plays from the moment he steps out of the elevator (time since arrival is
 * `runtime.room.t`; neighbouring floors you glimpse show their end state).
 *   records (top) · dojo · rink · brain gym · aws community hall (ground)
 * Facts only from the brief: world champion in martial arts, Guinness World
 * Records holder (plaque text only, no logo), speed inline roller skater,
 * loves ice skating, ICPC, competitive programming, math, and the 200+
 * member AWS Student Builder Groups (formerly Cloud Club).
 */

const W = 8.4;
const D = 4.8;
const H = 3.4;
const BACK = -D / 2;
const EX = -W / 2 + 0.95; // elevator x
const OUT: V3[] = [
  [EX, 0, BACK - 0.35],
  [EX, 0, BACK + 0.9],
];

/** time on this floor (end state when it's not the floor he's on) */
const roomT = (id: string) => (runtime.room.id === id ? runtime.room.t : 99);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};

/** walk along points at `speed` from time `t0`; returns where he is */
function along(pts: V3[], t: number, t0: number, speed: number) {
  let left = Math.max(0, t - t0) * speed;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
    if (left <= seg) {
      const k = seg ? left / seg : 1;
      return { pos: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] as V3, yaw, done: false };
    }
    left -= seg;
  }
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return { pos: b, yaw: Math.atan2(b[0] - a[0], b[2] - a[2]), done: true };
}
const pathTime = (pts: V3[], speed: number) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
  return d / speed;
};
/** the standard opening: doors open (0.45 s), then out along the path */
function walkIn(t: number, pts: V3[], speed = 1.9): ActorFrame & { done: boolean } {
  if (t < 0.45) return { pos: pts[0], yaw: 0, pose: "idle", done: false };
  const w = along(pts, t, 0.45, speed);
  return { pos: w.pos, yaw: w.yaw, pose: w.done ? "idle" : "walk", done: w.done };
}

/* ── shared particles: a fixed set of instanced bits driven by a function ─ */
type Bit = { p: THREE.Vector3; s: number; r: THREE.Euler; c?: THREE.Color };
function Bits({ n, geom, material, update }: { n: number; geom: THREE.BufferGeometry; material: THREE.Material; update: (i: number, b: Bit, t: number) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), b: { p: new THREE.Vector3(), s: 1, r: new THREE.Euler() } as Bit }), []);
  useFrame(({ clock }) => {
    const im = ref.current;
    if (!im) return;
    for (let i = 0; i < n; i++) {
      tmp.b.s = 1;
      tmp.b.c = undefined;
      tmp.b.r.set(0, 0, 0);
      update(i, tmp.b, clock.elapsedTime);
      tmp.o.position.copy(tmp.b.p);
      tmp.o.rotation.copy(tmp.b.r);
      tmp.o.scale.setScalar(Math.max(0.0001, tmp.b.s));
      tmp.o.updateMatrix();
      im.setMatrixAt(i, tmp.o.matrix);
      if (tmp.b.c) im.setColorAt(i, tmp.b.c);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geom, material, n]} frustumCulled={false} />;
}
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ═══ 1. hall of records ═════════════════════════════════════════════════ */
const PEDESTALS = [
  { x: -0.7, lines: ["world champion", "martial arts"], on: 1.3 },
  { x: 3.0, lines: ["guinness world records", "holder"], on: 1.9 },
  { x: 1.15, lines: [] as string[], on: 2.6, medal: true },
];
const RECORDS_SPOT: V3 = [2.15, 0, 0.55];
const RECORDS_PATH: V3[] = [...OUT, RECORDS_SPOT];
const RECORDS_ARRIVE = 0.45 + pathTime(RECORDS_PATH, 1.9);

function Records({ active }: RoomProps) {
  const id = "records";
  const beams = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const pools = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const tops = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const medal = useRef<THREE.Group>(null);
  const geom = useMemo(() => new THREE.PlaneGeometry(0.06, 0.035), []);
  const confetti = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide, toneMapped: false }), []);
  const golds = useMemo(() => ["#E8C04A", "#F6D77A", "#C99A2E", "#FFF1B8"].map((c) => new THREE.Color(c)), []);
  useFrame(({ clock }) => {
    const t = roomT(id);
    PEDESTALS.forEach((p, i) => {
      // snap on, with a tiny flicker
      const since = t - p.on;
      const on = since < 0 ? 0 : since < 0.12 ? (Math.sin(since * 120) > 0 ? 1 : 0.3) : 1;
      if (beams.current[i]) beams.current[i]!.opacity = on * (p.medal ? 0.26 : 0.18);
      if (pools.current[i]) pools.current[i]!.opacity = on * 0.55;
      if (tops.current[i]) tops.current[i]!.emissiveIntensity = on * (p.medal ? 0.9 : 0.5);
    });
    if (medal.current) medal.current.rotation.y = clock.elapsedTime * 0.8;
  });
  return (
    <group>
      {/* a velvet back wall and gold rail */}
      <mesh position={[0.9, 1.6, BACK + 0.012]} material={mat("#3A1F24", { rough: 1 })}>
        <planeGeometry args={[W - 2.2, 2.4]} />
      </mesh>
      <Box at={[0.9, 2.85, BACK + 0.04]} size={[W - 2.2, 0.06, 0.05]} color="#C99A2E" m={mat("#C99A2E", { metal: 0.7, rough: 0.3 })} cast={false} />
      <Text font={BOARD_FONTS.extracurriculars.url} fontSize={0.26} color="#E8C04A" anchorX="center" anchorY="middle" position={[0.9, 3.1, BACK + 0.03]}>
        HALL OF RECORDS
      </Text>
      {PEDESTALS.map((p, i) => (
        <group key={i} position={[p.x, 0, -1.2]}>
          <Box at={[0, 0.55, 0]} size={[0.8, 1.1, 0.8]} color="#1E1B18" />
          <mesh position={[0, 1.12, 0]}>
            <boxGeometry args={[0.86, 0.05, 0.86]} />
            <meshStandardMaterial ref={(m) => void (tops.current[i] = m)} color="#C99A2E" emissive="#FFD27A" emissiveIntensity={0} metalness={0.6} roughness={0.35} />
          </mesh>
          {/* the beam from the ceiling and its pool of light */}
          <mesh position={[0, (H + 1.1) / 2, 0]}>
            <coneGeometry args={[0.62, H - 1.1, 20, 1, true]} />
            <meshBasicMaterial ref={(m) => void (beams.current[i] = m)} color="#FFE7A8" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh position={[0, 0.015, 0.55]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.75, 24]} />
            <meshBasicMaterial ref={(m) => void (pools.current[i] = m)} color="#FFE7A8" transparent opacity={0} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <Cyl at={[0, H - 0.08, 0]} r={0.12} h={0.16} color="#2B2A2E" />
          {p.lines.length > 0 && (
            <group position={[0, 1.45, 0.05]}>
              <Box at={[0, 0, -0.02]} size={[1.15, 0.5, 0.04]} color="#C99A2E" m={mat("#C99A2E", { metal: 0.6, rough: 0.35 })} cast={false} />
              {p.lines.map((l, k) => (
                <Text key={k} font={STREET_FONT} fontSize={k ? 0.1 : 0.115} color="#1E1B18" anchorX="center" anchorY="middle" position={[0, 0.08 - k * 0.17, 0.01]}>
                  {l}
                </Text>
              ))}
            </group>
          )}
          {p.medal && (
            <group ref={medal} position={[0, 1.6, 0]}>
              <mesh rotation-x={Math.PI / 2} material={mat("#E8C04A", { metal: 0.85, rough: 0.25, emissive: "#8a6a10", glow: 0.25 })}>
                <cylinderGeometry args={[0.2, 0.2, 0.04, 28]} />
              </mesh>
              <mesh position={[0, 0, 0.022]} material={mat("#C99A2E", { metal: 0.85, rough: 0.3 })}>
                <circleGeometry args={[0.13, 20]} />
              </mesh>
              <mesh position={[0, 0, -0.022]} rotation-y={Math.PI} material={mat("#C99A2E", { metal: 0.85, rough: 0.3 })}>
                <circleGeometry args={[0.13, 20]} />
              </mesh>
              {[-1, 1].map((sx) => (
                <Box key={sx} at={[sx * 0.08, 0.32, 0]} size={[0.09, 0.4, 0.01]} rot={[0, 0, sx * 0.35]} color={sx < 0 ? "#F37021" : "#81D8D0"} cast={false} />
              ))}
            </group>
          )}
        </group>
      ))}
      {/* gold confetti, once the hero light is on */}
      <Bits
        n={active ? 150 : 1}
        geom={geom}
        material={confetti}
        update={(i, b, clock) => {
          const t = roomT(id);
          if (t < 2.8) {
            b.s = 0;
            b.p.set(0, -5, 0);
            return;
          }
          const sp = 0.35 + rnd(i) * 0.4;
          const y = H - 0.1 - (((t - 2.8) * sp + rnd(i, 1) * H) % (H - 0.1));
          b.p.set(-1.6 + rnd(i, 2) * 5.6 + Math.sin(clock * 1.3 + i) * 0.15, y, -1.9 + rnd(i, 3) * 3.4);
          b.r.set(clock * (2 + rnd(i, 4) * 3), clock * 1.7 + i, 0);
          b.c = golds[i % golds.length];
          b.s = t < 3.2 ? (t - 2.8) / 0.4 : 1;
        }}
      />
      {/* a rope line in front */}
      {[-1.9, 0.0, 1.9, 3.8].map((x) => (
        <Cyl key={x} at={[x, 0.45, 1.6]} r={0.05} h={0.9} color="#C99A2E" m={mat("#C99A2E", { metal: 0.6, rough: 0.35 })} />
      ))}
      {[-0.95, 0.95, 2.85].map((x) => (
        <mesh key={x} position={[x, 0.82, 1.6]} rotation-z={Math.PI / 2} material={mat("#8C1C2A", { rough: 0.7 })}>
          <cylinderGeometry args={[0.03, 0.03, 1.9, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function recordsScript(t: number): ActorFrame {
  const w = walkIn(t, RECORDS_PATH);
  if (!w.done) return w;
  // at the medal: a little cheer as the confetti falls, then he presents it
  if (t < RECORDS_ARRIVE + 0.9) return { pos: RECORDS_SPOT, yaw: -0.3, pose: "cheer" };
  return { pos: RECORDS_SPOT, yaw: -0.6, pose: "present", speak: t > RECORDS_ARRIVE + 1.0, faceCamera: false };
}

/* ═══ 2. dojo ════════════════════════════════════════════════════════════ */
const DOJO_MAT: V3 = [0.4, 0, 0.45];
const DOJO_PATH: V3[] = [...OUT, DOJO_MAT];
const DOJO_ARRIVE = 0.45 + pathTime(DOJO_PATH, 1.9);
const BOARD_X = 2.3;
const READY: V3 = [BOARD_X - 0.72, 0, 0.0];
const BREAK_AT = DOJO_ARRIVE + 3.75;

function Dojo({ active }: RoomProps) {
  const id = "dojo";
  const halves = useRef<(THREE.Mesh | null)[]>([]);
  const lanterns = useRef<THREE.Group>(null);
  const petalGeom = useMemo(() => {
    const g = new THREE.CircleGeometry(0.035, 5);
    g.scale(1, 0.6, 1);
    return g;
  }, []);
  const petalMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#F7B7C8", side: THREE.DoubleSide, toneMapped: false }), []);
  const splinterGeom = useMemo(() => new THREE.BoxGeometry(0.03, 0.03, 0.14), []);
  const shook = useRef(false);
  useFrame(({ clock }) => {
    const t = roomT(id);
    // the board: whole until he hits it, then the halves part in slow motion
    const k = clamp01((t - BREAK_AT) * 0.45);
    halves.current.forEach((h, i) => {
      if (!h) return;
      const s = i ? 1 : -1;
      h.position.set(BOARD_X + k * 0.35, 1.32 - k * k * 1.0, s * (0.16 + k * 0.45));
      h.rotation.set(s * k * 1.4, 0, -k * 0.8);
    });
    if (active && t >= BREAK_AT && !shook.current) {
      shook.current = true;
      runtime.room.shake = 1;
    }
    if (t < BREAK_AT) shook.current = false;
    lanterns.current?.children.forEach((l, i) => (l.rotation.z = Math.sin(clock.elapsedTime * 0.8 + i) * 0.05));
  });
  return (
    <group>
      {/* shoji screens on the back wall */}
      {[-1.0, 0.75, 2.5].map((x) => (
        <group key={x} position={[x, 1.55, BACK + 0.03]}>
          <Box at={[0, 0, 0]} size={[1.6, 2.3, 0.04]} color="#5A3B2B" cast={false} />
          <mesh position={[0, 0, 0.025]} material={mat("#FBF4E2", { emissive: "#FFE9C4", glow: 0.25 })}>
            <planeGeometry args={[1.5, 2.2]} />
          </mesh>
          {[-0.37, 0.37].map((dx) => (
            <Box key={dx} at={[dx, 0, 0.03]} size={[0.03, 2.2, 0.02]} color="#5A3B2B" cast={false} />
          ))}
          {[-0.55, 0, 0.55].map((dy) => (
            <Box key={dy} at={[0, dy, 0.03]} size={[1.5, 0.03, 0.02]} color="#5A3B2B" cast={false} />
          ))}
        </group>
      ))}
      {/* tatami */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[-1.6 + (i % 4) * 1.62, 0.02, -0.9 + Math.floor(i / 4) * 1.62]}>
          <Box at={[0, 0, 0]} size={[1.58, 0.04, 1.58]} color="#3E5A35" cast={false} />
          <Box at={[0, 0.012, 0]} size={[1.48, 0.04, 1.48]} color="#CFC58F" cast={false} />
        </group>
      ))}
      {/* paper lanterns */}
      <group ref={lanterns}>
        {[-1.2, 0.9, 3.0].map((x) => (
          <group key={x} position={[x, H - 0.25, 0.4]}>
            <Cyl at={[0, -0.25, 0]} r={0.005} h={0.5} color="#121212" seg={4} />
            <mesh position={[0, -0.72, 0]} material={mat("#C8413A", { emissive: "#FF7A4A", glow: 0.9, rough: 0.9 })}>
              <sphereGeometry args={[0.24, 12, 8]} />
            </mesh>
            <Cyl at={[0, -0.5, 0]} r={0.1} h={0.06} color="#121212" />
            <Cyl at={[0, -0.95, 0]} r={0.1} h={0.06} color="#121212" />
          </group>
        ))}
      </group>
      {/* the board-breaking stand */}
      {[-0.42, 0.42].map((z) => (
        <Box key={z} at={[BOARD_X + 0.1, 0.8, z]} size={[0.08, 1.6, 0.08]} color="#5A3B2B" />
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => void (halves.current[i] = m)} position={[BOARD_X, 1.32, i ? 0.16 : -0.16]} material={mat("#D8B48A", { rough: 0.85 })} castShadow>
          <boxGeometry args={[0.04, 0.42, 0.32]} />
        </mesh>
      ))}
      {/* splinters (slow motion) */}
      <Bits
        n={active ? 26 : 1}
        geom={splinterGeom}
        material={mat("#E2C59C", { rough: 0.9 })}
        update={(i, b) => {
          const t = roomT(id);
          const k = (t - BREAK_AT) * 0.45; // slow motion
          if (k < 0 || k > 1.6) {
            b.s = 0;
            b.p.set(0, -5, 0);
            return;
          }
          const vx = 0.8 + rnd(i) * 1.4;
          const vy = (rnd(i, 1) - 0.3) * 1.6;
          const vz = (rnd(i, 2) - 0.5) * 2.2;
          b.p.set(BOARD_X + vx * k, 1.32 + vy * k - 1.2 * k * k, vz * k);
          b.r.set(k * 8 * rnd(i, 3), k * 6, k * 5 * rnd(i, 4));
          b.s = 1 - Math.max(0, k - 1.2) / 0.4;
        }}
      />
      {/* drifting cherry blossom petals */}
      <Bits
        n={active ? 70 : 20}
        geom={petalGeom}
        material={petalMat}
        update={(i, b, clock) => {
          const sp = 0.22 + rnd(i) * 0.2;
          const y = H - (((clock * sp) + rnd(i, 1) * H) % H);
          b.p.set(-3.0 + rnd(i, 2) * 7 + Math.sin(clock * 0.9 + i) * 0.3, y, -1.9 + rnd(i, 3) * 3.6 + Math.cos(clock * 0.7 + i) * 0.2);
          b.r.set(clock * 1.2 + i, clock * 0.8, clock + i * 0.3);
        }}
      />
    </group>
  );
}

function dojoScript(t: number): ActorFrame {
  const w = walkIn(t, DOJO_PATH);
  if (!w.done) return w;
  const a = t - DOJO_ARRIVE;
  // the kata: stance, punch, spinning kick
  if (a < 0.35) return { pos: DOJO_MAT, yaw: 0, pose: "idle" };
  if (a < 0.95) return { pos: DOJO_MAT, yaw: 0, pose: "stance" };
  if (a < 1.4) return { pos: DOJO_MAT, yaw: 0, pose: "punch" };
  if (a < 1.6) return { pos: DOJO_MAT, yaw: 0, pose: "stance" };
  if (a < 2.35) return { pos: DOJO_MAT, yaw: ease((a - 1.6) / 0.6) * Math.PI * 2, pose: "kick" };
  // over to the board
  if (a < 2.95) {
    const k = ease((a - 2.35) / 0.6);
    return { pos: [DOJO_MAT[0] + (READY[0] - DOJO_MAT[0]) * k, 0, DOJO_MAT[2] + (READY[2] - DOJO_MAT[2]) * k], yaw: Math.PI / 2, pose: "walk" };
  }
  // wind up, then the slow-motion break
  if (t < BREAK_AT - 0.25) return { pos: READY, yaw: Math.PI / 2, pose: "stance" };
  if (t < BREAK_AT + 1.6) return { pos: READY, yaw: Math.PI / 2, pose: "punch" };
  return { pos: READY, yaw: 0, pose: "idle", speak: t > BREAK_AT + 1.8, faceCamera: true };
}

/* ═══ 3. the rink ════════════════════════════════════════════════════════ */
const RINK = { x: 0.7, z: 0.15, a: 2.55, b: 1.3 };
const onRink = (th: number): V3 => [RINK.x + Math.cos(th) * RINK.a, 0, RINK.z + Math.sin(th) * RINK.b];
const RINK_ENTRY = onRink(Math.PI);
const RINK_PATH: V3[] = [...OUT, RINK_ENTRY];
const RINK_ON = 0.45 + pathTime(RINK_PATH, 1.9);
const LAP = 3.3; // seconds for lap one (1.25 laps: from the left end round to the front)
const SWAP = RINK_ON + LAP; // stop at the front, spin, swap skates
const LAP2 = SWAP + 0.9;
const RINK_DONE = LAP2 + 2.9;
const skater = { x: 0, z: 0, on: false };

function rinkScript(t: number): ActorFrame {
  if (t < RINK_ON) {
    const w = walkIn(t, RINK_PATH);
    skater.on = false;
    return w;
  }
  const lap = (th0: number, turns: number, from: number, dur: number) => {
    const u = clamp01((t - from) / dur);
    const k = u - Math.sin(u * Math.PI * 2) / (Math.PI * 2); // eases off and back in to a stop
    const th = th0 + Math.PI * 2 * turns * k;
    const p = onRink(th);
    const dx = -Math.sin(th) * RINK.a;
    const dz = Math.cos(th) * RINK.b;
    skater.x = p[0];
    skater.z = p[2];
    skater.on = u > 0 && u < 1;
    return { pos: p, yaw: Math.atan2(dx, dz), lean: -0.18 };
  };
  if (t < SWAP) return { ...lap(Math.PI, 1.25, RINK_ON, LAP), pose: "skate", gear: "inline" };
  const front = onRink(Math.PI / 2 + Math.PI * 2);
  if (t < LAP2) {
    // stop, spin, and the skates change: inline → ice
    skater.on = false;
    const k = ease((t - SWAP) / 0.75);
    return { pos: front, yaw: Math.PI + k * Math.PI * 2, pose: "idle", gear: t < SWAP + 0.4 ? "inline" : "ice", lean: 0 };
  }
  if (t < RINK_DONE) return { ...lap(Math.PI / 2, 1, LAP2, RINK_DONE - LAP2), pose: "skate", gear: "ice" };
  skater.on = false;
  return { pos: onRink(Math.PI / 2), yaw: 0, pose: "idle", gear: "ice", speak: t > RINK_DONE + 0.2, faceCamera: true };
}

function Rink({ active }: RoomProps) {
  const id = "rink";
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#D9CDEE", roughness: 0.08, metalness: 0.25 }), []);
  const sprayGeom = useMemo(() => new THREE.IcosahedronGeometry(0.03, 0), []);
  const sprayMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#F4FBFF", toneMapped: false }), []);
  const iceColor = useMemo(() => ({ roller: new THREE.Color("#D9CDEE"), ice: new THREE.Color("#C9ECFF") }), []);
  useFrame(() => {
    const t = roomT(id);
    floorMat.color.copy(iceColor.roller).lerp(iceColor.ice, ease((t - SWAP - 0.3) / 0.8));
  });
  const boards = useMemo(() => {
    const out: { x: number; z: number; yaw: number }[] = [];
    const n = 44;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const x = RINK.x + Math.cos(th) * (RINK.a + 0.55);
      const z = RINK.z + Math.sin(th) * (RINK.b + 0.45);
      if (z > RINK.z + RINK.b * 0.2) continue; // only the back half: the front stays open to the camera
      // long side along the oval's tangent
      const tx = -Math.sin(th) * (RINK.a + 0.55);
      const tz = Math.cos(th) * (RINK.b + 0.45);
      out.push({ x, z, yaw: Math.atan2(-tz, tx) });
    }
    return out;
  }, []);
  return (
    <group>
      <mesh position={[RINK.x, 0.02, RINK.z]} scale={[RINK.a + 0.5, 1, RINK.b + 0.4]} rotation-x={-Math.PI / 2} material={floorMat} receiveShadow>
        <circleGeometry args={[1, 48]} />
      </mesh>
      {/* lane lines */}
      {[0.55, 0.85].map((k) => (
        <mesh key={k} position={[RINK.x, 0.03, RINK.z]} scale={[RINK.a * k + 0.3, 1, RINK.b * k + 0.15]} rotation-x={-Math.PI / 2} material={mat("#81D8D0", { basic: true, opacity: 0.55 })}>
          <ringGeometry args={[0.985, 1, 64]} />
        </mesh>
      ))}
      {boards.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation-y={b.yaw}>
          <Box at={[0, 0.16, 0]} size={[0.5, 0.32, 0.05]} color="#FBF7EF" cast={false} />
          <Box at={[0, 0.33, 0]} size={[0.5, 0.04, 0.08]} color={i % 2 ? "#F37021" : "#81D8D0"} cast={false} />
        </group>
      ))}
      {/* skates on a bench by the elevator: inline + ice */}
      <Box at={[EX + 1.2, 0.4, BACK + 0.5]} size={[1.3, 0.08, 0.4]} color="#8A6446" />
      {[0, 1].map((k) => (
        <group key={k} position={[EX + 0.9 + k * 0.55, 0.52, BACK + 0.5]}>
          <Box at={[0, 0.07, 0]} size={[0.18, 0.14, 0.3]} color="#F6EFE3" />
          {k ? <Box at={[0, -0.03, 0]} size={[0.015, 0.06, 0.36]} color="#DCE7EE" /> : <Box at={[0, -0.03, 0]} size={[0.05, 0.05, 0.32]} color="#F37021" />}
        </group>
      ))}
      <Text font={BOARD_FONTS.extracurriculars.url} fontSize={0.24} color="#2F6F9C" anchorX="center" anchorY="middle" position={[1.2, 2.7, BACK + 0.03]}>
        THE RINK
      </Text>
      <Trail color="#F37021" side={0.11} active={active} />
      <Trail color="#81D8D0" side={-0.11} active={active} />
      {/* ice spray when he spins to a stop */}
      <Bits
        n={active ? 40 : 1}
        geom={sprayGeom}
        material={sprayMat}
        update={(i, b) => {
          const t = roomT(id);
          const k = t - (SWAP + 0.35);
          if (k < 0 || k > 1.1) {
            b.s = 0;
            b.p.set(0, -5, 0);
            return;
          }
          const a = rnd(i) * Math.PI * 2;
          const v = 1.2 + rnd(i, 1) * 1.6;
          const p = onRink(Math.PI / 2);
          b.p.set(p[0] + Math.cos(a) * v * k, 0.08 + (1.6 + rnd(i, 2)) * k - 2.6 * k * k, p[2] + Math.sin(a) * v * k * 0.6);
          b.s = 1 - k / 1.1;
        }}
      />
    </group>
  );
}

/** a fading ribbon behind his skates */
function Trail({ color, side, active }: { color: string; side: number; active: boolean }) {
  const N = 48;
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 2 * 4), 4));
    const idx: number[] = [];
    for (let i = 0; i < N - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), []);
  const hist = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3(0, -10, 0)), []);
  const col = useMemo(() => new THREE.Color(color), [color]);
  useFrame(() => {
    if (!active) return;
    // shift history; newest at 0
    for (let i = N - 1; i > 0; i--) hist[i].copy(hist[i - 1]);
    if (skater.on) hist[0].set(skater.x, 0.06, skater.z);
    else hist[0].copy(hist[1]);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const c = geom.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const a = hist[i];
      const b = hist[Math.min(N - 1, i + 1)];
      let dx = a.x - b.x;
      let dz = a.z - b.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const wdt = 0.07 * (1 - i / N);
      const ox = -dz * side;
      const oz = dx * side;
      pos.setXYZ(i * 2, a.x + ox - dz * wdt, a.y + i * 0.0005, a.z + oz + dx * wdt);
      pos.setXYZ(i * 2 + 1, a.x + ox + dz * wdt, a.y + i * 0.0005, a.z + oz - dx * wdt);
      const alpha = skater.on || i < N ? (1 - i / N) * 0.85 : 0;
      c.setXYZW(i * 2, col.r, col.g, col.b, a.y < -1 ? 0 : alpha);
      c.setXYZW(i * 2 + 1, col.r, col.g, col.b, a.y < -1 ? 0 : alpha);
    }
    pos.needsUpdate = true;
    c.needsUpdate = true;
    geom.computeBoundingSphere();
  });
  return <mesh geometry={geom} material={material} frustumCulled={false} />;
}

/* ═══ 4. brain gym ═══════════════════════════════════════════════════════ */
const SEAT: V3 = [-0.95, 0, -0.6];
const BRAIN_PATH: V3[] = [...OUT, [-1.6, 0, -1.25], SEAT];
const BRAIN_SIT = 0.45 + pathTime(BRAIN_PATH, 1.9);
const SOLVES = [0.6, 1.5, 2.4, 3.3, 4.2, 5.1].map((d) => BRAIN_SIT + d);
const BRAIN_DONE = SOLVES[SOLVES.length - 1] + 0.9;
const EQUATIONS = ["e^(iπ) + 1 = 0", "Σ 1/n² = π²/6", "dp[i] = max(dp[i−1], dp[i−2] + a[i])", "O(n log n)"];
const CHARS = EQUATIONS.reduce((a, e) => a + e.length, 0);

function brainScript(t: number): ActorFrame {
  if (t < BRAIN_SIT) return walkIn(t, BRAIN_PATH);
  if (t < BRAIN_DONE) return { pos: SEAT, yaw: 0, pose: "type" };
  return { pos: [SEAT[0], 0, SEAT[2]], yaw: 0, pose: "idle", speak: t > BRAIN_DONE + 0.3, faceCamera: true };
}

function BrainGym({ active }: RoomProps) {
  const id = "brain";
  // chalkboard that writes itself
  const chalk = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 420;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { cv, t, shown: -1 };
  }, []);
  const board = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 420;
    cv.height = 460;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return { cv, t, key: "" };
  }, []);
  const symbols = useMemo(
    () =>
      ["∑", "π", "∫", "√", "∞", "Δ", "∂", "≤"].map((s) => {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 128;
        const g = cv.getContext("2d")!;
        g.fillStyle = "#FFFFFF";
        g.font = "600 92px serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(s, 64, 70);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, color: "#3E6B52" });
      }),
    [],
  );
  const orbit = useRef<THREE.Group>(null);
  const balloons = useRef<(THREE.Group | null)[]>([]);
  const COLORS = ["#F37021", "#81D8D0", "#F6C177", "#9CC98B", "#D85E16", "#4FA9A0"];

  useFrame(({ clock }) => {
    const t = roomT(id);
    // chalk: characters appear over time
    const n = Math.floor(clamp01((t - 0.8) / 6.5) * CHARS);
    if (n !== chalk.shown) {
      chalk.shown = n;
      const g = chalk.cv.getContext("2d")!;
      g.fillStyle = "#2F4A3A";
      g.fillRect(0, 0, 1024, 420);
      g.fillStyle = "#EEF3EA";
      g.font = "italic 600 52px Georgia, serif";
      let left = n;
      EQUATIONS.forEach((e, i) => {
        const s = e.slice(0, Math.max(0, Math.min(e.length, left)));
        left -= e.length;
        g.save();
        g.translate(48 + (i % 2) * 18, 82 + i * 92);
        g.rotate(-0.015 + (i % 2) * 0.02);
        g.fillText(s, 0, 0);
        g.restore();
      });
      chalk.t.needsUpdate = true;
    }
    // ICPC-style scoreboard: problems tick off, the clock runs
    const solved = SOLVES.filter((s) => t >= s).length;
    const secs = Math.floor(Math.min(t, 600) * 7 + 3 * 3600 + 12 * 60);
    const key = `${solved}|${Math.floor(secs)}`;
    if (key !== board.key && (active || board.key === "")) {
      board.key = key;
      const g = board.cv.getContext("2d")!;
      g.fillStyle = "#14191A";
      g.fillRect(0, 0, 420, 460);
      g.fillStyle = "#F37021";
      g.font = "800 46px system-ui, sans-serif";
      g.fillText("ICPC", 26, 62);
      g.fillStyle = "#81D8D0";
      g.font = "600 30px ui-monospace, monospace";
      const hh = String(Math.floor(secs / 3600) % 5).padStart(2, "0");
      const mm = String(Math.floor(secs / 60) % 60).padStart(2, "0");
      const ss = String(secs % 60).padStart(2, "0");
      g.fillText(`${hh}:${mm}:${ss}`, 230, 60);
      "ABCDEF".split("").forEach((p, i) => {
        const y = 110 + i * 56;
        g.fillStyle = i < solved ? "#2E6B4A" : "#22292B";
        g.fillRect(24, y, 372, 44);
        g.fillStyle = "#F6EFE3";
        g.font = "700 30px ui-monospace, monospace";
        g.fillText(p, 40, y + 32);
        g.fillStyle = i < solved ? "#9CF2B4" : "#5d6668";
        g.font = "600 26px ui-monospace, monospace";
        g.fillText(i < solved ? "✓ solved" : "…", 96, y + 31);
      });
      board.t.needsUpdate = true;
    }
    // symbols orbit overhead
    const o = orbit.current;
    if (o) {
      o.rotation.y = clock.elapsedTime * 0.35;
      o.children.forEach((c, i) => (c.position.y = Math.sin(clock.elapsedTime * 1.2 + i) * 0.12));
    }
    // a balloon per solved problem: inflates at the desk, floats to the ceiling
    balloons.current.forEach((b, i) => {
      if (!b) return;
      const since = t - SOLVES[i];
      if (since < 0) {
        b.visible = false;
        return;
      }
      b.visible = true;
      const inflate = ease(since / 0.45);
      const rise = ease((since - 0.45) / 1.6);
      b.scale.setScalar(0.2 + inflate * 0.8);
      const x0 = -0.95 + (i - 2.5) * 0.12;
      b.position.set(x0 + rise * (-1.2 + i * 0.75), 0.95 + rise * (H - 1.55) + Math.sin(clock.elapsedTime * 1.4 + i) * 0.04 * rise, -0.05 - rise * (0.6 + (i % 3) * 0.35));
    });
  });

  return (
    <group>
      <group position={[0.75, 1.75, BACK + 0.03]}>
        <Box at={[0, 0, -0.01]} size={[3.75, 1.6, 0.05]} color="#6B4A2F" cast={false} />
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[3.6, 1.48]} />
          <meshBasicMaterial map={chalk.t} toneMapped={false} />
        </mesh>
        <Box at={[0, -0.82, 0.08]} size={[3.6, 0.05, 0.12]} color="#6B4A2F" cast={false} />
        <Text font={STREET_FONT} fontSize={0.12} color="#EEF3EA" anchorX="right" anchorY="bottom" position={[1.72, -0.68, 0.03]}>
          math
        </Text>
      </group>
      <group position={[3.35, 1.7, BACK + 0.05]}>
        <Box at={[0, 0, -0.01]} size={[1.18, 1.28, 0.05]} color="#2B2A2E" cast={false} />
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[1.08, 1.18]} />
          <meshBasicMaterial map={board.t} toneMapped={false} />
        </mesh>
      </group>
      <Text font={BOARD_FONTS.extracurriculars.url} fontSize={0.17} color="#3E6B52" anchorX="center" anchorY="middle" position={[0.75, 2.9, BACK + 0.03]}>
        COMPETITIVE PROGRAMMING
      </Text>
      <group ref={orbit} position={[0.6, 2.7, -0.1]}>
        {symbols.map((m, i) => {
          const a = (i / symbols.length) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 1.7, 0, Math.sin(a) * 0.9]}>
              <sprite material={m} scale={[0.42, 0.42, 0.42]} />
            </group>
          );
        })}
      </group>
      <Desk at={[-0.95, 0, -0.1]} w={1.3} d={0.6} color="#8A6446" />
      <group position={[-0.95, 0.79, -0.05]} rotation-y={Math.PI}>
        <Box at={[0, 0, 0]} size={[0.44, 0.02, 0.3]} color="#C7CBCF" />
        <Box at={[0, 0.14, -0.15]} size={[0.44, 0.28, 0.015]} color="#C7CBCF" rot={[-0.2, 0, 0]} />
      </group>
      <Chair at={SEAT} yaw={0} color="#3E6B52" />
      {COLORS.map((c, i) => (
        <group key={i} ref={(g) => void (balloons.current[i] = g)} visible={false}>
          <mesh scale={[1, 1.18, 1]} material={mat(c, { rough: 0.35 })}>
            <sphereGeometry args={[0.17, 14, 10]} />
          </mesh>
          <Cyl at={[0, -0.42, 0]} r={0.004} h={0.6} color="#F6EFE3" seg={4} />
        </group>
      ))}
      <Box at={[3.3, 0.45, 1.1]} size={[0.9, 0.9, 0.6]} color="#3E6B52" />
      <Text font={STREET_FONT} fontSize={0.1} color="#F6EFE3" anchorX="center" anchorY="middle" position={[3.3, 0.6, 1.41]}>
        practice set
      </Text>
    </group>
  );
}

/* ═══ 5. aws community hall ══════════════════════════════════════════════ */
const PODIUM: V3 = [3.05, 0, 0.95];
const AWS_PATH: V3[] = [...OUT, [EX + 0.6, 0, 1.4], PODIUM];
const SEATS = Array.from({ length: 15 }, (_, i) => ({ x: -1.4 + (i % 5) * 0.85, z: -0.5 + Math.floor(i / 5) * 0.8 }));
const FILL_FROM = 1.0;
const FILL_STEP = 0.24;
const COUNT_DONE = FILL_FROM + FILL_STEP * SEATS.length + 0.4;

function awsScript(t: number): ActorFrame {
  const w = walkIn(t, AWS_PATH);
  if (!w.done) return w;
  if (t < COUNT_DONE) return { pos: PODIUM, yaw: -1.1, pose: "present" };
  return { pos: PODIUM, yaw: 0, pose: "idle", speak: t > COUNT_DONE + 0.2, faceCamera: true };
}

function AwsHall({ active }: RoomProps) {
  const id = "aws";
  const people = useRef<(THREE.Group | null)[]>([]);
  const counter = useRef<{ text: string; sync: () => void } | null>(null);
  const lamps = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const hazeGeom = useMemo(() => new THREE.SphereGeometry(0.12, 6, 4), []);
  const hazeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#FFF6DE", transparent: true, opacity: 0.08, depthWrite: false, toneMapped: false }), []);
  const lastCount = useRef("");
  const slide = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 640;
    cv.height = 380;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#FFF8EC";
    g.fillRect(0, 0, 640, 380);
    g.fillStyle = "#E59A3A";
    g.fillRect(0, 0, 640, 18);
    g.fillStyle = "#121212";
    g.font = "700 44px system-ui, sans-serif";
    g.fillText("aws student", 40, 120);
    g.fillText("builder groups", 40, 172);
    g.fillStyle = "#5a5a5a";
    g.font = "500 28px system-ui, sans-serif";
    g.fillText("formerly cloud club", 40, 220);
    g.fillStyle = "#81D8D0";
    for (const [x, y, r] of [
      [470, 280, 50],
      [530, 255, 64],
      [595, 285, 44],
    ] as const) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame(({ clock }) => {
    const t = roomT(id);
    people.current.forEach((p, i) => {
      if (!p) return;
      const since = t - (FILL_FROM + i * FILL_STEP);
      const k = clamp01(since / 0.25);
      p.visible = k > 0;
      p.scale.setScalar(0.2 + 0.8 * (k < 1 ? 1 - (1 - k) * (1 - k) + Math.sin(k * Math.PI) * 0.15 : 1));
    });
    const n = Math.round(clamp01((t - FILL_FROM) / (COUNT_DONE - FILL_FROM - 0.2)) * 200);
    const txt = n >= 200 ? "200+" : String(n);
    if (counter.current && txt !== lastCount.current) {
      lastCount.current = txt;
      counter.current.text = txt;
      counter.current.sync();
    }
    lamps.current.forEach((m, i) => m && (m.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 1.4 + i * 1.3) * 0.3));
  });
  return (
    <group>
      {/* screen + projector beam through the haze */}
      <group position={[0.6, 1.75, BACK + 0.03]}>
        <Box at={[0, 0, -0.01]} size={[2.6, 1.6, 0.04]} color="#2B2A2E" cast={false} />
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[2.5, 1.5]} />
          <meshBasicMaterial map={slide} toneMapped={false} />
        </mesh>
      </group>
      <Box at={[0.6, H - 0.3, 1.7]} size={[0.5, 0.18, 0.4]} color="#F6EFE3" />
      <Cyl at={[0.6, H - 0.12, 1.7]} r={0.02} h={0.2} color="#2B2A2E" seg={4} />
      <mesh position={[0.6, 2.35, -0.25]} rotation-x={Math.PI / 2 - 0.17}>
        <coneGeometry args={[1.25, 3.9, 4, 1, true]} />
        <meshBasicMaterial color="#FFF3D6" transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <Bits
        n={active ? 40 : 1}
        geom={hazeGeom}
        material={hazeMat}
        update={(i, b, clock) => {
          b.p.set(-0.8 + rnd(i) * 3 + Math.sin(clock * 0.2 + i) * 0.3, 1.4 + rnd(i, 1) * 1.6 + Math.sin(clock * 0.3 + i * 2) * 0.1, -1.6 + ((clock * 0.05 + rnd(i, 2)) % 1) * 3.4);
          b.s = 1 + rnd(i, 3) * 1.5;
        }}
      />
      {/* chairs, and the people who fill them one by one */}
      {SEATS.map((s, i) => (
        <group key={i}>
          <Chair at={[s.x, 0, s.z]} yaw={Math.PI} color={i % 2 ? "#E59A3A" : "#81D8D0"} />
          <group ref={(g) => void (people.current[i] = g)} position={[s.x, 0.48, s.z]} visible={false}>
            <mesh position={[0, 0.32, 0]} material={mat("#2F3A44", { rough: 0.9 })}>
              <capsuleGeometry args={[0.16, 0.3, 3, 8]} />
            </mesh>
            <mesh position={[0, 0.72, 0]} material={mat("#2F3A44", { rough: 0.9 })}>
              <icosahedronGeometry args={[0.13, 1]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* the member counter */}
      <group position={[3.3, 2.1, BACK + 0.05]}>
        <Box at={[0, 0, -0.01]} size={[1.25, 0.9, 0.05]} color="#121212" cast={false} />
        <Text ref={counter as never} font={BOARD_FONTS.extracurriculars.url} fontSize={0.36} color="#F37021" anchorX="center" anchorY="middle" position={[0, 0.08, 0.02]}>
          0
        </Text>
        <Text font={STREET_FONT} fontSize={0.1} color="#F6EFE3" anchorX="center" anchorY="middle" position={[0, -0.28, 0.02]}>
          members
        </Text>
      </group>
      {/* cloud-shaped lamps */}
      {[-1.4, 0.9, 3.1].map((x, i) => (
        <group key={x} position={[x, H - 0.55, 0.6]}>
          <Cyl at={[0, 0.3, 0]} r={0.004} h={0.5} color="#2B2A2E" seg={4} />
          {[
            [0, 0, 0, 0.2],
            [0.2, -0.03, 0, 0.15],
            [-0.19, -0.04, 0, 0.14],
            [0.05, 0.09, 0, 0.14],
          ].map(([cx, cy, cz, r], k) => (
            <mesh key={k} position={[cx, cy, cz]}>
              <icosahedronGeometry args={[r, 1]} />
              <meshStandardMaterial ref={(m) => void (lamps.current[i] = m)} color="#FFFFFF" emissive="#EAF4FF" emissiveIntensity={0.6} roughness={0.9} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* podium */}
      <Box at={[PODIUM[0] + 0.55, 0.5, PODIUM[2] - 0.1]} size={[0.5, 1.0, 0.45]} color="#E59A3A" />
    </group>
  );
}

/* ── assemble ─────────────────────────────────────────────────────────── */
const DEFS: Record<string, Omit<FloorDef, "meta">> = {
  records: {
    wall: "#2A2620",
    floor: "#1E1B18",
    Room: Records,
    spot: { pos: RECORDS_SPOT, yaw: 0, pose: "idle" },
    script: recordsScript,
    // starts dark; the hall brightens as the spotlights come on
    fill: (t) => (t < 1.3 ? 0.18 : t < 1.9 ? 0.3 : t < 2.6 ? 0.42 : 0.62),
    cam: (t) => ({ push: 0.13 * ease((t - 2.6) / 1.2) - 0.13 * ease((t - 9) / 2) }),
  },
  dojo: { wall: "#F3E9D2", floor: "#B9AE7A", Room: Dojo, spot: { pos: DOJO_MAT, yaw: 0, pose: "idle" }, script: dojoScript },
  rink: { wall: "#EAF5FB", floor: "#A07A55", Room: Rink, spot: { pos: RINK_ENTRY, yaw: 0, pose: "idle" }, script: rinkScript },
  brain: { wall: "#E6EDE4", floor: "#8A6446", Room: BrainGym, spot: { pos: SEAT, yaw: 0, pose: "idle" }, script: brainScript },
  aws: { wall: "#F4F7FA", floor: "#9C7B57", Room: AwsHall, spot: { pos: PODIUM, yaw: 0, pose: "idle" }, script: awsScript },
};
const floors: FloorDef[] = EXTRA_FLOORS.map((meta) => ({ meta, ...DEFS[meta.id] }));

export function ExtracurricularsInterior() {
  return <Tower building="extracurriculars" floors={floors} w={W} d={D} fh={H} outer="brick" />;
}
