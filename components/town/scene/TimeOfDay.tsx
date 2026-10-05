"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame light/material updates. */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { runtime, useTown } from "../state";
import { BUILDINGS, STREET_LAMPS, placement } from "../world/layout";
import { getMats } from "./materials";
import { getSkyMaterial, SKY } from "./Sky";
import { lightDir, sampleSky } from "./skyKeys";

/** sun disc: whiter at noon, its light colour near the horizon */
const mixWarm = (c: [number, number, number]) => c.map((v) => v + (1 - v) * 0.55) as [number, number, number];
import { getSkylineMaterial } from "./Skyline";

const SUN_DIR = new THREE.Vector3(18, 28, 14).normalize();
const MOON_DIR = new THREE.Vector3(-14, 22, -20).normalize();
const c = (h: string) => new THREE.Color(h);

const PALETTE = {
  sky: {
    top: [c(SKY.night.top), c(SKY.day.top)],
    mid: [c(SKY.night.mid), c(SKY.day.mid)],
    horizon: [c(SKY.night.horizon), c(SKY.day.horizon)],
  },
  sun: [c("#9DB2EA"), c("#FFF2DD")],
  hemiSky: [c("#4A5B92"), c("#CFE6F7")],
  hemiGround: [c("#2A2433"), c("#E4D3B8")],
  cloud: [c("#4C5880"), c("#FFFFFF")],
  river: [c("#14223F"), c("#3C7DAE")],
};

/** Soft radial sprite texture (glows, pools, sun, moon halo). */
function radialTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const g = cv.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The single place lighting reads the clock. `timeOfDay` (store) is the
 * target; the visual hour (`runtime.env.hour`) chases it, and everything
 * (sky gradient, sun / moon arc and colour, fog, shadows, stars, glowing
 * windows, lamps, awnings, the skyline, the river) is sampled from the
 * keyframes in skyKeys.ts for that hour.
 */
export function TimeOfDay({ lowDetail }: { lowDetail: boolean }) {
  const { scene, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const stars = useRef<THREE.Points>(null);
  const moon = useRef<THREE.Group>(null);
  const sunDisc = useRef<THREE.Group>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const m = getMats();

  const tex = useMemo(() => ({ glow: radialTexture(), warm: radialTexture("rgba(255,214,150,1)", "rgba(255,190,110,0)") }), []);

  const starGeo = useMemo(() => {
    const n = lowDetail ? 260 : 650;
    const pos = new Float32Array(n * 3);
    const hash = (k: number) => {
      const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < n; i++) {
      const u = hash(i);
      const v = hash(i + 1000) * 0.92 + 0.08; // keep them off the horizon
      const th = u * Math.PI * 2;
      const ph = Math.acos(v);
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 170;
      pos[i * 3 + 1] = Math.cos(ph) * 170;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 170;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [lowDetail]);

  // warm light pools on the ground: under every street lamp and every awning
  const poolSpots = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = STREET_LAMPS.map((l) => ({
      x: l.x + Math.sin(l.rotY) * 0.86,
      z: l.z + Math.cos(l.rotY) * 0.86,
      s: 3.6,
    }));
    for (const b of BUILDINGS) {
      const p = placement(b);
      const gap = b.kind === "education" ? 2.2 : b.kind === "house" ? 2.4 : 1.2;
      out.push({ x: p.door.x + p.front.x * gap, z: p.door.z + p.front.z * gap, s: 4.2 });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const mesh = pools.current!;
    const o = new THREE.Object3D();
    poolSpots.forEach((s, i) => {
      o.position.set(s.x, 0.03, s.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.scale.setScalar(s.s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [poolSpots]);

  useLayoutEffect(() => {
    scene.fog = new THREE.Fog(SKY.day.horizon, 60, 230);
  }, [scene]);

  const first = useRef(true);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    // the visual clock eases toward the store's time the short way round, so a
    // scrub or the day/night toggle plays as a quick time-lapse
    const env = runtime.env;
    const want = useTown.getState().timeOfDay;
    if (first.current) {
      env.hour = want;
      first.current = false;
    } else {
      let delta = want - env.hour;
      delta -= Math.round(delta / 24) * 24;
      env.hour = Math.abs(delta) < 0.003 ? want : (env.hour + delta * (1 - Math.exp(-dt * 2.4)) + 24) % 24;
    }
    const k = sampleSky(env.hour);
    const n = k.night;
    env.night = n;
    env.dayness = 1 - n;
    const d = env.dayness;

    const sky = getSkyMaterial().uniforms;
    sky.top.value.setRGB(...k.top, THREE.SRGBColorSpace);
    sky.mid.value.setRGB(...k.mid, THREE.SRGBColorSpace);
    sky.horizon.value.setRGB(...k.horizon, THREE.SRGBColorSpace);
    (scene.fog as THREE.Fog | null)?.color.copy(sky.horizon.value);

    // sun by day, moon by night, on their arcs (shadows follow)
    const ld = lightDir(env.hour);
    env.sunDir = ld;
    const s = sun.current!;
    s.color.setRGB(...k.light, THREE.SRGBColorSpace);
    s.intensity = k.intensity;
    s.position.set(ld.x, Math.max(0.14, ld.y), ld.z).normalize().multiplyScalar(40);
    const hl = hemi.current!;
    hl.color.lerpColors(PALETTE.hemiSky[0], PALETTE.hemiSky[1], d).lerp(sky.horizon.value, 0.18);
    hl.groundColor.lerpColors(PALETTE.hemiGround[0], PALETTE.hemiGround[1], d);
    hl.intensity = 0.85 + d * 0.2;

    (stars.current!.material as THREE.PointsMaterial).opacity = n * n;
    stars.current!.visible = n > 0.02;
    const md = ld.day ? lightDir(env.hour + 12) : ld;
    moon.current!.position.set(md.x, Math.max(0.12, md.y), md.z).normalize().multiplyScalar(160);
    moon.current!.visible = n > 0.05;
    moon.current!.scale.setScalar(0.6 + n * 0.4);
    const sd = ld.day ? ld : lightDir(env.hour + 12);
    sunDisc.current!.position.set(sd.x, sd.y, sd.z).normalize().multiplyScalar(160);
    sunDisc.current!.visible = sd.y > -0.08;
    (sunDisc.current!.children[0] as THREE.Sprite).material.color.setRGB(...mixWarm(k.light), THREE.SRGBColorSpace);

    // night glow
    m.glassLit.emissiveIntensity = n * 0.85;
    m.lampGlow.emissiveIntensity = 0.25 + n * 2.4;
    m.awningLight.emissiveIntensity = n * 1.9;
    m.doorway.emissiveIntensity = 0.2 + n * 0.9;
    m.subwayGlobe.emissiveIntensity = 0.35 + n * 1.8;
    m.tailLight.emissiveIntensity = 0.35 + n * 1.7;
    getSkylineMaterial().emissiveIntensity = n * 0.75;
    (pools.current!.material as THREE.MeshBasicMaterial).opacity = n * 0.55;
    pools.current!.visible = n > 0.02;
    m.cloud.color.lerpColors(PALETTE.cloud[0], PALETTE.cloud[1], d);
    m.river.color.lerpColors(PALETTE.river[0], PALETTE.river[1], d);
    gl.toneMappingExposure = 0.92 + d * 0.08;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#CFE6F7", "#E4D3B8", 1.05]} />
      <directionalLight
        ref={sun}
        position={[18, 28, 14]}
        intensity={2.4}
        castShadow={!lowDetail}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-27}
        shadow-camera-right={27}
        shadow-camera-top={27}
        shadow-camera-bottom={-27}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-radius={3}
      />
      <points ref={stars} geometry={starGeo} frustumCulled={false}>
        <pointsMaterial color="#F6EFE3" size={1.7} sizeAttenuation={false} transparent depthWrite={false} fog={false} />
      </points>
      <group ref={moon} position={MOON_DIR.clone().multiplyScalar(160).toArray()}>
        <mesh>
          <sphereGeometry args={[4.2, 20, 14]} />
          <meshBasicMaterial color="#F4EEDF" fog={false} />
        </mesh>
        <sprite scale={[34, 34, 1]}>
          <spriteMaterial map={tex.glow} color="#9FB6F0" transparent opacity={0.35} depthWrite={false} fog={false} />
        </sprite>
      </group>
      <group ref={sunDisc} position={SUN_DIR.clone().multiplyScalar(160).toArray()}>
        <sprite scale={[16, 16, 1]}>
          <spriteMaterial map={tex.glow} color="#FFFBEA" transparent depthWrite={false} fog={false} />
        </sprite>
        <sprite scale={[60, 60, 1]}>
          <spriteMaterial map={tex.glow} color="#FFE7B0" transparent opacity={0.4} depthWrite={false} fog={false} />
        </sprite>
      </group>
      <instancedMesh ref={pools} args={[undefined, undefined, poolSpots.length]} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex.warm} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
