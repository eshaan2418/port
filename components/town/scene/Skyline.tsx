"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Distant skyline across the river: one merged mesh of low-poly towers (one
 * draw call) with a window-grid texture whose lit windows glow at night, a far
 * shore under them, and the silhouette of a generic suspension bridge.
 */

let material: THREE.MeshStandardMaterial | null = null;

function windowTextures() {
  const size = 128;
  const make = (fn: (g: CanvasRenderingContext2D) => void) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    fn(cv.getContext("2d")!);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  // deterministic pattern so day and night masks line up
  // 4×4 big cells per tile: sparse enough not to shimmer at a distance
  const cells: boolean[] = [];
  for (let i = 0; i < 16; i++) cells.push((Math.sin(i * 91.7) * 43758.5) % 1 > -0.1);
  const facade = make((g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, size, size);
    g.fillStyle = "#8a96a6";
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 32 + 8, y * 32 + 7, 16, 19);
  });
  const lit = make((g) => {
    g.fillStyle = "#000000";
    g.fillRect(0, 0, size, size);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        if (!cells[y * 4 + x]) continue;
        g.fillStyle = (x + y) % 3 ? "#e8b26a" : "#f3d39a";
        g.fillRect(x * 32 + 8, y * 32 + 7, 16, 19);
      }
  });
  return { facade, lit };
}

export function getSkylineMaterial() {
  if (!material) {
    const t = typeof document !== "undefined" ? windowTextures() : null;
    material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      flatShading: true,
      map: t?.facade ?? null,
      emissive: new THREE.Color("#ffffff"),
      emissiveMap: t?.lit ?? null,
      emissiveIntensity: 0,
    });
  }
  return material;
}

const TINTS = ["#9AA6B5", "#A89C92", "#8E9AAB", "#B3AAA0", "#7F8C9E", "#A7B0BA"];

function towerGeometry(lowDetail: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  let seed = 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const n = lowDetail ? 70 : 150;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const deg = (a * 180) / Math.PI;
    if (deg > 48 && deg < 72) continue; // leave the bridge sight-line open
    const r = 72 + rnd() * 70;
    // a taller "midtown" cluster behind Home
    const midtown = Math.max(0, Math.cos(a + Math.PI / 2)) ** 3;
    const h = 6 + rnd() * 22 + midtown * (16 + rnd() * 26);
    const w = 4 + rnd() * 7;
    const d = 4 + rnd() * 7;
    const g = new THREE.BoxGeometry(w, h, d);
    // tile the window texture by size (≈ 3 m cells)
    const uv = g.getAttribute("uv") as THREE.BufferAttribute;
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k++) {
      const face = Math.floor(k / 4); // BoxGeometry: 4 verts per face; 0,1 = ±x; 2,3 = ±y; 4,5 = ±z
      const across = face < 2 ? d : w;
      const isTop = face === 2 || face === 3;
      uv.setXY(k, uv.getX(k) * (isTop ? 0 : across / 9), uv.getY(k) * (isTop ? 0 : h / 9)); // tile = 9 m (4 windows)
    }
    g.translate(Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r);
    g.rotateY(0);
    const col = new THREE.Color(TINTS[i % TINTS.length]);
    const colors = new Float32Array(pos.count * 3);
    for (let k = 0; k < pos.count; k++) col.toArray(colors, k * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // a few setback crowns
    parts.push(g);
    if (h > 30 && rnd() > 0.4) {
      const c = new THREE.BoxGeometry(w * 0.6, h * 0.12, d * 0.6);
      c.translate(Math.cos(a) * r, h - 1.5 + h * 0.06, Math.sin(a) * r);
      const cc = new Float32Array(c.getAttribute("position").count * 3);
      for (let k = 0; k < cc.length / 3; k++) col.toArray(cc, k * 3);
      c.setAttribute("color", new THREE.BufferAttribute(cc, 3));
      const cu = c.getAttribute("uv") as THREE.BufferAttribute;
      for (let k = 0; k < cu.count; k++) cu.setXY(k, 0, 0);
      parts.push(c);
    }
  }
  return mergeGeometries(parts)!;
}

export function Skyline({ lowDetail }: { lowDetail: boolean }) {
  const geometry = useMemo(() => towerGeometry(lowDetail), [lowDetail]);
  const mat = useMemo(() => getSkylineMaterial(), []);
  return (
    <group>
      <mesh geometry={geometry} material={mat} />
      {/* far shore */}
      <mesh position={[0, -1.5, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[64, 300, 64]} />
        <meshStandardMaterial color="#6E7886" roughness={1} />
      </mesh>
      <Bridge />
    </group>
  );
}

/** A generic suspension bridge reaching across the river toward the island. */
function Bridge() {
  const geo = useMemo(() => {
    const a = (60 * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const at = (r: number, y: number, s = 0) => dir.clone().multiplyScalar(r).addScaledVector(side, s).setY(y);
    const parts: THREE.BufferGeometry[] = [];
    const box = (w: number, h: number, d: number, p: THREE.Vector3) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.rotateY(-a + Math.PI / 2);
      g.translate(p.x, p.y, p.z);
      parts.push(g);
    };
    // deck from the far shore to just short of the promenade
    const r0 = 26;
    const r1 = 66;
    box(2.6, 0.5, r1 - r0, at((r0 + r1) / 2, 3.2));
    // two towers, each a pair of legs with an arched top beam
    for (const r of [36, 56]) {
      for (const s of [-1.6, 1.6]) box(0.9, 16, 0.9, at(r, 6.5, s));
      box(4.1, 1.2, 1.1, at(r, 13.8));
      box(4.1, 0.8, 1.1, at(r, 9.5));
    }
    // main cables + suspenders
    for (const s of [-1.6, 1.6]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const r = r0 + ((r1 - r0) * i) / 24;
        let y: number;
        if (r < 36) y = 4 + ((r - r0) / 10) * 10.4;
        else if (r > 56) y = 14.4 - ((r - 56) / 10) * 10.4;
        else {
          const t = (r - 46) / 10;
          y = 5.2 + 9.2 * t * t;
        }
        pts.push(at(r, y, s));
        if (r > 36 && r < 56 && i % 2 === 0) {
          const g = new THREE.BoxGeometry(0.06, y - 3.4, 0.06);
          g.translate(pts[pts.length - 1].x, 3.4 + (y - 3.4) / 2, pts[pts.length - 1].z);
          parts.push(g);
        }
      }
      parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.12, 4));
    }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#8C8277" roughness={0.9} flatShading />
    </mesh>
  );
}
