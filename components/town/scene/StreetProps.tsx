"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame instance updates. */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CART, HYDRANTS, MANHOLES, NEWS_BOXES, STREET_LAMPS, STREET_SIGNS, SUBWAY, TRAFFIC_LIGHTS, type Spot } from "../world/layout";
import { runtime } from "../state";
import { signalRed } from "../world/signals";
import { getMats } from "./materials";
import { BOARD_FONTS, STREET_FONT } from "./Buildings";

const o = new THREE.Object3D();

function useSpots(ref: React.RefObject<THREE.InstancedMesh | null>, spots: Spot[], colors?: string[]) {
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      o.position.set(s.x, 0, s.z);
      o.rotation.set(0, s.rotY, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (colors) mesh.setColorAt(i, c.set(colors[i % colors.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, spots, colors]);
}

/** Merge a few primitives into one geometry so each prop is a single instanced draw. */
function merged(parts: THREE.BufferGeometry[]) {
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
}

/* ── street lamps: ink pole, curved arm, warm lantern ─────────────────── */
function StreetLamps() {
  const m = getMats();
  const pole = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => ({
      // the arm reaches toward the street (+z)
      pole: merged([
        new THREE.CylinderGeometry(0.06, 0.09, 3.6, 8).translate(0, 1.8, 0),
        new THREE.CylinderGeometry(0.17, 0.22, 0.3, 8).translate(0, 0.15, 0),
        new THREE.BoxGeometry(0.06, 0.06, 0.9).translate(0, 3.55, 0.42),
        new THREE.ConeGeometry(0.26, 0.2, 8).translate(0, 3.55, 0.86),
      ]),
      head: new THREE.SphereGeometry(0.17, 10, 8).translate(0, 3.38, 0.86),
    }),
    [],
  );
  useSpots(pole, STREET_LAMPS);
  useSpots(head, STREET_LAMPS);
  return (
    <>
      <instancedMesh ref={pole} args={[geo.pole, m.iron, STREET_LAMPS.length]} castShadow />
      <instancedMesh ref={head} args={[geo.head, m.lampGlow, STREET_LAMPS.length]} />
    </>
  );
}

/* ── traffic signals: they cycle, a little out of phase with each other ── */
function TrafficLights() {
  const m = getMats();
  const pole = useRef<THREE.InstancedMesh>(null);
  const red = useRef<THREE.InstancedMesh>(null);
  const green = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => ({
      pole: merged([
        new THREE.CylinderGeometry(0.06, 0.08, 3.0, 8).translate(0, 1.5, 0),
        new THREE.BoxGeometry(0.34, 0.9, 0.28).translate(0, 3.0, 0.1),
        new THREE.BoxGeometry(0.42, 0.06, 0.32).translate(0, 3.47, 0.1),
      ]),
      lamp: new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12).rotateX(Math.PI / 2),
    }),
    [],
  );
  useSpots(pole, TRAFFIC_LIGHTS);
  useLayoutEffect(() => {
    for (const [ref, y] of [
      [red, 3.25],
      [green, 2.75],
    ] as const) {
      const mesh = ref.current!;
      TRAFFIC_LIGHTS.forEach((s, i) => {
        o.position.set(s.x, y, s.z);
        o.rotation.set(0, s.rotY, 0);
        o.translateZ(0.25);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, []);
  useFrame(({ clock }) => {
    // all signals share one red / one green material
    const red = signalRed(clock.elapsedTime); // shared with the vehicles
    const on = 0.7 + (1 - runtime.env.dayness) * 1.1; // brighter after dark
    m.signalRed.emissiveIntensity = red ? on : 0.05;
    m.signalGreen.emissiveIntensity = red ? 0.05 : on;
  });
  return (
    <>
      <instancedMesh ref={pole} args={[geo.pole, m.iron, TRAFFIC_LIGHTS.length]} castShadow />
      <instancedMesh ref={red} args={[geo.lamp, m.signalRed, TRAFFIC_LIGHTS.length]} />
      <instancedMesh ref={green} args={[geo.lamp, m.signalGreen, TRAFFIC_LIGHTS.length]} />
    </>
  );
}

/* ── hydrants + newspaper boxes ────────────────────────────────────────── */
function Hydrants() {
  const m = getMats();
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () =>
      merged([
        new THREE.CylinderGeometry(0.15, 0.17, 0.6, 10).translate(0, 0.3, 0),
        new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.6, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8).rotateZ(Math.PI / 2).translate(0, 0.42, 0),
        new THREE.CylinderGeometry(0.21, 0.21, 0.06, 10).translate(0, 0.05, 0),
      ]),
    [],
  );
  useSpots(ref, HYDRANTS);
  return <instancedMesh ref={ref} args={[geo, m.hydrant, HYDRANTS.length]} castShadow />;
}

const BOX_COLORS = ["#81D8D0", "#F37021", "#2B2827", "#F6EFE3", "#4FA9A0"];
function NewsBoxes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () =>
      merged([
        new THREE.BoxGeometry(0.5, 0.75, 0.42).translate(0, 0.62, 0),
        new THREE.BoxGeometry(0.06, 0.25, 0.06).translate(-0.18, 0.12, 0),
        new THREE.BoxGeometry(0.06, 0.25, 0.06).translate(0.18, 0.12, 0),
        new THREE.BoxGeometry(0.4, 0.22, 0.04).translate(0, 0.72, 0.22),
      ]),
    [],
  );
  useSpots(ref, NEWS_BOXES, BOX_COLORS);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, NEWS_BOXES.length]} castShadow>
      <meshStandardMaterial flatShading roughness={0.6} />
    </instancedMesh>
  );
}

/* ── street signs: green blades with palette street names ─────────────── */
function StreetSigns() {
  const m = getMats();
  return (
    <>
      {STREET_SIGNS.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation-y={s.rotY + Math.PI / 2}>
          <mesh position={[0, 1.6, 0]} material={m.iron} castShadow>
            <cylinderGeometry args={[0.045, 0.05, 3.2, 6]} />
          </mesh>
          <group position={[0, 3.0, 0]}>
            <mesh material={m.streetGreen}>
              <boxGeometry args={[1.5, 0.3, 0.04]} />
            </mesh>
            {[0, Math.PI].map((ry) => (
              <Text key={ry} rotation-y={ry} position={[0, 0, 0.025 * (ry ? -1 : 1)]} font={STREET_FONT} fontSize={0.19} color="#F6EFE3" anchorX="center" anchorY="middle" letterSpacing={0.04}>
                {s.name.toUpperCase()}
              </Text>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}

/* ── pretzel cart with a striped umbrella ─────────────────────────────── */
function Cart() {
  const m = getMats();
  const umbrella = useMemo(() => {
    // non-indexed so each panel gets one flat colour: crisp orange / cream stripes
    const g = new THREE.ConeGeometry(1.15, 0.45, 12, 1, true).toNonIndexed();
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let tri = 0; tri < pos.count / 3; tri++) {
      let cx = 0;
      let cz = 0;
      for (let k = 0; k < 3; k++) {
        cx += pos.getX(tri * 3 + k);
        cz += pos.getZ(tri * 3 + k);
      }
      const panel = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 12) % 12;
      c.set(panel % 2 ? "#F37021" : "#F6EFE3");
      for (let k = 0; k < 3; k++) c.toArray(colors, (tri * 3 + k) * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={[CART.x, 0, CART.z]} rotation-y={CART.rotY}>
      <mesh position={[0, 0.75, 0]} material={m.chrome} castShadow>
        <boxGeometry args={[1.6, 0.7, 0.85]} />
      </mesh>
      <mesh position={[0, 0.78, 0.43]} material={m.tiffany}>
        <boxGeometry args={[1.5, 0.4, 0.02]} />
      </mesh>
      <mesh position={[0, 1.13, 0]} material={m.creamShade}>
        <boxGeometry args={[1.7, 0.06, 0.95]} />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.25, 0.44]} rotation-x={Math.PI / 2} material={m.ink}>
          <torusGeometry args={[0.22, 0.05, 6, 14]} />
        </mesh>
      ))}
      <mesh position={[0.6, 1.9, 0]} material={m.iron}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
      </mesh>
      <mesh position={[0.6, 2.75, 0]} geometry={umbrella} castShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* a little stack of pretzels */}
      {[-0.4, 0, 0.4].map((x) => (
        <mesh key={x} position={[x, 1.22, 0]} rotation-x={Math.PI / 2} material={m.wood}>
          <torusGeometry args={[0.1, 0.04, 6, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── subway entrance: railings, two green globes, stairs down into the dark ── */
function Subway() {
  const m = getMats();
  return (
    <group position={[SUBWAY.x, 0, SUBWAY.z]} rotation-y={SUBWAY.rotY}>
      {/* the opening + steps (drawn as a sunken dark well) */}
      <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2} material={m.ink}>
        <planeGeometry args={[2.1, 3.1]} />
      </mesh>
      {Array.from({ length: 7 }, (_, k) => (
        <mesh key={k} position={[0, 0.02, 1.3 - k * 0.4]} rotation-x={-Math.PI / 2} material={k % 2 ? m.asphalt : m.curb}>
          <planeGeometry args={[1.7, 0.12 + k * 0.01]} />
        </mesh>
      ))}
      {/* low walls + rails on three sides (open toward the square) */}
      {[
        [-1.15, 0, 0.12, 3.3],
        [1.15, 0, 0.12, 3.3],
        [0, -1.6, 2.4, 0.12],
      ].map(([x, z, w, d], i) => (
        <group key={i}>
          <mesh position={[x, 0.35, z]} material={m.creamShade} castShadow>
            <boxGeometry args={[w, 0.7, d]} />
          </mesh>
          <mesh position={[x, 1.05, z]} material={m.iron}>
            <boxGeometry args={[w === 0.12 ? 0.06 : w, 0.06, d === 0.12 ? 0.06 : d]} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={`p${k}`} position={[k < 3 ? -1.15 : 1.15, 0.85, -1.5 + (k % 3) * 1.5]} material={m.iron}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
        </mesh>
      ))}
      {[-1.15, 1.15].map((x) => (
        <group key={x} position={[x, 0, 1.65]}>
          <mesh position={[0, 1.2, 0]} material={m.streetGreen} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
          </mesh>
          <mesh position={[0, 2.5, 0]} material={m.subwayGlobe}>
            <sphereGeometry args={[0.2, 12, 10]} />
          </mesh>
        </group>
      ))}
      <group position={[0, 1.55, -1.62]}>
        <mesh material={m.streetGreen}>
          <boxGeometry args={[1.4, 0.34, 0.05]} />
        </mesh>
        <Text font={BOARD_FONTS.home.url} fontSize={0.2} color="#F6EFE3" anchorX="center" anchorY="middle" position={[0, -0.01, 0.03]} rotation-y={0}>
          subway
        </Text>
      </group>
    </group>
  );
}

/* ── steam rising from the manholes ───────────────────────────────────── */
function Steam({ lowDetail }: { lowDetail: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const per = lowDetail ? 6 : 10;
  const count = per * MANHOLES.length;
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    let k = 0;
    for (const h of MANHOLES) {
      for (let i = 0; i < per; i++) {
        const life = (t * 0.35 + i / per) % 1; // each puff rises, swells and thins out
        o.position.set(h.x + Math.sin(i * 2.3 + t * 0.6) * 0.25 * life, 0.2 + life * 2.6, h.z + Math.cos(i * 1.7 + t * 0.5) * 0.25 * life);
        o.scale.setScalar(0.25 + life * 0.7);
        o.rotation.set(0, i, 0);
        o.updateMatrix();
        mesh.setMatrixAt(k++, o.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#F4F1EC" transparent opacity={0.28} depthWrite={false} roughness={1} />
    </instancedMesh>
  );
}

export function StreetProps({ lowDetail }: { lowDetail: boolean }) {
  return (
    <>
      <StreetLamps />
      <TrafficLights />
      <Hydrants />
      <NewsBoxes />
      <StreetSigns />
      <Cart />
      <Subway />
      <Steam lowDetail={lowDetail} />
    </>
  );
}
