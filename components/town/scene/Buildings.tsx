"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { BUILDINGS, COPPER, CROWN, MAILBOX_LOCAL, buildingHeight, placement, roofTop, type Building, type BuildingId } from "../world/layout";
import { registry } from "../world/registry";
import { useTown } from "../state";
import { getMats, type Mats } from "./materials";


/* ── part collection ──────────────────────────────────────────────────
 * Repeating details (windows, lintels, ledges, doors, awning stripes, stoop
 * steps, fire escapes, columns) are collected as unit boxes / cylinders with a
 * world matrix, grouped by material, and drawn with one InstancedMesh per
 * material for the whole block.
 */
type MatKey = keyof Mats;
type Part = { mat: MatKey; m: THREE.Matrix4 };
type V3 = [number, number, number];

const o = new THREE.Object3D();
function local(b: THREE.Matrix4, p: V3, s: V3, r: V3 = [0, 0, 0]) {
  o.position.set(...p);
  o.rotation.set(...r);
  o.scale.set(...s);
  o.updateMatrix();
  return new THREE.Matrix4().multiplyMatrices(b, o.matrix);
}

function buildingMatrix(b: Building) {
  const p = placement(b);
  o.position.set(p.x, 0, p.z);
  o.rotation.set(0, p.rotY, 0);
  o.scale.set(1, 1, 1);
  o.updateMatrix();
  return o.matrix.clone();
}

// deterministic "is this window lit at night" (~70% are)
const lit = (x: number, y: number, z: number) => {
  const k = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return k - Math.floor(k) > 0.3;
};

type Face = "front" | "back" | "left" | "right";

/** Window = tiffany frame, glass (lit or dark at night), limestone sill and lintel. */
function windowOn(parts: Part[], M: THREE.Matrix4, face: Face, b: Building, u: number, y: number, ww: number, wh: number, lintel = true) {
  const hw = b.w / 2;
  const hd = b.d / 2;
  const spec = {
    front: { p: (d: number, yy: number): V3 => [u, yy, hd + d], ry: 0 },
    back: { p: (d: number, yy: number): V3 => [-u, yy, -hd - d], ry: Math.PI },
    left: { p: (d: number, yy: number): V3 => [-hw - d, yy, u], ry: -Math.PI / 2 },
    right: { p: (d: number, yy: number): V3 => [hw + d, yy, -u], ry: Math.PI / 2 },
  }[face];
  const r: V3 = [0, spec.ry, 0];
  const pos = spec.p(0.05, y);
  parts.push({ mat: "tiffany", m: local(M, spec.p(0.02, y), [ww + 0.16, wh + 0.16, 0.08], r) });
  parts.push({ mat: lit(pos[0] + b.angle, pos[1], pos[2]) ? "glassLit" : "glassDark", m: local(M, pos, [ww, wh, 0.06], r) });
  parts.push({ mat: "limestone", m: local(M, spec.p(0.08, y - wh / 2 - 0.1), [ww + 0.32, 0.1, 0.18], r) }); // sill
  if (lintel) parts.push({ mat: "limestone", m: local(M, spec.p(0.06, y + wh / 2 + 0.14), [ww + 0.36, 0.16, 0.12], r) });
}

/**
 * Tiffany door + frame, striped orange awning with a warm light strip under it.
 * `hinged`: the door leaf itself is drawn separately so it can open (Home).
 */
function entrance(parts: Part[], M: THREE.Matrix4, z: number, dw: number, dh: number, aw: number, base = 0, hinged = false) {
  parts.push({ mat: "tiffanyDeep", m: local(M, [0, base + dh / 2 + 0.04, z + 0.02], [dw + 0.3, dh + 0.18, 0.1]) });
  if (!hinged) {
    parts.push({ mat: "tiffany", m: local(M, [0, base + dh / 2, z + 0.07], [dw, dh, 0.08]) });
    parts.push({ mat: "orange", m: local(M, [dw * 0.3, base + dh * 0.5, z + 0.14], [0.09, 0.09, 0.06]) });
  }
  const ay = base + dh + 0.42;
  const tilt = 0.38;
  parts.push({ mat: "orange", m: local(M, [0, ay, z + 0.55], [aw, 0.08, 1.15], [tilt, 0, 0]) });
  const stripes = Math.max(3, Math.round(aw / 0.55));
  for (let i = 0; i < stripes; i += 2) {
    const x = -aw / 2 + (aw / stripes) * (i + 0.5);
    parts.push({ mat: "cream", m: local(M, [x, ay + 0.045, z + 0.55], [aw / stripes, 0.02, 1.15], [tilt, 0, 0]) });
  }
  parts.push({ mat: "orangeDeep", m: local(M, [0, ay - 0.27, z + 1.08], [aw, 0.18, 0.06]) });
  parts.push({ mat: "awningLight", m: local(M, [0, ay - 0.08, z + 0.5], [aw - 0.3, 0.03, 0.5], [tilt, 0, 0]) });
  if (base === 0) parts.push({ mat: "creamShade", m: local(M, [0, 0.06, z + 0.55], [dw + 0.9, 0.12, 0.9]) });
}

/** A fire escape on a side face: platforms, railings and ladders per floor. */
function fireEscape(parts: Part[], M: THREE.Matrix4, b: Building, side: 1 | -1, from: number) {
  const x = side * (b.w / 2 + 0.45);
  const width = Math.min(3.2, b.d - 1.4);
  for (let k = from; k < b.floors; k++) {
    const y = b.groundH + (k - 1) * b.floorH + 0.05;
    parts.push({ mat: "iron", m: local(M, [x, y, 0], [0.9, 0.06, width]) });
    parts.push({ mat: "iron", m: local(M, [x + side * 0.43, y + 0.45, 0], [0.04, 0.04, width]) }); // top rail
    for (const z of [-width / 2, -width / 4, 0, width / 4, width / 2])
      parts.push({ mat: "iron", m: local(M, [x + side * 0.43, y + 0.23, z], [0.03, 0.46, 0.03]) });
    if (k > from) {
      const climb = b.floorH;
      const run = width * 0.7;
      const dir = k % 2 ? 1 : -1;
      parts.push({ mat: "iron", m: local(M, [x, y - climb / 2, 0], [0.5, 0.05, Math.hypot(climb, run)], [Math.atan2(climb, run) * dir, 0, 0]) });
    }
  }
}

function collectParts() {
  const boxes: Part[] = [];
  const cyls: Part[] = [];

  for (const b of BUILDINGS) {
    const M = buildingMatrix(b);
    const H = buildingHeight(b);
    const hd = b.d / 2;
    const floorY = (k: number) => b.groundH + (k - 1) * b.floorH + b.floorH / 2 + 0.05; // centre of upper floor k ≥ 1

    if (b.kind === "house") {
      // brownstone: raised parlour floor on a stoop
      const base = 1.15;
      boxes.push({ mat: "brownstoneDark", m: local(M, [0, base / 2, hd + 0.45], [2.3, base, 0.9]) }); // landing
      for (let k = 0; k < 5; k++) {
        const h = base - k * 0.23;
        boxes.push({ mat: "brownstone", m: local(M, [0, h / 2, hd + 0.9 + k * 0.28 + 0.14], [1.9, h, 0.28]) });
      }
      for (const sx of [-1.05, 1.05]) {
        boxes.push({ mat: "iron", m: local(M, [sx, base + 0.3, hd + 1.55], [0.05, 0.05, 1.75], [-0.6, 0, 0]) }); // handrail
        boxes.push({ mat: "iron", m: local(M, [sx, 0.55, hd + 2.25], [0.06, 1.1, 0.06]) }); // newel
      }
      entrance(boxes, M, hd, HOME_DOOR.w, HOME_DOOR.h, 2.4, HOME_DOOR.base, true);
      for (const x of [-2.35, 2.35]) {
        windowOn(boxes, M, "front", b, x, 2.45, 1.2, 1.7); // parlour windows
        windowOn(boxes, M, "front", b, x, 0.55, 1.0, 0.6, false); // garden level
      }
      for (let k = 1; k < b.floors; k++)
        for (const x of [-2.35, 0, 2.35]) {
          if (k === 1 && x === 0) continue; // the facade sign lives here
          windowOn(boxes, M, "front", b, x, floorY(k), 1.1, 1.45);
        }
      for (let k = 0; k < b.floors; k++)
        for (const f of ["left", "right", "back"] as const) windowOn(boxes, M, f, b, 0, k === 0 ? 2.2 : floorY(k), 1.1, 1.4);
      // cornice with a tiffany band and dentils
      boxes.push({ mat: "brownstoneDark", m: local(M, [0, H + 0.2, 0.08], [b.w + 0.5, 0.42, b.d + 0.5]) });
      boxes.push({ mat: "tiffany", m: local(M, [0, H - 0.08, 0], [b.w + 0.22, 0.12, b.d + 0.22]) });
      for (let i = 0; i < 14; i++)
        boxes.push({ mat: "limestone", m: local(M, [-b.w / 2 + 0.25 + i * ((b.w - 0.5) / 13), H - 0.02, hd + 0.2], [0.14, 0.12, 0.12]) });
      // water tower on the roof
      const wx = -1.6;
      const wz = -0.9;
      for (const [lx, lz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]])
        boxes.push({ mat: "iron", m: local(M, [wx + lx, H + 1.2, wz + lz], [0.08, 1.6, 0.08]) });
      boxes.push({ mat: "iron", m: local(M, [wx, H + 2.0, wz], [1.5, 0.08, 1.5]) });
      cyls.push({ mat: "wood", m: local(M, [wx, H + 2.85, wz], [0.85, 1.6, 0.85]) });
      for (const yy of [2.35, 2.85, 3.35]) cyls.push({ mat: "iron", m: local(M, [wx, H + yy, wz], [0.87, 0.05, 0.87]) });
    } else if (b.kind === "tower" || b.kind === "gallery" || b.kind === "education") {
      for (let k = 0; k < b.floors; k++) {
        const y = b.groundH + k * b.floorH;
        boxes.push({ mat: "tiffany", m: local(M, [0, y, 0], [b.w + 0.22, 0.14, b.d + 0.22]) });
      }
      boxes.push({ mat: b.kind === "gallery" ? "brickDark" : "creamShade", m: local(M, [0, H + 0.18, 0], [b.w + 0.36, 0.36, b.d + 0.36]) }); // cornice

      const cols = b.kind === "gallery" ? [-3.3, -1.1, 1.1, 3.3] : b.kind === "tower" ? [-1.9, 0, 1.9] : [-4, -2, 0, 2, 4];
      const sideCols = b.kind === "education" ? [-1.8, 1.8] : [-1.9, 0, 1.9];
      const wh = b.kind === "gallery" ? 1.75 : b.kind === "education" ? 1.7 : 1.2;
      const ww = b.kind === "gallery" ? 0.95 : 1.0;
      const lintels = b.kind !== "tower";
      for (let k = 1; k < b.floors; k++) {
        for (const u of cols) windowOn(boxes, M, "front", b, u, floorY(k), ww, wh, lintels);
        for (const u of sideCols) {
          windowOn(boxes, M, "left", b, u, floorY(k), ww, wh, lintels);
          windowOn(boxes, M, "right", b, u, floorY(k), ww, wh, lintels);
          windowOn(boxes, M, "back", b, u, floorY(k), ww, wh, lintels);
        }
      }
      for (const u of sideCols) {
        windowOn(boxes, M, "left", b, u, 2.0, ww, 1.5);
        windowOn(boxes, M, "right", b, u, 2.0, ww, 1.5);
      }

      if (b.kind === "tower") {
        // art deco: piers between window columns, a stepped crown, a spire
        for (const x of [-2.95, -0.95, 0.95, 2.95])
          for (const f of [1, -1]) boxes.push({ mat: "creamShade", m: local(M, [x, (b.groundH + H) / 2, f * (hd + 0.06)], [0.3, H - b.groundH, 0.14]) });
        for (const x of [-2.2, 2.2]) windowOn(boxes, M, "front", b, x, 1.9, 0.9, 1.6);
        let w = b.w - CROWN.firstInset;
        let y = roofTop(b);
        for (const h of CROWN.tiers) {
          boxes.push({ mat: "limestone", m: local(M, [0, y + h / 2, 0], [w, h, w]) });
          boxes.push({ mat: "tiffany", m: local(M, [0, y + h - 0.05, 0], [w + 0.16, 0.1, w + 0.16]) });
          for (const f of [1, -1]) boxes.push({ mat: "awningLight", m: local(M, [0, y + h * 0.5, f * (w / 2 + 0.01)], [w * 0.7, 0.08, 0.02]) }); // crown lights
          for (const sx of [-1, 1])
            boxes.push({ mat: "orange", m: local(M, [sx * (w / 2 - 0.15), y + h / 2, w / 2 + 0.02], [0.12, h * 0.9, 0.04]) }); // deco fins
          y += h;
          w -= CROWN.step;
        }
        boxes.push({ mat: "limestone", m: local(M, [0, y + CROWN.spire / 2, 0], [0.5, CROWN.spire, 0.5], [0, Math.PI / 4, 0]) });
      }
      if (b.kind === "gallery") {
        for (const x of [-3.3, 3.3]) windowOn(boxes, M, "front", b, x, 1.9, 1.9, 2.2);
        for (const x of [-4.45, 4.45]) boxes.push({ mat: "orange", m: local(M, [x, b.groundH + 4.6, hd + 0.08], [0.62, 7.6, 0.06]) });
        fireEscape(boxes, M, b, -1, 1);
        fireEscape(boxes, M, b, 1, 1);
      }
      if (b.kind === "education") {
        for (const x of [-2.85, -0.95, 0.95, 2.85]) {
          cyls.push({ mat: "limestone", m: local(M, [x, 2.3, hd + 1.1], [0.3, 4.6, 0.3]) });
          cyls.push({ mat: "tiffany", m: local(M, [x, 4.5, hd + 1.1], [0.4, 0.2, 0.4]) }); // capitals
          cyls.push({ mat: "creamShade", m: local(M, [x, 0.12, hd + 1.1], [0.42, 0.24, 0.42]) });
        }
        boxes.push({ mat: "limestone", m: local(M, [0, 5.05, hd + 1.0], [8.4, 0.9, 2.5]) });
        boxes.push({ mat: "tiffany", m: local(M, [0, 4.62, hd + 1.0], [8.5, 0.1, 2.56]) });
        boxes.push({ mat: "creamShade", m: local(M, [0, 0.07, hd + 1.9], [8.8, 0.14, 1.4]) });
        for (const x of [-4.3, 4.3]) windowOn(boxes, M, "front", b, x, 2.0, 1.0, 1.7);
        entrance(boxes, M, hd, 1.7, 2.5, 2.8);
      } else {
        entrance(boxes, M, hd, b.kind === "tower" ? 2.0 : 2.2, 2.5, b.kind === "tower" ? 3.4 : 3.8);
      }
    } else if (b.kind === "round") {
      const r = b.w / 2;
      for (let k = 0; k < b.floors; k++) cyls.push({ mat: "limestone", m: local(M, [0, b.groundH + k * b.floorH, 0], [r + 0.14, 0.16, r + 0.14]) });
      for (let k = 0; k < b.floors; k++) {
        const y = k === 0 ? 2.0 : floorY(k);
        for (let j = 0; j < 8; j++) {
          const a = (j / 8) * Math.PI * 2 + Math.PI / 8;
          if (k === 0 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.9) continue;
          boxes.push({ mat: "tiffany", m: local(M, [Math.sin(a) * (r + 0.02), y, Math.cos(a) * (r + 0.02)], [0.9, 1.25, 0.1], [0, a, 0]) });
          boxes.push({ mat: lit(j, k, b.angle) ? "glassLit" : "glassDark", m: local(M, [Math.sin(a) * (r + 0.06), y, Math.cos(a) * (r + 0.06)], [0.72, 1.07, 0.06], [0, a, 0]) });
          boxes.push({ mat: "limestone", m: local(M, [Math.sin(a) * (r + 0.08), y + 0.76, Math.cos(a) * (r + 0.08)], [1.0, 0.14, 0.1], [0, a, 0]) });
        }
      }
      boxes.push({ mat: "brickDark", m: local(M, [0, 1.6, r - 0.1], [3.0, 3.2, 0.8]) }); // vestibule
      entrance(boxes, M, r + 0.3, 1.9, 2.4, 3.2);
    }
  }
  return { boxes, cyls };
}

function Batch({ parts, geometry, mats }: { parts: Part[]; geometry: THREE.BufferGeometry; mats: Mats }) {
  const groups = useMemo(() => {
    const g = new Map<MatKey, THREE.Matrix4[]>();
    for (const p of parts) g.set(p.mat, [...(g.get(p.mat) ?? []), p.m]);
    return [...g.entries()];
  }, [parts]);
  return (
    <>
      {groups.map(([key, list]) => (
        <BatchMesh key={key} geometry={geometry} material={mats[key] as THREE.Material} matrices={list} />
      ))}
    </>
  );
}

function BatchMesh({ geometry, material, matrices }: { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    matrices.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [matrices]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow receiveShadow />;
}

/* ── per-building shells (bodies, roofs, facade signs, blockers) ────── */

function prism(width: number, height: number, depth: number) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

/* ── signs ─────────────────────────────────────────────────────────────
 * Every board has its own typeface (local .woff files, so nothing loads from a
 * CDN at runtime). Boards size themselves to the measured text.
 */
export const BOARD_FONTS: Record<BuildingId, { url: string; size: number; tracking?: number }> = {
  home: { url: "/fonts/fraunces-latin-600-normal.woff", size: 1 },
  experience: { url: "/fonts/limelight-latin-400-normal.woff", size: 0.92 },
  projects: { url: "/fonts/bebas-neue-latin-400-normal.woff", size: 1.18, tracking: 0.06 },
  extracurriculars: { url: "/fonts/bungee-latin-400-normal.woff", size: 0.72 },
  education: { url: "/fonts/cinzel-latin-700-normal.woff", size: 0.86, tracking: 0.04 },
};
export const STREET_FONT = "/fonts/barlow-condensed-latin-600-normal.woff";

/** rough width before the font has been measured */
export const signWidth = (text: string, size: number) => text.length * size * 0.5 + size * 1.4;

type TroikaText = { textRenderInfo?: { blockBounds: [number, number, number, number] } };

/** Board with a tiffany inlay and the building's own lettering. Shared by facade + post signs. */
export function SignBoard({
  text,
  building,
  size = 0.6,
  doubleSided = false,
  onWidth,
}: {
  text: string;
  building: BuildingId;
  size?: number;
  doubleSided?: boolean;
  onWidth?: (w: number) => void;
}) {
  const m = getMats();
  const f = BOARD_FONTS[building];
  const fs = size * f.size;
  const [width, setWidth] = useState(() => signWidth(text, size));
  const h = size * 1.45;
  const onSync = (mesh: TroikaText) => {
    const bb = mesh.textRenderInfo?.blockBounds;
    if (!bb) return;
    const w = bb[2] - bb[0] + size * 1.25;
    if (Math.abs(w - width) > 0.02) {
      setWidth(w);
      onWidth?.(w);
    }
  };
  return (
    <group>
      <RoundedBox args={[width, h, 0.14]} radius={0.06} smoothness={3} material={m.signInk} castShadow />
      {(doubleSided ? [0, Math.PI] : [0]).map((ry) => (
        <group key={ry} rotation-y={ry}>
          <mesh position={[0, 0, 0.075]} material={m.tiffany}>
            <boxGeometry args={[width - 0.16, h - 0.16, 0.005]} />
          </mesh>
          <mesh position={[0, 0, 0.08]} material={m.signInk}>
            <boxGeometry args={[width - 0.24, h - 0.24, 0.006]} />
          </mesh>
          <Text
            font={f.url}
            fontSize={fs}
            letterSpacing={f.tracking ?? 0}
            color="#F6EFE3"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.09]}
            onSync={onSync}
          >
            {text}
          </Text>
        </group>
      ))}
    </group>
  );
}

const BODY: Record<Building["kind"], MatKey> = {
  house: "brownstone",
  tower: "limestone",
  gallery: "brick",
  round: "brick",
  education: "limestone",
};

/** Home's front door: a hinged leaf that swings open for the intro walk-out. */
const HOME_DOOR = { w: 1.3, h: 2.2, base: 1.15 };

function HomeDoor({ z }: { z: number }) {
  const m = getMats();
  const hinge = useRef<THREE.Group>(null);
  const open = useRef(0);
  useFrame((_, dt) => {
    const want = useTown.getState().doorOpen ? 1 : 0;
    open.current += (want - open.current) * (1 - Math.exp(-Math.min(dt, 0.05) * (want ? 5 : 3.5)));
    hinge.current!.rotation.y = -1.7 * open.current; // swings out onto the landing
  });
  const { w, h, base } = HOME_DOOR;
  return (
    <group>
      {/* the warm hallway behind it */}
      <mesh position={[0, base + h / 2, z + 0.072]} material={m.doorway}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <group ref={hinge} position={[-w / 2, base, z + 0.07]}>
        <mesh position={[w / 2, h / 2, 0]} material={m.tiffany} castShadow>
          <boxGeometry args={[w, h, 0.08]} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh key={side} position={[w * 0.8, h / 2, side * 0.07]} material={m.orange}>
            <boxGeometry args={[0.09, 0.09, 0.06]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Shell({ b }: { b: Building }) {
  const m = getMats();
  const p = placement(b);
  const H = buildingHeight(b);
  const top = roofTop(b);
  const blocker = useRef<THREE.Mesh>(null);
  const portico = useRef<THREE.Mesh>(null);
  const stoop = useRef<THREE.Mesh>(null);
  const crownRefs = useRef<(THREE.Mesh | null)[]>([]);
  // Experience's stepped crown, tier by tier (centre height, width, height)
  const crown = useMemo(() => {
    const out: { y: number; w: number; h: number }[] = [];
    let w = b.w - CROWN.firstInset;
    let y = top;
    for (const h of CROWN.tiers) {
      out.push({ y: y + h / 2, w, h });
      y += h;
      w -= CROWN.step;
    }
    return out;
  }, [b, top]);

  useLayoutEffect(() => {
    const meshes = [blocker.current, portico.current, stoop.current, ...crownRefs.current].filter((x): x is THREE.Mesh => !!x);
    for (const mesh of meshes) mesh.userData.buildingId = b.id;
    registry.blockers.push(...meshes);
    return () => {
      registry.blockers = registry.blockers.filter((x) => !meshes.includes(x as THREE.Mesh));
    };
  }, [b.id]);

  const pediment = useMemo(() => (b.kind === "education" ? prism(8.9, 1.35, 2.5) : null), [b]);
  const body = m[BODY[b.kind]] as THREE.Material;

  return (
    <group position={[p.x, 0, p.z]} rotation-y={p.rotY}>
      {b.kind === "round" ? (
        <mesh position={[0, H / 2, 0]} material={body} castShadow receiveShadow>
          <cylinderGeometry args={[b.w / 2, b.w / 2 + 0.08, H, 28]} />
        </mesh>
      ) : (
        <RoundedBox args={[b.w, H, b.d]} radius={0.12} smoothness={2} position={[0, H / 2, 0]} material={body} castShadow receiveShadow />
      )}

      {b.kind === "round" && (
        <>
          {/* verdigris copper roof, the way old NYC copper roofs weather: a cone cut flat at the top (a deck he can land on) */}
          <mesh position={[0, H + COPPER.h / 2, 0]} material={m.tiffanyDeep} castShadow receiveShadow>
            <cylinderGeometry args={[COPPER.deck, b.w / 2 + COPPER.overhang, COPPER.h, 28]} />
          </mesh>
          <mesh position={[0, H + COPPER.h + 0.03, 0]} material={m.tiffany} receiveShadow>
            <cylinderGeometry args={[COPPER.deck + 0.04, COPPER.deck + 0.04, 0.06, 28]} />
          </mesh>
          {/* the finial on a short mast, with its weathervane */}
          <mesh position={[0, H + COPPER.h + COPPER.mast / 2, 0]} material={m.iron}>
            <cylinderGeometry args={[0.05, 0.07, COPPER.mast, 8]} />
          </mesh>
          <mesh position={[0, H + COPPER.h + COPPER.mast + 0.1, 0]} material={m.tiffany}>
            <icosahedronGeometry args={[0.2, 1]} />
          </mesh>
          <mesh position={[0.4, H + COPPER.h + COPPER.mast + 0.42, 0]} rotation-z={-Math.PI / 2} material={m.orange}>
            <coneGeometry args={[0.16, 0.7, 3]} />
          </mesh>
        </>
      )}

      {b.kind === "house" && <HomeDoor z={b.d / 2} />}

      {b.kind === "house" && (
        <mesh position={[-1.6, H + 4.05, -0.9]} material={m.brownstoneDark} castShadow>
          <coneGeometry args={[0.98, 0.8, 16]} />
        </mesh>
      )}

      {b.kind === "education" && (
        <>
          {/* the post-office corner: a small "contact" board and a mailbox */}
          <group position={[4.3, 2.75, b.d / 2 + 0.09]}>
            <SignBoard text="contact" building="education" size={0.3} />
          </group>
          <group position={[MAILBOX_LOCAL.x, 0, MAILBOX_LOCAL.z]}>
            <mesh position={[0, 0.5, 0]} material={m.tiffanyDeep} castShadow>
              <boxGeometry args={[0.5, 1.0, 0.45]} />
            </mesh>
            <mesh position={[0, 1.0, 0]} rotation-z={Math.PI / 2} material={m.tiffanyDeep} castShadow>
              <cylinderGeometry args={[0.225, 0.225, 0.5, 14, 1, false, 0, Math.PI]} />
            </mesh>
            <mesh position={[0, 0.82, 0.23]} material={m.orange}>
              <boxGeometry args={[0.3, 0.05, 0.02]} />
            </mesh>
            <mesh position={[0, 0.03, 0]} material={m.ink}>
              <boxGeometry args={[0.56, 0.06, 0.5]} />
            </mesh>
          </group>
        </>
      )}

      {b.kind === "education" && pediment && (
        <>
          <mesh geometry={pediment} material={m.limestone} position={[0, 5.5, b.d / 2 + 1.0]} castShadow />
          <mesh position={[0, 6.05, b.d / 2 + 2.26]} rotation-x={Math.PI / 2} material={m.cream}>
            <cylinderGeometry args={[0.42, 0.42, 0.04, 24]} />
          </mesh>
          <mesh position={[0, 6.05, b.d / 2 + 2.27]} rotation-x={Math.PI / 2} material={m.tiffany}>
            <torusGeometry args={[0.42, 0.04, 6, 24]} />
          </mesh>
          <mesh position={[0, 6.15, b.d / 2 + 2.3]} material={m.ink}>
            <boxGeometry args={[0.04, 0.22, 0.02]} />
          </mesh>
          <mesh position={[0.08, 6.05, b.d / 2 + 2.3]} rotation-z={Math.PI / 2} material={m.ink}>
            <boxGeometry args={[0.03, 0.17, 0.02]} />
          </mesh>
        </>
      )}


      {/* invisible volumes for camera occlusion + click-to-enter */}
      {/* (as tall as the roof really is, so he's never "hidden" standing on it) */}
      <mesh ref={blocker} position={[0, top / 2, 0]} visible={false}>
        {b.kind === "round" ? <cylinderGeometry args={[b.w / 2 + 0.35, b.w / 2 + 0.35, top, 12]} /> : <boxGeometry args={[b.w, top, b.d]} />}
      </mesh>
      {b.kind === "tower" &&
        crown.map((t, i) => (
          <mesh key={i} ref={(el) => void (crownRefs.current[i] = el)} position={[0, t.y, 0]} visible={false}>
            <boxGeometry args={[t.w, t.h, t.w]} />
          </mesh>
        ))}
      {b.kind === "house" && (
        <mesh ref={stoop} position={[0, 0.9, b.d / 2 + 0.72]} visible={false}>
          <boxGeometry args={[2.4, 1.8, 1.45]} />
        </mesh>
      )}
      {b.kind === "education" && (
        // the colonnade blocks the camera too, so it can't end up between columns
        <mesh ref={portico} position={[0, 3.4, b.d / 2 + 1.1]} visible={false}>
          <boxGeometry args={[8.6, 6.8, 0.8]} />
        </mesh>
      )}
    </group>
  );
}

export function Buildings() {
  const mats = getMats();
  const { boxes, cyls } = useMemo(() => collectParts(), []);
  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const unitCyl = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 20), []);
  return (
    <group>
      {BUILDINGS.map((b) => (
        <Shell key={b.id} b={b} />
      ))}
      <Batch parts={boxes} geometry={unitBox} mats={mats} />
      <Batch parts={cyls} geometry={unitCyl} mats={mats} />
    </group>
  );
}
