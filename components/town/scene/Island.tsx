"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CROSSWALKS, ISLAND_RADIUS, MANHOLES, POND, SQUARE_RADIUS, STREET, rad } from "../world/layout";
import { getMats } from "./materials";

const o = new THREE.Object3D();

/** Fill an InstancedMesh from a list of transforms. */
function useMatrices(ref: React.RefObject<THREE.InstancedMesh | null>, list: { p: [number, number, number]; r?: [number, number, number]; s?: [number, number, number] }[]) {
  useLayoutEffect(() => {
    const m = ref.current!;
    list.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(...(it.r ?? [0, 0, 0]));
      o.scale.set(...(it.s ?? [1, 1, 1]));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, list]);
}

/**
 * The block's ground: the fountain square, a one-way street loop with
 * crosswalks, sidewalks, a park lawn with a pond, a waterfront promenade with
 * a railing, the seawall and the river.
 */
export function Island({ lowDetail }: { lowDetail: boolean }) {
  const m = getMats();
  const seg = lowDetail ? 48 : 96;

  // continental crosswalks: bars parallel to traffic, stepping across the street
  const bars = useMemo(() => {
    const out: { p: [number, number, number]; r: [number, number, number]; s: [number, number, number] }[] = [];
    for (const deg of CROSSWALKS) {
      const a = rad(deg);
      for (let k = 0; k < 4; k++) {
        const r = STREET.inner + 0.42 + k * 0.66;
        out.push({ p: [Math.cos(a) * r, 0.018, Math.sin(a) * r], r: [0, -a, 0], s: [0.36, 0.01, 2.4] });
      }
    }
    return out;
  }, []);
  // dashed centre line, skipping crosswalks
  const dashes = useMemo(() => {
    const out: { p: [number, number, number]; r: [number, number, number]; s: [number, number, number] }[] = [];
    const n = 44;
    for (let i = 0; i < n; i++) {
      const deg = (i / n) * 360;
      if (CROSSWALKS.some((c) => Math.abs(((deg - c + 540) % 360) - 180) < 12)) continue;
      const a = rad(deg);
      out.push({ p: [Math.cos(a) * STREET.lane, 0.017, Math.sin(a) * STREET.lane], r: [0, -a, 0], s: [0.09, 0.01, 0.55] });
    }
    return out;
  }, []);
  const railing = useMemo(() => {
    const out: { p: [number, number, number] }[] = [];
    const n = lowDetail ? 70 : 104;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ p: [Math.cos(a) * (ISLAND_RADIUS - 0.45), 0.5, Math.sin(a) * (ISLAND_RADIUS - 0.45)] });
    }
    return out;
  }, [lowDetail]);

  const barsRef = useRef<THREE.InstancedMesh>(null);
  const dashRef = useRef<THREE.InstancedMesh>(null);
  const railRef = useRef<THREE.InstancedMesh>(null);
  useMatrices(barsRef, bars);
  useMatrices(dashRef, dashes);
  useMatrices(railRef, railing);

  const pond = { x: Math.cos(rad(POND.angle)) * POND.radius, z: Math.sin(rad(POND.angle)) * POND.radius };
  const flat = (y: number) => ({ position: [0, y, 0] as [number, number, number], rotation: [-Math.PI / 2, 0, 0] as [number, number, number], receiveShadow: true });

  return (
    <group>
      {/* base slab: sidewalk concrete */}
      <mesh receiveShadow position={[0, -0.3, 0]} material={m.sidewalk}>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS, 0.6, seg]} />
      </mesh>
      {/* lawn: park sector in front + a strip behind the buildings */}
      <mesh {...flat(0.008)} material={m.lawn}>
        {/* ring theta runs the other way once laid flat (z = −sin θ), hence −140° */}
        <ringGeometry args={[11.3, ISLAND_RADIUS - 1.3, seg, 1, rad(-140), rad(100)]} />
      </mesh>
      <mesh {...flat(0.007)} material={m.lawn}>
        <ringGeometry args={[16.6, ISLAND_RADIUS - 1.3, seg]} />
      </mesh>
      {/* the square */}
      <mesh {...flat(0.01)} material={m.paving}>
        <circleGeometry args={[SQUARE_RADIUS, seg]} />
      </mesh>
      <mesh {...flat(0.012)} material={m.tiffany}>
        <ringGeometry args={[4.1, 4.24, seg]} />
      </mesh>
      {/* street + curbs */}
      <mesh {...flat(0.014)} material={m.asphalt}>
        <ringGeometry args={[STREET.inner, STREET.outer, seg]} />
      </mesh>
      {[STREET.inner - 0.18, STREET.outer].map((r) => (
        <mesh key={r} position={[0, 0.05, 0]} material={m.curb} receiveShadow>
          <cylinderGeometry args={[r + 0.18, r + 0.18, 0.1, seg, 1, true]} />
        </mesh>
      ))}
      {[STREET.inner - 0.18, STREET.outer].map((r) => (
        <mesh key={`t${r}`} {...flat(0.1)} material={m.curb}>
          <ringGeometry args={[r, r + 0.18, seg]} />
        </mesh>
      ))}
      <instancedMesh ref={barsRef} args={[undefined, m.paint, bars.length]} receiveShadow>
        <boxGeometry />
      </instancedMesh>
      <instancedMesh ref={dashRef} args={[undefined, m.paint, dashes.length]} receiveShadow>
        <boxGeometry />
      </instancedMesh>
      {/* manholes */}
      {MANHOLES.map((h, i) => (
        <mesh key={i} position={[h.x, 0.02, h.z]} rotation-x={-Math.PI / 2} material={m.iron}>
          <circleGeometry args={[0.42, 20]} />
        </mesh>
      ))}
      {/* pond with a stone rim */}
      <mesh position={[pond.x, 0.12, pond.z]} material={m.stone} receiveShadow>
        <cylinderGeometry args={[POND.r + 0.25, POND.r + 0.3, 0.24, 28]} />
      </mesh>
      <mesh position={[pond.x, 0.245, pond.z]} rotation-x={-Math.PI / 2} material={m.water}>
        <circleGeometry args={[POND.r, 28]} />
      </mesh>
      {/* promenade railing */}
      <instancedMesh ref={railRef} args={[undefined, m.iron, railing.length]} castShadow>
        <boxGeometry args={[0.07, 1.0, 0.07]} />
      </instancedMesh>
      <mesh position={[0, 1.0, 0]} rotation-x={Math.PI / 2} material={m.iron}>
        <torusGeometry args={[ISLAND_RADIUS - 0.45, 0.04, 4, seg]} />
      </mesh>
      {/* seawall + river */}
      <mesh position={[0, -1.0, 0]} material={m.stone}>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS + 0.4, 1.4, seg, 1, true]} />
      </mesh>
      <mesh position={[0, -1.6, 0]} rotation-x={-Math.PI / 2} material={m.river} receiveShadow>
        <circleGeometry args={[320, 64]} />
      </mesh>
    </group>
  );
}
