"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { projectsOnFloor, type Project } from "@/data/projects";
import generated from "@/data/project-images.json";
import { useTown } from "../../state";
import { PROJECTS_FLOORS } from "../floors";
import { Tower, type FloorDef, type RoomProps } from "../Tower";
import { Box, Cyl, Plant, mat } from "../kit";
import { BOARD_FONTS, STREET_FONT } from "../../scene/Buildings";

/**
 * Projects Gallery: 5 floors by theme, each a gallery hall with framed
 * screens on the back wall (the featured four are bigger). Click a frame,
 * or pick it from the plaque's list: he walks over, and the plaque shows the
 * image (the generated /public/projects/<slug>.webp if it exists, else the
 * gradient), description, tags and the GitHub link.
 */

const W = 9.6;
const D = 4.6;
const H = 3.2;
const BACK = -D / 2;
const ACCENT = { orange: "#F37021", tiffany: "#81D8D0" } as const;
const IMAGES = generated as Record<string, { blurDataURL?: string }>;

type Slot = { p: Project; x: number; y: number; w: number; h: number };

/** lay this floor's frames out along the back wall, right of the elevator */
function layout(floor: number): Slot[] {
  const list = projectsOnFloor(floor);
  const sizes = list.map((p) => (p.featured ? { w: 1.8, h: 1.12 } : { w: 1.18, h: 0.78 }));
  const gap = 0.36;
  const total = sizes.reduce((a, s) => a + s.w, 0) + gap * (list.length - 1);
  const left = -W / 2 + 2.1;
  const right = W / 2 - 0.45;
  let x = left + (right - left - total) / 2;
  return list.map((p, i) => {
    const s = sizes[i];
    const slot = { p, x: x + s.w / 2, y: p.featured ? 1.72 : 1.6, ...s };
    x += s.w + gap;
    return slot;
  });
}

/** the frame's picture: the generated image if there is one, else an ink + accent gradient with the name */
function useFrameTexture(p: Project) {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 320;
    const g = cv.getContext("2d")!;
    let h = 0;
    for (const ch of p.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const accent = ACCENT[p.accent];
    g.fillStyle = "#151414";
    g.fillRect(0, 0, 512, 320);
    const gx = (30 + (h % 45)) * 5.12;
    const gy = (20 + ((h >> 5) % 50)) * 3.2;
    const rg = g.createRadialGradient(gx, gy, 10, gx, gy, 300);
    rg.addColorStop(0, accent + "cc");
    rg.addColorStop(1, "#15141400");
    g.fillStyle = rg;
    g.fillRect(0, 0, 512, 320);
    g.strokeStyle = accent;
    g.lineWidth = 3;
    g.globalAlpha = 0.7;
    g.beginPath();
    g.moveTo(-10, 300 - ((h >> 9) % 60));
    g.bezierCurveTo(170, 120, 330, 330, 530, 90 + ((h >> 3) % 80));
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = "#F6EFE3";
    g.font = "600 34px system-ui, sans-serif";
    g.fillText(p.name.length > 24 ? p.name.slice(0, 23) + "…" : p.name, 26, 292);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [p]);
  // the generated image, once it exists, is painted over the gradient
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const g = (tex.image as HTMLCanvasElement).getContext("2d")!;
      const k = Math.max(512 / img.naturalWidth, 320 / img.naturalHeight); // cover
      g.drawImage(img, (512 - img.naturalWidth * k) / 2, (320 - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
      tex.needsUpdate = true;
    };
    if (!(p.slug in IMAGES)) return; // not generated yet: keep the gradient
    img.src = p.image;
    return () => {
      alive = false;
    };
  }, [p, tex]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function Frame({ s, active }: { s: Slot; active: boolean }) {
  const tex = useFrameTexture(s.p);
  const picture = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), [tex]);
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
      {/* accent halo when hovered / picked */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[s.w + 0.34, s.h + 0.34]} />
        <meshBasicMaterial ref={glow} color={accent} transparent opacity={0} toneMapped={false} />
      </mesh>
      <Box at={[0, 0, 0]} size={[s.w + 0.16, s.h + 0.16, 0.07]} color="#1b1a19" />
      <mesh
        position={[0, 0, 0.04]}
        material={picture}
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
      </mesh>
      {/* wall label */}
      <group position={[0, -s.h / 2 - 0.3, 0]}>
        <Box at={[0, 0, 0]} size={[Math.min(s.w, 1.3), 0.24, 0.02]} color="#FBF7EF" cast={false} />
        <Text font={STREET_FONT} fontSize={0.085} color="#121212" anchorX="center" anchorY="middle" position={[0, 0.02, 0.015]} maxWidth={Math.min(s.w, 1.3) - 0.08}>
          {s.p.name}
        </Text>
        {s.p.featured && (
          <Text font={STREET_FONT} fontSize={0.055} color={s.p.accent === "orange" ? "#D85E16" : "#2F8F86"} anchorX="center" anchorY="middle" position={[0, -0.07, 0.015]}>
            FEATURED
          </Text>
        )}
      </group>
      {/* a little picture light above */}
      <Box at={[0, s.h / 2 + 0.2, 0.12]} size={[Math.min(0.6, s.w * 0.4), 0.05, 0.12]} color="#C9A227" m={mat("#C9A227", { metal: 0.6, rough: 0.35 })} cast={false} />
    </group>
  );
}

function Hall({ floor, mood }: { floor: number; mood: string }) {
  return function HallRoom({ active }: RoomProps) {
    const slots = layout(floor);
    const beams = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
      beams.current?.children.forEach((b, i) => {
        ((b as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (active ? 0.09 : 0.05) + Math.sin(clock.elapsedTime * 1.3 + i) * 0.01;
      });
    });
    return (
      <group>
        {/* the theme, on the wall by the elevator */}
        <Text font={BOARD_FONTS.projects.url} fontSize={0.34} color="#121212" anchorX="left" anchorY="middle" position={[-W / 2 + 0.35, 2.85, BACK + 0.02]} letterSpacing={0.06}>
          {PROJECTS_FLOORS.find((f) => f.floor === floor)!.label.toUpperCase()}
        </Text>
        <mesh position={[0, 0.25, BACK + 0.012]} material={mat(mood, { rough: 0.9 })}>
          <planeGeometry args={[W, 0.5]} />
        </mesh>
        {slots.map((s) => (
          <Frame key={s.p.slug} s={s} active={active} />
        ))}
        {/* track lights + soft beams onto the frames */}
        <Box at={[0.9, H - 0.08, -1.3]} size={[W - 2.4, 0.05, 0.06]} color="#2B2A2E" cast={false} />
        <group ref={beams}>
          {slots.map((s) => (
            <mesh key={s.p.slug} position={[s.x, H - 0.75, -1.65]} rotation-x={-0.35}>
              <coneGeometry args={[s.w * 0.45, 1.4, 12, 1, true]} />
              <meshBasicMaterial color="#FFF3D6" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          ))}
        </group>
        {/* gallery bench */}
        <group position={[2.7, 0, 1.25]}>
          <Box at={[0, 0.42, 0]} size={[1.6, 0.08, 0.5]} color="#8A6446" />
          {[-0.65, 0.65].map((x) => (
            <Box key={x} at={[x, 0.2, 0]} size={[0.08, 0.4, 0.42]} color="#2B2A2E" cast={false} />
          ))}
        </group>
        <Cyl at={[-W / 2 + 0.5, 0.45, 1.5]} r={0.05} h={0.9} color="#C9A227" />
        <Cyl at={[-W / 2 + 1.7, 0.45, 1.5]} r={0.05} h={0.9} color="#C9A227" />
        <mesh position={[-W / 2 + 1.1, 0.85, 1.5]} rotation-z={Math.PI / 2} material={mat("#B8352E", { rough: 0.6 })}>
          <cylinderGeometry args={[0.025, 0.025, 1.2, 8]} />
        </mesh>
        <Plant at={[W / 2 - 0.5, 0, 1.6]} s={1.1} />
      </group>
    );
  };
}

const floors: FloorDef[] = PROJECTS_FLOORS.map((meta) => {
  const slots = layout(meta.floor);
  return {
    meta,
    wall: "#F7F3EC",
    floor: "#CFC3B1",
    Room: Hall({ floor: meta.floor, mood: meta.mood }),
    spot: { pos: [W / 2 - 1.15, 0, 0.75], yaw: -0.4, pose: "idle" }, // off to the side, clear of the frames
    // beside the frame (to its right), so he doesn't hide it while he presents it
    targets: Object.fromEntries(slots.map((s) => [s.p.slug, { pos: [s.x + s.w / 2 + 0.12, 0, BACK + 1.0], yaw: -Math.PI / 2 - 0.4 }])),
    itemSpeech: (slug) => `project-${slug}`,
  };
});

export function ProjectsInterior() {
  return <Tower building="projects" floors={floors} w={W} d={D} fh={H} outer="brick" />;
}
