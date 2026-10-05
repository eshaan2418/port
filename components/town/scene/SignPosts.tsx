"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SIGN_POSTS, type SignPost } from "../world/layout";
import { getMats } from "./materials";
import { SignBoard, signWidth } from "./Buildings";

const READABLE_AT = 12; // beyond this distance a board grows to stay legible
const MAX_SCALE = 1.7;
const SECTOR = { full: 1.15, gone: 1.5 }; // rad from the side's normal: fully shown → hidden

/**
 * Every building sign is a billboard: one over each door (on a bracket that
 * stands it off the wall) and one on a post beside every other walkable side.
 *
 *  - turns toward the camera around Y only, but never further from its side's
 *    normal than the wall gap allows (half-width · sin θ < gap), so it can't
 *    swing into the facade
 *  - grows with distance so it stays readable at the default zoom and beyond
 *  - only shows while the camera is on its side of the building, so you see
 *    one sign per building from any angle instead of a cluster
 */
export function SignPosts() {
  return (
    <>
      {SIGN_POSTS.map((s, i) => (
        <Sign key={i} s={s} />
      ))}
    </>
  );
}

function Sign({ s }: { s: SignPost }) {
  const m = getMats();
  const root = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const half = useRef(signWidth(s.text, s.size) / 2); // refined once the font is measured

  useFrame(({ camera }) => {
    const g = board.current!;
    const dx = camera.position.x - s.x;
    const dz = camera.position.z - s.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    const rel = Math.atan2(Math.sin(want - s.normalYaw), Math.cos(want - s.normalYaw));

    // which side of the building is the camera on?
    const show = 1 - THREE.MathUtils.smoothstep(Math.abs(rel), SECTOR.full, SECTOR.gone);
    root.current!.visible = show > 0.02;
    const scale = THREE.MathUtils.clamp(dist / READABLE_AT, 1, MAX_SCALE) * (0.35 + 0.65 * show);
    const maxTurn = Math.asin(THREE.MathUtils.clamp((s.wallGap - 0.2) / (half.current * scale), 0, 1));
    g.rotation.y = s.normalYaw + THREE.MathUtils.clamp(rel, -maxTurn, maxTurn);
    g.scale.setScalar(scale);
  });

  return (
    <group ref={root} position={[s.x, 0, s.z]}>
      {s.mount === "post" ? (
        <>
          <mesh position={[0, 1.3, 0]} material={m.ink} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 2.6, 8]} />
          </mesh>
          <mesh position={[0, 0.08, 0]} material={m.ink}>
            <cylinderGeometry args={[0.16, 0.2, 0.16, 10]} />
          </mesh>
        </>
      ) : (
        // bracket back to the wall
        <mesh position={[-Math.sin(s.normalYaw) * s.wallGap * 0.5, s.y + 0.45, -Math.cos(s.normalYaw) * s.wallGap * 0.5]} rotation-y={s.normalYaw} material={m.iron}>
          <boxGeometry args={[0.05, 0.05, Math.max(0.05, s.wallGap)]} />
        </mesh>
      )}
      <group ref={board} position={[0, s.y, 0]}>
        <SignBoard text={s.text} building={s.building} size={s.size} doubleSided={s.mount === "post"} onWidth={(w) => (half.current = w / 2)} />
      </group>
    </group>
  );
}
