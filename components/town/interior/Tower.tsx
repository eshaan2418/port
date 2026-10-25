"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame updates. */

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { runtime, useTown } from "../state";
import { Character, type Gear, type Pose } from "../scene/Character";
import { getMats } from "../scene/materials";
import { STAGES } from "./rooms";
import { speak } from "./transitions";
import type { FloorMeta, TowerId } from "./floors";
import { mat, type V3 } from "./kit";

/**
 * A tower interior: a stack of dollhouse floors (front wall removed) on its
 * own stage, with an elevator on the back wall of every floor. The camera
 * frames one floor at a time; picking a floor sends him up or down: the view
 * slides to it (the HUD adds motion streaks and the floor's tint), the
 * elevator doors open and he walks out to his spot, turns to you and speaks.
 *
 * Each floor brings its own room (props + animations), where he stands, and
 * optionally a `script`: a choreography over time since arrival that drives
 * him completely (the extracurricular floors use this). Rooms read
 * `runtime.room` (`id`, `t`) to run their own animations in step.
 */

export type ActorFrame = { pos?: V3; yaw?: number; pose?: Pose; lean?: number; gear?: Gear; speak?: boolean; faceCamera?: boolean };
export type RoomProps = { active: boolean; w: number; d: number; h: number };

export type FloorDef = {
  meta: FloorMeta;
  /** interior wall paint, floor colour */
  wall: string;
  floor?: string;
  Room: ComponentType<RoomProps>;
  /** where he ends up (local to the floor), and his pose there */
  spot: { pos: V3; yaw: number; pose: Pose };
  /** full choreography from arrival (overrides the walk-out + spot) */
  script?: (t: number) => ActorFrame;
  /** things he walks up to when the HUD selects them (gallery frames) */
  targets?: Record<string, { pos: V3; yaw: number }>;
  /** where the camera moves in to when an item is picked (centre x, y, and the width to fit) */
  focus?: Record<string, { x: number; y: number; w: number }>;
  itemSpeech?: (item: string) => string;
  /** camera moves for a hero moment: push in (0–1 of the distance), lift, shake */
  cam?: (t: number) => { push?: number; dy?: number };
  /** the room's own lighting dims the fill light (the hall of records starts dark) */
  fill?: (t: number) => number;
};

const ELEVATOR = { w: 1.1, h: 2.25 };
const WALK = 1.7;

export function Tower({
  building,
  floors,
  w,
  d,
  fh,
  outer = "brick",
}: {
  building: TowerId;
  floors: FloorDef[];
  w: number;
  d: number;
  fh: number;
  outer?: "brick" | "brownstone" | "limestone" | "cream";
}) {
  const stage = STAGES[building];
  const { camera, size } = useThree();
  const current = useTown((s) => Math.min(s.floor, floors.length - 1));
  const m = getMats();
  const shell = m[outer] as THREE.Material;
  const levelY = (i: number) => stage.y + (floors.length - 1 - i) * fh;
  const elevatorX = -w / 2 + 0.95;

  const actor = useRef<THREE.Group>(null);
  const backdrop = useRef<THREE.MeshBasicMaterial>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const [look, setLook] = useState<{ pose: Pose; gear: Gear }>({ pose: "idle", gear: null });
  const st = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      yaw: 0,
      lean: 0,
      path: [] as THREE.Vector3[],
      spoke: false,
      item: null as string | null,
      pending: null as string | null,
      faceYaw: null as number | null,
      camPos: new THREE.Vector3(),
      camLook: new THREE.Vector3(),
      curLook: new THREE.Vector3(),
      snap: true,
      mood: new THREE.Color(),
      head: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
    }),
    [],
  );
  const local = (i: number, p: V3, out = new THREE.Vector3()) => out.set(stage.x + p[0], levelY(i) + p[1], stage.z + p[2]);

  // leaving: forget where we were so the next visit starts fresh
  useEffect(
    () => () => {
      runtime.room.id = "";
      runtime.bubble.visible = false;
    },
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useTown.getState();
    const def = floors[current];
    const r = runtime.room;

    // ── a new floor: he's in the elevator, doors about to open
    if (r.id !== def.meta.id) {
      r.id = def.meta.id;
      r.t = 0;
      r.shake = 0;
      st.spoke = false;
      st.item = null;
      st.pending = null;
      st.faceYaw = null;
      if (s.speech) s.say(null);
      local(current, [elevatorX, 0, -d / 2 - 0.35], st.pos);
      st.yaw = 0;
      st.path = def.script ? [] : [local(current, def.spot.pos)];
    }
    r.t += dt;
    const t = r.t;

    // ── him
    let pose: Pose = "idle";
    let gear: Gear = null;
    let wantYaw = st.yaw;
    let lean = 0;
    if (def.script) {
      const f = def.script(t);
      if (f.pos) local(current, f.pos, st.pos);
      if (f.yaw !== undefined) wantYaw = f.yaw;
      if (f.faceCamera || (s.speech && f.faceCamera !== false && !f.pose)) wantYaw = 0;
      pose = f.pose ?? "idle";
      gear = f.gear ?? null;
      lean = f.lean ?? 0;
      if (f.speak && !st.spoke) {
        st.spoke = true;
        speak(def.meta.speech);
      }
    } else {
      // something picked in the HUD (a frame): walk over to it
      if (s.item !== st.item) {
        st.item = s.item;
        const tg = s.item ? def.targets?.[s.item] : undefined;
        if (tg) {
          st.path = [local(current, tg.pos)];
          st.pending = def.itemSpeech?.(s.item!) ?? null;
          st.faceYaw = tg.yaw;
          if (s.speech) s.say(null);
        }
      }
      if (t > 0.45 && st.path.length) {
        const to = st.path[0];
        st.tmp.subVectors(to, st.pos);
        st.tmp.y = 0;
        const dist = st.tmp.length();
        const step = WALK * dt;
        if (dist <= step) {
          st.pos.copy(to);
          st.path.shift();
        } else {
          st.pos.addScaledVector(st.tmp.normalize(), step);
          wantYaw = Math.atan2(st.tmp.x, st.tmp.z);
        }
        pose = "walk";
      }
      if (!st.path.length && t > 0.45) {
        if (!st.spoke) {
          st.spoke = true;
          speak(def.meta.speech);
        } else if (st.pending) {
          speak(st.pending);
          st.pending = null;
        }
        const atItem = st.item && st.faceYaw !== null;
        pose = atItem ? "present" : def.spot.pose;
        wantYaw = s.speech ? (atItem ? -0.5 : 0) : atItem ? st.faceYaw! : def.spot.yaw;
        if (s.speech && !atItem && ["type", "read", "eat", "relax", "sit"].includes(def.spot.pose)) pose = "sit";
      }
    }
    const a = actor.current!;
    a.position.copy(st.pos);
    st.yaw += Math.atan2(Math.sin(wantYaw - st.yaw), Math.cos(wantYaw - st.yaw)) * (1 - Math.exp(-dt * 9));
    st.lean += (lean - st.lean) * (1 - Math.exp(-dt * 6));
    a.rotation.set(0, st.yaw, 0);
    a.rotateZ(st.lean);
    if (pose !== look.pose || gear !== look.gear) setLook({ pose, gear });

    // ── camera: frames this floor; on narrow screens it follows him across
    // on desktop the floor selector takes the right ~21% of the screen, so the
    // room is framed in what's left (the camera slides right by that much)
    const aspect = size.width / Math.max(1, size.height);
    // single-room buildings (the gallery) have no selector: their plaque on the left takes ~26% instead
    const side = size.width < 768 ? 0 : floors.length > 1 ? 0.21 : -0.26;
    const tanH = Math.tan(THREE.MathUtils.degToRad(45 / 2));
    const fitW = (w / 2 + 0.6) / (tanH * aspect * (1 - Math.abs(side)));
    const cm = def.cam?.(t) ?? {};
    const fy = levelY(current);
    const fo = st.item ? def.focus?.[st.item] : undefined;
    if (fo) {
      // moved in on the picked item, fitting it (and him beside it)
      const fd = Math.max(6.2, (fo.w / 2 + 0.5) / (tanH * aspect * (1 - Math.abs(side))));
      const hv = fd * tanH * aspect;
      // phones: the plaque fills the lower half, so the frame sits in the top half
      const low = size.width < 768 ? -1.1 : 0;
      st.camPos.set(stage.x + fo.x + hv * side, fy + fo.y + 0.2 + low, stage.z + fd);
      st.camLook.set(stage.x + fo.x + hv * side, fy + fo.y - 0.1 + low, stage.z - 0.3);
    } else {
      const dist = THREE.MathUtils.clamp(fitW * 1.06, 8.6, 19) * (1 - (cm.push ?? 0));
      const halfView = dist * tanH * aspect;
      const slack = Math.max(0, w / 2 + 0.4 - halfView);
      const cx = stage.x + THREE.MathUtils.clamp(st.pos.x - stage.x, -slack, slack) + halfView * side;
      st.camPos.set(cx + 0.2, fy + 1.55 + (dist - 8.6) * 0.05 + (cm.dy ?? 0), stage.z + dist);
      st.camLook.set(cx, fy + 1.4 + (cm.dy ?? 0) * 0.5, stage.z - 0.3);
    }
    if (r.shake > 0) {
      r.shake = Math.max(0, r.shake - dt * 2.5);
      const k = r.shake * 0.12;
      st.camPos.x += (Math.random() - 0.5) * k;
      st.camPos.y += (Math.random() - 0.5) * k;
    }
    const k = st.snap ? 1 : 1 - Math.exp(-dt * 5);
    camera.position.lerp(st.camPos, k);
    st.curLook.lerp(st.camLook, st.snap ? 1 : k);
    camera.lookAt(st.curLook);
    st.snap = false;

    // ── mood backdrop + the fill light (deeper at night)
    const night = runtime.env.night;
    const fill = def.fill?.(t) ?? 1;
    st.mood.set(def.meta.mood).lerp(new THREE.Color("#0B1024"), Math.min(1, night * 0.45 + (1 - fill) * 0.85));
    backdrop.current?.color.lerp(st.mood, 1 - Math.exp(-dt * (fill < 1 ? 8 : 3)));
    if (ambient.current) ambient.current.intensity += ((0.55 + night * 0.35) * fill - ambient.current.intensity) * (1 - Math.exp(-dt * 8));
    if (key.current) key.current.intensity += (1.1 * fill - key.current.intensity) * (1 - Math.exp(-dt * 8));

    // ── speech bubble anchor
    const seated = ["sit", "type", "read", "eat", "relax"].includes(pose);
    st.head.copy(st.pos).add(st.tmp.set(0, seated ? 1.65 : 2.1, 0)).project(camera);
    runtime.bubble.x = (st.head.x * 0.5 + 0.5) * size.width;
    runtime.bubble.y = (-st.head.y * 0.5 + 0.5) * size.height;
    runtime.bubble.visible = true;
  });

  return (
    <group>
      <ambientLight ref={ambient} intensity={0.6} color="#fff4e6" />
      <directionalLight ref={key} position={[stage.x + 4, stage.y + 40, stage.z + 14]} intensity={1.1} color="#fff1dc">
        <object3D attach="target" position={[stage.x, stage.y, stage.z]} />
      </directionalLight>

      {/* the mood backdrop around the diorama */}
      <mesh position={[stage.x, stage.y + (floors.length * fh) / 2, stage.z - 2]}>
        <boxGeometry args={[80, floors.length * fh + 60, 50]} />
        <meshBasicMaterial ref={backdrop} side={THREE.BackSide} color={floors[current].meta.mood} fog={false} />
      </mesh>

      {floors.map((f, i) => (
        <group key={f.meta.id} position={[stage.x, levelY(i), stage.z]}>
          <FloorShell w={w} d={d} fh={fh} shell={shell} wall={f.wall} floorColor={f.floor} elevatorX={elevatorX} active={i === current} id={f.meta.id} />
          {Math.abs(i - current) <= 1 && <f.Room active={i === current} w={w} d={d} h={fh} />}
        </group>
      ))}
      {/* roof + base */}
      <mesh position={[stage.x, levelY(0) + fh + 0.15, stage.z]} material={m.brownstoneDark}>
        <boxGeometry args={[w + 0.7, 0.3, d + 0.5]} />
      </mesh>
      <mesh position={[stage.x, stage.y - 0.35, stage.z]} material={m.creamShade} receiveShadow>
        <boxGeometry args={[w + 1.6, 0.5, d + 1.4]} />
      </mesh>

      <group ref={actor}>
        <Character pose={look.pose} gear={look.gear} />
      </group>
    </group>
  );
}

/** slab, back wall (with the elevator opening), side walls, painted insides */
function FloorShell({
  w,
  d,
  fh,
  shell,
  wall,
  floorColor = "#B8865B",
  elevatorX,
  active,
  id,
}: {
  w: number;
  d: number;
  fh: number;
  shell: THREE.Material;
  wall: string;
  floorColor?: string;
  elevatorX: number;
  active: boolean;
  id: string;
}) {
  const T = 0.22;
  const paint = mat(wall, { rough: 0.95 });
  const ex = elevatorX;
  const { w: ew, h: eh } = ELEVATOR;
  const left = ex - ew / 2 - (-w / 2);
  const right = w / 2 - (ex + ew / 2);
  const doorL = useRef<THREE.Mesh>(null);
  const doorR = useRef<THREE.Mesh>(null);
  const open = useRef(0);
  useFrame((_, dt) => {
    // doors: open as he arrives, close once he's out
    const r = runtime.room;
    const want = active && r.id === id && r.t < 1.7 ? 1 : 0;
    open.current += (want - open.current) * (1 - Math.exp(-Math.min(dt, 0.05) * 7));
    const o = open.current * (ew / 2 - 0.04);
    doorL.current!.position.x = ex - ew / 4 - o;
    doorR.current!.position.x = ex + ew / 4 + o;
  });
  return (
    <group>
      <mesh position={[0, -0.09, 0]} material={mat(floorColor, { rough: 0.85 })} receiveShadow>
        <boxGeometry args={[w, 0.18, d]} />
      </mesh>
      {/* back wall in three pieces around the elevator */}
      <mesh position={[-w / 2 + left / 2 - T / 2, fh / 2, -d / 2 - T / 2]} material={shell}>
        <boxGeometry args={[left + T, fh, T]} />
      </mesh>
      <mesh position={[ex + ew / 2 + right / 2 + T / 2, fh / 2, -d / 2 - T / 2]} material={shell}>
        <boxGeometry args={[right + T, fh, T]} />
      </mesh>
      <mesh position={[ex, eh + (fh - eh) / 2, -d / 2 - T / 2]} material={shell}>
        <boxGeometry args={[ew, fh - eh, T]} />
      </mesh>
      <mesh position={[-w / 2 + left / 2, fh / 2, -d / 2 + 0.005]} material={paint}>
        <planeGeometry args={[left, fh]} />
      </mesh>
      <mesh position={[ex + ew / 2 + right / 2, fh / 2, -d / 2 + 0.005]} material={paint}>
        <planeGeometry args={[right, fh]} />
      </mesh>
      <mesh position={[ex, eh + (fh - eh) / 2, -d / 2 + 0.005]} material={paint}>
        <planeGeometry args={[ew, fh - eh]} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * (w / 2 + T / 2), fh / 2, 0]} material={shell}>
            <boxGeometry args={[T, fh, d]} />
          </mesh>
          <mesh position={[sx * (w / 2 - 0.005), fh / 2, 0]} rotation-y={-sx * Math.PI / 2} material={paint}>
            <planeGeometry args={[d, fh]} />
          </mesh>
        </group>
      ))}
      {/* the cut edge at the floor line */}
      <mesh position={[0, -0.01, d / 2 - 0.04]} material={mat("#3a2a22")}>
        <boxGeometry args={[w + T * 2, 0.2, 0.1]} />
      </mesh>

      {/* elevator: brass frame, car behind, sliding doors, floor number */}
      <mesh position={[ex, eh / 2, -d / 2 - T - 0.45]} material={mat("#F3E6CF", { emissive: "#FFE2B0", glow: 0.35 })}>
        <boxGeometry args={[ew, eh, 0.9]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[ex + sx * (ew / 2 + 0.05), eh / 2, -d / 2 + 0.03]} material={mat("#C9A227", { metal: 0.6, rough: 0.35 })}>
          <boxGeometry args={[0.1, eh + 0.1, 0.08]} />
        </mesh>
      ))}
      <mesh position={[ex, eh + 0.08, -d / 2 + 0.03]} material={mat("#C9A227", { metal: 0.6, rough: 0.35 })}>
        <boxGeometry args={[ew + 0.3, 0.1, 0.08]} />
      </mesh>
      <mesh ref={doorL} position={[ex - ew / 4, eh / 2, -d / 2 - 0.04]} material={mat("#C7CBCF", { metal: 0.7, rough: 0.3 })}>
        <boxGeometry args={[ew / 2, eh, 0.04]} />
      </mesh>
      <mesh ref={doorR} position={[ex + ew / 4, eh / 2, -d / 2 - 0.04]} material={mat("#C7CBCF", { metal: 0.7, rough: 0.3 })}>
        <boxGeometry args={[ew / 2, eh, 0.04]} />
      </mesh>
      {/* the call lamp over the doors (lit while it's here) */}
      <mesh position={[ex, eh + 0.32, -d / 2 + 0.02]} material={mat("#121212")}>
        <planeGeometry args={[0.36, 0.2]} />
      </mesh>
      <mesh position={[ex, eh + 0.32, -d / 2 + 0.03]} material={mat(active ? "#FFC67A" : "#5a4a35", { basic: true })}>
        <circleGeometry args={[0.055, 16]} />
      </mesh>
    </group>
  );
}
