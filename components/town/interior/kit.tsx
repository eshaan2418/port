"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { STREET_FONT } from "../scene/Buildings";

/**
 * A tiny kit of low-poly furniture for the tower rooms. Everything is in the
 * floor's local frame (x across, y up from the floor, z toward the camera;
 * the back wall is at z = −d/2). Materials are cached by colour so a room of
 * props stays a handful of shader programs.
 */

export type V3 = [number, number, number];

const cache = new Map<string, THREE.Material>();
export function mat(color: string, o: { rough?: number; metal?: number; emissive?: string; glow?: number; basic?: boolean; opacity?: number } = {}) {
  const key = `${color}|${o.rough}|${o.metal}|${o.emissive}|${o.glow}|${o.basic}|${o.opacity}`;
  let m = cache.get(key);
  if (!m) {
    if (o.basic) m = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1 });
    else
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: o.rough ?? 0.8,
        metalness: o.metal ?? 0,
        flatShading: true,
        emissive: o.emissive ? new THREE.Color(o.emissive) : undefined,
        emissiveIntensity: o.glow ?? 0,
        transparent: o.opacity !== undefined,
        opacity: o.opacity ?? 1,
      });
    cache.set(key, m);
  }
  return m;
}

export function Box({ at, size, color, rot, m, cast = true }: { at: V3; size: V3; color?: string; rot?: V3; m?: THREE.Material; cast?: boolean }) {
  return (
    <mesh position={at} rotation={rot} material={m ?? mat(color ?? "#cccccc")} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function Cyl({ at, r, h, color, m, seg = 14, rot, r2 }: { at: V3; r: number; h: number; color?: string; m?: THREE.Material; seg?: number; rot?: V3; r2?: number }) {
  return (
    <mesh position={at} rotation={rot} material={m ?? mat(color ?? "#cccccc")} castShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    </mesh>
  );
}

export function Desk({ at, w = 1.6, d = 0.7, color = "#8A6446", legs = "#2B2A2E", yaw = 0 }: { at: V3; w?: number; d?: number; color?: string; legs?: string; yaw?: number }) {
  return (
    <group position={at} rotation-y={yaw}>
      <Box at={[0, 0.75, 0]} size={[w, 0.06, d]} color={color} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Box key={`${sx}${sz}`} at={[sx * (w / 2 - 0.06), 0.37, sz * (d / 2 - 0.06)]} size={[0.05, 0.74, 0.05]} color={legs} cast={false} />))}
    </group>
  );
}

export function Chair({ at, yaw = 0, color = "#2B2A2E" }: { at: V3; yaw?: number; color?: string }) {
  return (
    <group position={at} rotation-y={yaw}>
      <Box at={[0, 0.45, 0]} size={[0.46, 0.06, 0.46]} color={color} />
      <Box at={[0, 0.74, -0.21]} size={[0.46, 0.52, 0.05]} color={color} />
      <Cyl at={[0, 0.22, 0]} r={0.03} h={0.44} color="#4a4a4a" seg={6} />
      <Cyl at={[0, 0.03, 0]} r={0.22} h={0.04} color="#4a4a4a" seg={10} />
    </group>
  );
}

/** a monitor facing +z; `screen` is a material (a canvas texture, a glow) */
export function Monitor({ at, w = 0.9, h = 0.55, screen, yaw = 0 }: { at: V3; w?: number; h?: number; screen: THREE.Material; yaw?: number }) {
  return (
    <group position={at} rotation-y={yaw}>
      <Box at={[0, h / 2 + 0.16, 0]} size={[w + 0.06, h + 0.06, 0.04]} color="#1b1b1f" />
      <mesh position={[0, h / 2 + 0.16, 0.022]} material={screen}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <Box at={[0, 0.08, 0]} size={[0.06, 0.16, 0.05]} color="#1b1b1f" cast={false} />
      <Box at={[0, 0.01, 0]} size={[0.3, 0.02, 0.18]} color="#1b1b1f" cast={false} />
    </group>
  );
}

export function Plant({ at, s = 1, pot = "#F6EFE3" }: { at: V3; s?: number; pot?: string }) {
  return (
    <group position={at} scale={s}>
      <Cyl at={[0, 0.2, 0]} r={0.18} r2={0.14} h={0.4} color={pot} seg={10} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2.1) * 0.1, 0.6 + i * 0.13, Math.cos(i * 2.1) * 0.1]} material={mat("#5DA36F", { rough: 0.9 })} castShadow>
          <icosahedronGeometry args={[0.21 - i * 0.03, 0]} />
        </mesh>
      ))}
    </group>
  );
}

export function Shelf({ at, w = 1.6, h = 1.9, d = 0.4, color = "#8A6446", rows = 4, yaw = 0, fill }: { at: V3; w?: number; h?: number; d?: number; color?: string; rows?: number; yaw?: number; fill?: (row: number) => ReactNode }) {
  return (
    <group position={at} rotation-y={yaw}>
      {[-1, 1].map((sx) => (
        <Box key={sx} at={[sx * (w / 2), h / 2, 0]} size={[0.05, h, d]} color={color} />
      ))}
      <Box at={[0, h / 2, -d / 2 + 0.02]} size={[w, h, 0.03]} color={color} cast={false} />
      {Array.from({ length: rows + 1 }, (_, r) => (
        <Box key={r} at={[0, 0.05 + (r * (h - 0.1)) / rows, 0]} size={[w, 0.04, d]} color={color} cast={false} />
      ))}
      {fill && Array.from({ length: rows }, (_, r) => <group key={`f${r}`} position={[0, 0.07 + (r * (h - 0.1)) / rows, 0]}>{fill(r)}</group>)}
    </group>
  );
}

/** a framed board on the back wall with drei text lines (Barlow) */
export function Board({
  at,
  w,
  h,
  color = "#F6EFE3",
  frame = "#2B2A2E",
  lines = [],
  ink = "#121212",
  size = 0.12,
  children,
}: {
  at: V3;
  w: number;
  h: number;
  color?: string;
  frame?: string;
  lines?: string[];
  ink?: string;
  size?: number;
  children?: ReactNode;
}) {
  return (
    <group position={at}>
      <Box at={[0, 0, -0.03]} size={[w + 0.08, h + 0.08, 0.04]} color={frame} cast={false} />
      <mesh material={mat(color, { rough: 0.95 })}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {lines.map((l, i) => (
        <Text key={i} font={STREET_FONT} fontSize={size} color={ink} anchorX="left" anchorY="top" position={[-w / 2 + 0.1, h / 2 - 0.1 - i * size * 1.35, 0.01]} maxWidth={w - 0.2}>
          {l}
        </Text>
      ))}
      {children}
    </group>
  );
}

export function Label({ at, text, size = 0.14, color = "#121212", font = STREET_FONT, anchorX = "center", rot }: { at: V3; text: string; size?: number; color?: string; font?: string; anchorX?: "left" | "center" | "right"; rot?: V3 }) {
  return (
    <Text font={font} fontSize={size} color={color} anchorX={anchorX} anchorY="middle" position={at} rotation={rot}>
      {text}
    </Text>
  );
}

export function Rug({ at, w, d, color }: { at: V3; w: number; d: number; color: string }) {
  return (
    <mesh position={[at[0], at[1] + 0.012, at[2]]} rotation-x={-Math.PI / 2} material={mat(color, { rough: 1 })} receiveShadow>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

/** a back-wall window showing a soft sky colour */
export function Window({ at, w = 1.2, h = 1.1, frame = "#81D8D0", sky = "#C3E2F6" }: { at: V3; w?: number; h?: number; frame?: string; sky?: string }) {
  return (
    <group position={at}>
      <Box at={[0, 0, 0]} size={[w + 0.16, h + 0.16, 0.05]} color={frame} cast={false} />
      <mesh position={[0, 0, 0.03]} material={mat(sky, { basic: true })}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <Box at={[0, 0, 0.04]} size={[0.04, h, 0.02]} color={frame} cast={false} />
    </group>
  );
}

/** rasterise an SVG (or any image) into a texture, padded on a cream chip */
export function useImageTexture(src: string | undefined, px = 512, pad = 0.12, bg: string | null = "#F6EFE3") {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!alive) return;
      const cv = document.createElement("canvas");
      cv.width = cv.height = px;
      const g = cv.getContext("2d")!;
      if (bg) {
        g.fillStyle = bg;
        g.fillRect(0, 0, px, px);
      }
      const iw = img.naturalWidth || px;
      const ih = img.naturalHeight || px;
      const k = Math.min((px * (1 - pad * 2)) / iw, (px * (1 - pad * 2)) / ih);
      const [x, y, dw, dh] = [(px - iw * k) / 2, (px - ih * k) / 2, iw * k, ih * k];
      // raster logos bring their own background: round its corners on the chip (the image isn't altered)
      if (!/\.svg($|\?)/i.test(src)) {
        g.save();
        g.beginPath();
        g.roundRect(x, y, dw, dh, px * 0.04);
        g.clip();
        g.drawImage(img, x, y, dw, dh);
        g.restore();
      } else g.drawImage(img, x, y, dw, dh);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTex(t);
    };
    img.onerror = () => alive && setTex(null);
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src, px, pad, bg]);
  return tex;
}

/** the small logo plaque on a room's wall (the only place a real logo appears in 3D) */
export function LogoPlaque({ at, src, size = 0.5 }: { at: V3; src?: string; size?: number }) {
  const tex = useImageTexture(src);
  const m = useMemo(() => (tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : mat("#F6EFE3", { basic: true })), [tex]);
  return (
    <group position={at}>
      <RoundedBox args={[size + 0.12, size + 0.12, 0.05]} radius={0.03} position={[0, 0, -0.02]} material={mat("#C9A227", { metal: 0.6, rough: 0.35 })} />
      <mesh position={[0, 0, 0.012]} material={m}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

/** a canvas texture you draw into once (charts, screens, scoreboards) */
export function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const [tex] = useState(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
  return tex;
}

export function screenMat(tex: THREE.Texture) {
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}
