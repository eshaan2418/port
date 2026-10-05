"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BENCHES, FOUNTAIN_RADIUS, TREES } from "../world/layout";
import { getMats } from "./materials";

const o = new THREE.Object3D();

function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  count: number,
  place: (i: number, obj: THREE.Object3D, color: THREE.Color) => void,
  deps: unknown[],
) {
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      c.set("#ffffff");
      place(i, o, c);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ── trees: trunk + two stacked low-poly canopies, park greens ───────── */
const CANOPY_TONES = ["#6FB37E", "#5DA36F", "#86C08F", "#4F9466", "#7DB98A"];

export function Trees() {
  const m = getMats();
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const tops = useRef<THREE.InstancedMesh>(null);
  const n = TREES.length;

  useInstances(trunks, n, (i, obj) => {
    const t = TREES[i];
    obj.position.set(t.x, 0.75 * t.s, t.z);
    obj.scale.set(t.s, t.s, t.s);
  }, []);
  // canopies right next to the camera fold away so foliage never fills the lens
  const hidden = useRef<boolean[]>(TREES.map(() => false));
  useFrame(({ camera }) => {
    const cm = crowns.current;
    const tm = tops.current;
    if (!cm || !tm) return;
    let dirty = false;
    TREES.forEach((t, i) => {
      const near = Math.hypot(camera.position.x - t.x, camera.position.z - t.z) < 2.6 * t.s && camera.position.y < 4.2 * t.s;
      if (near === hidden.current[i]) return;
      hidden.current[i] = near;
      dirty = true;
      for (const [mesh, y, sx, sy, rx, ry, dx, dz] of [
        [cm, 2.15, 1.25, 1.1, 0, t.rot, 0, 0],
        [tm, 3.0, 0.8, 0.75, 0.3, t.rot * 2, 0.15, -0.1],
      ] as const) {
        o.position.set(t.x + dx * t.s, y * t.s, t.z + dz * t.s);
        o.rotation.set(rx, ry, 0);
        o.scale.set(sx * t.s, sy * t.s, sx * t.s).multiplyScalar(near ? 0.0001 : 1);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      }
    });
    if (dirty) {
      cm.instanceMatrix.needsUpdate = true;
      tm.instanceMatrix.needsUpdate = true;
    }
  });

  useInstances(crowns, n, (i, obj, c) => {
    const t = TREES[i];
    obj.position.set(t.x, 2.15 * t.s, t.z);
    obj.rotation.set(0, t.rot, 0);
    obj.scale.set(1.25 * t.s, 1.1 * t.s, 1.25 * t.s);
    c.set(CANOPY_TONES[Math.floor(t.tone * CANOPY_TONES.length)]);
  }, []);
  useInstances(tops, n, (i, obj, c) => {
    const t = TREES[i];
    obj.position.set(t.x + 0.15 * t.s, 3.0 * t.s, t.z - 0.1 * t.s);
    obj.rotation.set(0.3, t.rot * 2, 0);
    obj.scale.set(0.8 * t.s, 0.75 * t.s, 0.8 * t.s);
    c.set(CANOPY_TONES[(Math.floor(t.tone * CANOPY_TONES.length) + 1) % CANOPY_TONES.length]);
  }, []);

  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, m.trunk, n]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 1.5, 6]} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, m.canopy, n]} castShadow receiveShadow>
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, m.canopy, n]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </>
  );
}

/* ── benches: cream slats on ink frames (one merged geometry each) ───── */
export function Benches() {
  const m = getMats();
  const slats = useRef<THREE.InstancedMesh>(null);
  const frames = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const z of [-0.18, 0, 0.18]) parts.push(new THREE.BoxGeometry(1.8, 0.06, 0.15).translate(0, 0.46, z));
    for (const y of [0.68, 0.86]) parts.push(new THREE.BoxGeometry(1.8, 0.13, 0.05).translate(0, y, -0.3));
    const frame: THREE.BufferGeometry[] = [];
    for (const x of [-0.75, 0.75]) {
      frame.push(new THREE.BoxGeometry(0.07, 0.45, 0.5).translate(x, 0.22, 0));
      frame.push(new THREE.BoxGeometry(0.07, 0.62, 0.06).translate(x, 0.62, -0.3));
    }
    return { slats: mergeGeometries(parts)!, frames: mergeGeometries(frame)! };
  }, []);
  const place = (i: number, obj: THREE.Object3D) => {
    const b = BENCHES[i];
    obj.position.set(b.x, 0, b.z);
    obj.rotation.set(0, b.rotY, 0); // seat faces the fountain, backrest behind
  };
  useInstances(slats, BENCHES.length, place, []);
  useInstances(frames, BENCHES.length, place, []);
  return (
    <>
      <instancedMesh ref={slats} args={[geo.slats, m.cream, BENCHES.length]} castShadow receiveShadow />
      <instancedMesh ref={frames} args={[geo.frames, m.ink, BENCHES.length]} castShadow />
    </>
  );
}

/* ── fountain: two tiers, tiffany water, arcs of instanced droplets ──── */
const DROPS = 48;
export function Fountain({ lowDetail }: { lowDetail: boolean }) {
  const m = getMats();
  const drops = useRef<THREE.InstancedMesh>(null);
  const count = lowDetail ? 24 : DROPS;

  useFrame(({ clock, camera }) => {
    const mesh = drops.current;
    if (!mesh) return;
    // when the camera hangs right over the fountain the spray would fill the
    // lens (big tiffany "gems"), so it hides until the camera moves on
    mesh.visible = Math.hypot(camera.position.x, camera.position.z) > 4.2;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const phase = (t * 0.55 + (i % 4) * 0.25) % 1; // each drop loops along its arc
      const r = 0.25 + phase * 1.35;
      const y = 2.35 + Math.sin(phase * Math.PI) * 0.75 - phase * 1.05;
      o.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      const s = 0.06 * (1 - phase * 0.5);
      o.scale.set(s, s * 1.4, s);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={m.cream} castShadow receiveShadow>
        <cylinderGeometry args={[FOUNTAIN_RADIUS, FOUNTAIN_RADIUS + 0.15, 0.6, 32]} />
      </mesh>
      <mesh position={[0, 0.61, 0]} rotation-x={Math.PI / 2} material={m.tiffany}>
        <torusGeometry args={[FOUNTAIN_RADIUS - 0.08, 0.1, 6, 40]} />
      </mesh>
      <mesh position={[0, 0.52, 0]} rotation-x={-Math.PI / 2} material={m.water}>
        <circleGeometry args={[FOUNTAIN_RADIUS - 0.18, 40]} />
      </mesh>
      <mesh position={[0, 1.1, 0]} material={m.cream} castShadow>
        <cylinderGeometry args={[0.28, 0.4, 1.2, 12]} />
      </mesh>
      <mesh position={[0, 1.75, 0]} material={m.cream} castShadow>
        <cylinderGeometry args={[1.0, 0.55, 0.3, 20]} />
      </mesh>
      <mesh position={[0, 1.91, 0]} rotation-x={-Math.PI / 2} material={m.water}>
        <circleGeometry args={[0.88, 24]} />
      </mesh>
      <mesh position={[0, 2.25, 0]} material={m.orange}>
        <icosahedronGeometry args={[0.16, 1]} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, m.water, count]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </group>
  );
}

/* ── clouds: clusters of puffs drifting slowly around the island ────── */
export function Clouds({ lowDetail }: { lowDetail: boolean }) {
  const m = getMats();
  const ref = useRef<THREE.InstancedMesh>(null);
  const clusters = lowDetail ? 6 : 11;
  const PUFFS = 5;
  const data = useMemo(
    () =>
      Array.from({ length: clusters }, (_, i) => ({
        a: (i / clusters) * Math.PI * 2,
        r: 30 + (i % 3) * 9,
        y: 9 + ((i * 7) % 5) * 2.2 - (i % 4 === 0 ? 16 : 0), // a few drift below the island
        s: 1.6 + (i % 4) * 0.5,
        speed: 0.012 + (i % 5) * 0.004,
      })),
    [clusters],
  );
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    let k = 0;
    for (const c of data) {
      const a = c.a + t * c.speed;
      const cx = Math.cos(a) * c.r;
      const cz = Math.sin(a) * c.r;
      for (let j = 0; j < PUFFS; j++) {
        o.position.set(cx + (j - 2) * c.s * 0.9, c.y + Math.sin(j * 1.7) * 0.4 * c.s, cz + Math.cos(j * 2.3) * 0.5 * c.s);
        const s = c.s * (1 - Math.abs(j - 2) * 0.22);
        o.scale.set(s, s * 0.72, s);
        o.rotation.set(0, a, 0);
        o.updateMatrix();
        mesh.setMatrixAt(k++, o.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, m.cloud, clusters * PUFFS]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
    </instancedMesh>
  );
}
