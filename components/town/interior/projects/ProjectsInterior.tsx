"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { projects, type Project } from "@/data/projects";
import { useTown } from "../../state";
import { PROJECTS_FLOORS } from "../floors";
import { Tower, type FloorDef, type RoomProps } from "../Tower";
import { Box, Cyl, Plant, mat } from "../kit";
import { BOARD_FONTS } from "../../scene/Buildings";

/**
 * Projects Gallery: one hall with every project, hung salon-style in three
 * rows on the back wall, in the fixed order from data/projects.ts (read left
 * to right, top to bottom; every frame the same size). Each frame is a
 * typographic panel: the name in the gallery's board font with an orange
 * or Tiffany border (no language / tech labels). (If a real /public/projects/<slug>.webp
 * is ever added it's shown instead; otherwise there's no image at all.)
 * Click a frame, or pick it on the plaque: he walks over, the camera moves
 * in, and the plaque shows the details and the GitHub link.
 */

const ROW_W = 11.8; // usable width of a row
const W = ROW_W + 3.0; // + the elevator on the left and a margin
const D = 5.0;
const H = 4.1;
const BACK = -D / 2;
const LEFT = -W / 2 + 2.25;
const ROW_Y = [3.15, 2.08, 1.01];
const FRAME_H = 0.82;
const GAP = 0.26;
const ACCENT = { orange: "#F37021", tiffany: "#81D8D0" } as const;

type Slot = { p: Project; x: number; y: number; w: number; h: number };

/** fill the rows in order (as many as fit), each row centred on the wall */
function layout(): Slot[] {
  const rows: Project[][] = [[], [], []];
  const width = () => 1.18; // all frames equal
  const rowWidth = (r: Project[]) => r.reduce((a) => a + width(), 0) + GAP * Math.max(0, r.length - 1);
  let r = 0;
  for (const p of projects) {
    if (rows[r].length && rowWidth([...rows[r], p]) > ROW_W && r < rows.length - 1) r++;
    rows[r].push(p);
  }
  const out: Slot[] = [];
  rows.forEach((row, ri) => {
    let x = LEFT + (ROW_W - rowWidth(row)) / 2;
    for (const p of row) {
      const w = width();
      out.push({ p, x: x + w / 2, y: ROW_Y[ri], w, h: FRAME_H });
      x += w + GAP;
    }
  });
  return out;
}
const SLOTS = layout();

/** a real image for this project, if one has been added to /public/projects (else null: no image) */
function useOptionalImage(p: Project) {
  const has = useTown((st) => st.projectImages.includes(p.slug));
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!has) return;
    let alive = true;
    new THREE.TextureLoader().load(p.image, (t) => {
      if (!alive) return t.dispose();
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    });
    return () => {
      alive = false;
    };
  }, [has, p.image]);
  return has ? tex : null;
}

function Frame({ s, active }: { s: Slot; active: boolean }) {
  const image = useOptionalImage(s.p);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const [hover, setHover] = useState(false);
  const picked = useTown((st) => st.item === s.p.slug);
  useFrame((_, dt) => {
    const g = glow.current;
    if (g) g.opacity += ((picked ? 0.85 : hover ? 0.5 : 0) - g.opacity) * (1 - Math.exp(-dt * 10));
  });
  const accent = ACCENT[s.p.accent];
  return (
    <group position={[s.x, s.y, BACK + 0.06]}>
      {/* halo when hovered / picked */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[s.w + 0.3, s.h + 0.3]} />
        <meshBasicMaterial ref={glow} color={accent} transparent opacity={0} toneMapped={false} />
      </mesh>
      {/* the accent border, then the panel */}
      <Box at={[0, 0, 0]} size={[s.w + 0.1, s.h + 0.1, 0.06]} color={accent} cast={false} />
      <mesh
        position={[0, 0, 0.035]}
        material={image ? undefined : mat("#1b1a19", { basic: true })}
        userData={{ frame: s.p.slug }}
        onClick={(e) => {
          if (!active) return;
          e.stopPropagation();
          useTown.getState().setItem(s.p.slug);
        }}
        onPointerOver={(e) => {
          if (!active) return;
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[s.w, s.h]} />
        {image && <meshBasicMaterial map={image} toneMapped={false} />}
      </mesh>
      {!image && (
        <>
          <Text
            font={BOARD_FONTS.projects.url}
            fontSize={s.p.name.length > 22 ? 0.13 : s.p.name.length > 14 ? 0.16 : 0.2}
            color="#F6EFE3"
            anchorX="left"
            anchorY="middle"
            position={[-s.w / 2 + 0.1, 0, 0.04]}
            maxWidth={s.w - 0.2}
            letterSpacing={0.03}
            lineHeight={1}
          >
            {s.p.name.toUpperCase()}
          </Text>
        </>
      )}
    </group>
  );
}

function HallRoom({ active }: RoomProps) {
  return (
    <group>
      <Text font={BOARD_FONTS.projects.url} fontSize={0.3} color="#121212" anchorX="left" anchorY="middle" position={[-W / 2 + 0.35, 3.75, BACK + 0.02]} letterSpacing={0.06}>
        PROJECTS GALLERY
      </Text>
      <mesh position={[0, 0.2, BACK + 0.012]} material={mat("#2E5E4E", { rough: 0.9 })}>
        <planeGeometry args={[W, 0.4]} />
      </mesh>
      {SLOTS.map((s) => (
        <Frame key={s.p.slug} s={s} active={active} />
      ))}
      {/* a picture rail and a track of lights over the wall */}
      <Box at={[LEFT + ROW_W / 2, H - 0.12, BACK + 0.6]} size={[ROW_W + 0.4, 0.05, 0.06]} color="#2B2A2E" cast={false} />
      {Array.from({ length: 9 }, (_, i) => (
        <Cyl key={i} at={[LEFT + 0.4 + (i * (ROW_W - 0.8)) / 8, H - 0.24, BACK + 0.6]} r={0.06} r2={0.1} h={0.18} color="#2B2A2E" />
      ))}
      {/* benches down the hall */}
      {[-1.6, 3.4].map((x) => (
        <group key={x} position={[x, 0, 1.45]}>
          <Box at={[0, 0.42, 0]} size={[1.8, 0.08, 0.5]} color="#8A6446" />
          {[-0.75, 0.75].map((dx) => (
            <Box key={dx} at={[dx, 0.2, 0]} size={[0.08, 0.4, 0.42]} color="#2B2A2E" cast={false} />
          ))}
        </group>
      ))}
      <Plant at={[W / 2 - 0.5, 0, 1.9]} s={1.1} />
      <Plant at={[-W / 2 + 2.1, 0, 1.9]} s={0.9} />
    </group>
  );
}

const floors: FloorDef[] = PROJECTS_FLOORS.map((meta) => ({
  meta,
  wall: "#F7F3EC",
  floor: "#CFC3B1",
  Room: HallRoom,
  spot: { pos: [W / 2 - 1.2, 0, 1.0], yaw: -0.4, pose: "idle" }, // off to the side, clear of the frames
  // beside the frame (to its right), so he doesn't hide it while he presents it
  targets: Object.fromEntries(SLOTS.map((s) => [s.p.slug, { pos: [s.x + s.w / 2 + 0.18, 0, BACK + 0.95], yaw: -Math.PI / 2 - 0.4 }])),
  // and the camera moves in on it
  focus: Object.fromEntries(SLOTS.map((s) => [s.p.slug, { x: s.x + 0.2, y: Math.max(s.y, 1.6), w: s.w + 1.4 }])),
  itemSpeech: (slug) => `project-${slug}`,
  cam: () => ({ dy: 0.55 }),
}));

export function ProjectsInterior() {
  return <Tower building="projects" floors={floors} w={W} d={D} fh={H} outer="brick" />;
}
