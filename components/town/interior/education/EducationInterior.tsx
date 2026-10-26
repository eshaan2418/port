"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { runtime } from "../../state";
import { EDUCATION_FLOORS } from "../floors";
import { Tower, type ActorFrame, type FloorDef, type RoomProps } from "../Tower";
import { Box, Cyl, Desk, LogoPlaque, Plant, Rug, Shelf, Window, mat, type V3 } from "../kit";
import { education } from "@/data/education";
import { BOARD_FONTS, STREET_FONT } from "../../scene/Buildings";

/**
 * Education: the York University floor (cap and books) upstairs, and the
 * post office on the ground floor, where contact lives: a counter, P.O.
 * boxes and a mailbox that sends a letter flying when he waves.
 */

const W = 7.6;
const D = 4.4;
const H = 3.0;
const BACK = -D / 2 + 0.03;
const EX = -W / 2 + 0.95;

const roomT = (id: string) => (runtime.room.id === id ? runtime.room.t : 99);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/* ── education: cap and books ─────────────────────────────────────────── */
function Campus() {
  const cap = useRef<THREE.Group>(null);
  const tassel = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cap.current) {
      cap.current.position.y = 1.38 + Math.sin(t * 1.2) * 0.04;
      cap.current.rotation.y = Math.sin(t * 0.5) * 0.25;
    }
    if (tassel.current) tassel.current.rotation.z = Math.sin(t * 2.1) * 0.25;
  });
  const books = ["#3D5A8C", "#F37021", "#81D8D0", "#F6EFE3", "#C99A2E"];
  return (
    <group>
      {/* the York logo plaque by the elevator */}
      <LogoPlaque at={[-W / 2 + 2.15, 2.35, BACK + 0.01]} src={education.logo} />
      {/* banner */}
      <group position={[0.7, 2.5, BACK]}>
        <Box at={[0, 0, 0]} size={[3.3, 0.5, 0.03]} color="#3D5A8C" cast={false} />
        <Text font={BOARD_FONTS.education.url} fontSize={0.2} color="#F6EFE3" anchorX="center" anchorY="middle" position={[0, 0.02, 0.02]} letterSpacing={0.04}>
          YORK UNIVERSITY
        </Text>
      </group>
      <Text font={STREET_FONT} fontSize={0.12} color="#3D5A8C" anchorX="center" anchorY="middle" position={[0.7, 2.12, BACK + 0.01]}>
        Lassonde School of Engineering
      </Text>
      {/* the programme, on a pinned card (not a diploma) */}
      <group position={[-1.3, 1.45, BACK]}>
        <Box at={[0, 0, 0]} size={[1.25, 0.9, 0.04]} color="#B98D62" cast={false} />
        <mesh position={[0, 0, 0.025]} rotation-z={-0.03} material={mat("#FBF4E2", { rough: 1 })}>
          <planeGeometry args={[1.0, 0.62]} />
        </mesh>
        <Text font={BOARD_FONTS.education.url} fontSize={0.075} color="#3D5A8C" anchorX="center" anchorY="middle" position={[0, 0.2, 0.03]}>
          B.Sc (Hons)
        </Text>
        <Text font={STREET_FONT} fontSize={0.085} color="#121212" anchorX="center" anchorY="middle" position={[0, 0.06, 0.03]}>
          Computer Science
        </Text>
        <mesh position={[0, 0.3, 0.04]} material={mat("#F37021")}>
          <sphereGeometry args={[0.03, 8, 6]} />
        </mesh>
      </group>
      {/* honours plaques */}
      {[
        ["Tentanda Via Scholar", "($120,000)"],
        ["Dean's Honor Roll", ""],
      ].map(([a, b], i) => (
        <group key={a} position={[0.1 + i * 1.3, 1.45, BACK]}>
          <Box at={[0, 0, 0]} size={[1.15, 0.6, 0.04]} color="#C99A2E" m={mat("#C99A2E", { metal: 0.6, rough: 0.35 })} cast={false} />
          <Text font={STREET_FONT} fontSize={0.09} color="#1E1B18" anchorX="center" anchorY="middle" position={[0, b ? 0.07 : 0, 0.03]} maxWidth={1.0}>
            {a}
          </Text>
          {b && (
            <Text font={STREET_FONT} fontSize={0.08} color="#1E1B18" anchorX="center" anchorY="middle" position={[0, -0.1, 0.03]}>
              {b}
            </Text>
          )}
        </group>
      ))}
      {/* a tall stack of books, the cap on top */}
      <group position={[2.75, 0, 0.75]}>
        {books.map((c, i) => (
          <Box key={i} at={[Math.sin(i * 1.7) * 0.05, 0.12 + i * 0.22, 0]} size={[0.95 - i * 0.04, 0.2, 0.65 - i * 0.02]} rot={[0, i * 0.18 - 0.3, 0]} color={c} />
        ))}
        <group ref={cap} position={[0, 1.38, 0]}>
          <Box at={[0, 0, 0]} size={[0.62, 0.035, 0.62]} rot={[0, 0.6, 0]} color="#121212" />
          <Cyl at={[0, -0.08, 0]} r={0.2} r2={0.22} h={0.14} color="#121212" />
          <group ref={tassel} position={[0.22, 0.02, 0.22]}>
            <Box at={[0, -0.12, 0]} size={[0.015, 0.24, 0.015]} color="#F37021" cast={false} />
            <Cyl at={[0, -0.26, 0]} r={0.035} h={0.07} color="#F37021" />
          </group>
        </group>
      </group>
      <Shelf
        at={[W / 2 - 0.45, 0, -0.4]}
        w={1.3}
        h={2.0}
        d={0.4}
        yaw={-Math.PI / 2}
        rows={4}
        color="#5A3B2B"
        fill={(r) => (
          <>
            {Array.from({ length: 6 }, (_, k) => (
              <Box key={k} at={[-0.5 + k * 0.2, 0.15, 0]} size={[0.12, 0.28 - (k % 3) * 0.04, 0.26]} color={books[(r + k) % books.length]} cast={false} />
            ))}
          </>
        )}
      />
      <Desk at={[-1.0, 0, 0.75]} w={1.4} d={0.7} color="#5A3B2B" />
      <Box at={[-1.2, 0.82, 0.75]} size={[0.5, 0.06, 0.36]} color="#F6EFE3" rot={[0, 0.2, 0]} />
      <Box at={[-0.75, 0.8, 0.7]} size={[0.32, 0.03, 0.24]} color="#3D5A8C" rot={[0, -0.3, 0]} />
      <Rug at={[0.7, 0, 0.5]} w={3.2} d={1.8} color="#C6CFE3" />
      <Window at={[-2.35, 2.35, BACK]} w={0.6} h={0.5} frame="#3D5A8C" />
    </group>
  );
}

/* ── contact: the post office ─────────────────────────────────────────── */
const BOX_AT: V3 = [2.25, 0, -0.9]; // the mailbox
const STAND: V3 = [1.3, 0, 0.1];
const PATH: V3[] = [
  [EX, 0, -D / 2 - 0.35],
  [EX, 0, -D / 2 + 0.9],
  STAND,
];
const pathLen = PATH.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - PATH[i][0], p[2] - PATH[i][2]), 0);
const ARRIVE = 0.45 + pathLen / 1.9;
const WAVE = ARRIVE + 0.3;
const LETTER = WAVE + 0.45;

function contactScript(t: number): ActorFrame {
  if (t < 0.45) return { pos: PATH[0], yaw: 0, pose: "idle" };
  if (t < ARRIVE) {
    let left = (t - 0.45) * 1.9;
    for (let i = 1; i < PATH.length; i++) {
      const a = PATH[i - 1];
      const b = PATH[i];
      const seg = Math.hypot(b[0] - a[0], b[2] - a[2]);
      if (left <= seg) {
        const k = left / seg;
        return { pos: [a[0] + (b[0] - a[0]) * k, 0, a[2] + (b[2] - a[2]) * k], yaw: Math.atan2(b[0] - a[0], b[2] - a[2]), pose: "walk" };
      }
      left -= seg;
    }
  }
  if (t < WAVE + 1.4) return { pos: STAND, yaw: 0, pose: "wave" };
  return { pos: STAND, yaw: 0, pose: "idle", speak: true, faceCamera: true };
}

function PostOffice({ active }: RoomProps) {
  const id = "contact";
  const letter = useRef<THREE.Group>(null);
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = roomT(id);
    const l = letter.current;
    if (l) {
      // out of the slot, up and over toward you, with a little flutter
      const k = clamp01((t - LETTER) / 1.6);
      l.visible = active && k > 0 && k < 1;
      const x = BOX_AT[0] - k * 1.2;
      const y = 1.05 + Math.sin(k * Math.PI) * 1.0 + k * 0.5;
      const z = BOX_AT[2] + 0.3 + k * 2.6;
      l.position.set(x, y, z);
      l.rotation.set(Math.sin(clock.elapsedTime * 9) * 0.25, k * 1.2, Math.sin(clock.elapsedTime * 7) * 0.3);
      l.scale.setScalar(k < 0.15 ? k / 0.15 : 1);
    }
    // the mailbox flag pops up as the letter goes
    if (flag.current) flag.current.rotation.z = t > LETTER - 0.1 && t < LETTER + 2.2 ? -0.05 : -Math.PI / 2;
  });
  return (
    <group>
      <Text font={BOARD_FONTS.home.url} fontSize={0.3} color="#121212" anchorX="center" anchorY="middle" position={[0.6, 2.55, BACK + 0.01]}>
        let&apos;s work together.
      </Text>
      {/* P.O. boxes */}
      <group position={[-0.5, 1.45, BACK + 0.02]}>
        <Box at={[0, 0, 0]} size={[1.8, 1.2, 0.06]} color="#8A6446" cast={false} />
        {Array.from({ length: 24 }, (_, i) => (
          <group key={i} position={[-0.75 + (i % 6) * 0.3, 0.45 - Math.floor(i / 6) * 0.3, 0.04]}>
            <Box at={[0, 0, 0]} size={[0.25, 0.24, 0.02]} color="#C99A2E" m={mat("#C99A2E", { metal: 0.6, rough: 0.4 })} cast={false} />
            <mesh position={[0, 0.03, 0.012]} material={mat("#3a2a22")}>
              <planeGeometry args={[0.14, 0.08]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* counter with a bell and a stack of envelopes */}
      <group position={[-0.2, 0, 0.6]}>
        <Box at={[0, 0.5, 0]} size={[2.2, 1.0, 0.6]} color="#E9A26B" />
        <Box at={[0, 1.02, 0]} size={[2.3, 0.05, 0.7]} color="#5A3B2B" />
        <mesh position={[-0.6, 1.1, 0]} material={mat("#C99A2E", { metal: 0.8, rough: 0.25 })}>
          <sphereGeometry args={[0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <Box key={i} at={[0.5, 1.07 + i * 0.02, 0]} size={[0.36, 0.015, 0.24]} rot={[0, i * 0.15, 0]} color="#FBF4E2" cast={false} />
        ))}
        <Text font={STREET_FONT} fontSize={0.12} color="#121212" anchorX="center" anchorY="middle" position={[0, 0.7, 0.31]}>
          CONTACT
        </Text>
      </group>
      {/* the mailbox */}
      <group position={BOX_AT}>
        <Box at={[0, 0.55, 0]} size={[0.55, 1.1, 0.5]} color="#4FA9A0" />
        <mesh position={[0, 1.1, 0]} rotation-z={Math.PI / 2} material={mat("#4FA9A0")}>
          <cylinderGeometry args={[0.25, 0.25, 0.55, 16, 1, false, 0, Math.PI]} />
        </mesh>
        <Box at={[0, 0.92, 0.26]} size={[0.32, 0.05, 0.02]} color="#121212" cast={false} />
        <mesh ref={flag} position={[0.3, 1.0, 0.1]} rotation-z={-Math.PI / 2} material={mat("#F37021")}>
          <boxGeometry args={[0.03, 0.3, 0.12]} />
        </mesh>
        <Box at={[0, 0.03, 0]} size={[0.6, 0.06, 0.55]} color="#121212" />
      </group>
      {/* the letter */}
      <group ref={letter} visible={false}>
        <Box at={[0, 0, 0]} size={[0.32, 0.2, 0.015]} color="#FBF4E2" cast={false} />
        <mesh position={[0, 0.03, 0.009]} rotation-z={Math.PI} material={mat("#F37021")}>
          <circleGeometry args={[0.12, 3]} />
        </mesh>
      </group>
      <Plant at={[W / 2 - 0.5, 0, 1.4]} s={1.1} />
      <Rug at={[1.0, 0, 0.9]} w={2.6} d={1.4} color="#F6D6B8" />
    </group>
  );
}

const DEFS: Record<string, Omit<FloorDef, "meta">> = {
  education: { wall: "#E9EDF5", floor: "#8A6446", Room: Campus, spot: { pos: [2.0, 0, 0.8], yaw: 0.5, pose: "idle" } },
  contact: { wall: "#FBF1E4", floor: "#B8865B", Room: PostOffice, spot: { pos: STAND, yaw: 0, pose: "idle" }, script: contactScript },
};
const floors: FloorDef[] = EDUCATION_FLOORS.map((meta) => ({ meta, ...DEFS[meta.id] }));

export function EducationInterior() {
  return <Tower building="education" floors={floors} w={W} d={D} fh={H} outer="limestone" />;
}
