"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame updates. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { EXPERIENCE_FLOORS } from "../floors";
import { Tower, type FloorDef, type RoomProps } from "../Tower";
import { Board, Box, Chair, Cyl, Desk, LogoPlaque, Monitor, Plant, Rug, Shelf, Window, mat, screenMat, useCanvasTexture } from "../kit";
import { BOARD_FONTS } from "../../scene/Buildings";

/**
 * Experience Tower: one small themed room per role, in the order of
 * data/experiences.ts (Cohere at the top down to AIESEC). The only real
 * logos are the small brass plaques by the elevator (from /public/logos/).
 */

const W = 7.2;
const D = 4.4;
const H = 3.0;
const BACK = -D / 2 + 0.04;
const PLAQUE_AT: [number, number, number] = [-W / 2 + 2.15, 1.75, BACK];

const logoOf = (id: string) => EXPERIENCE_FLOORS.find((f) => f.id === id)!.logo;

/* ── 01 cohere: a modern AI lab, still being set up ───────────────────── */
function Cohere({ active }: RoomProps) {
  const orb = useRef<THREE.Mesh>(null);
  const screen = useCanvasTexture(512, 320, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#3B3F8F");
    gr.addColorStop(1, "#81D8D0");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(246,239,227,0.92)";
    g.font = "600 54px system-ui, sans-serif";
    g.textAlign = "center";
    g.fillText("coming soon", w / 2, h / 2 + 18);
  });
  const sm = useMemo(() => screenMat(screen), [screen]);
  useFrame(({ clock }) => {
    const o = orb.current;
    if (!o) return;
    const t = clock.elapsedTime;
    o.position.y = 1.35 + Math.sin(t * 1.4) * 0.06;
    o.rotation.y = t * 0.6;
    (o.material as THREE.MeshStandardMaterial).emissiveIntensity = active ? 0.9 + Math.sin(t * 2.2) * 0.35 : 0.6;
  });
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("cohere")} />
      <Rug at={[0.9, 0, 0.2]} w={3.6} d={2.2} color="#C9C4EA" />
      <Desk at={[1.6, 0, -1.45]} w={2.0} color="#F6EFE3" legs="#C7CBCF" />
      <Monitor at={[1.6, 0.78, -1.6]} w={1.0} h={0.6} screen={sm} />
      <Chair at={[1.6, 0, -0.8]} yaw={Math.PI} color="#ECEAF6" />
      {/* a glowing orb on a plinth: the lab's centrepiece */}
      <Cyl at={[-0.3, 0.45, -0.9]} r={0.32} r2={0.4} h={0.9} color="#ECEAF6" />
      <mesh ref={orb} position={[-0.3, 1.35, -0.9]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color="#B9B3F2" emissive="#8F86FF" emissiveIntensity={0.8} flatShading roughness={0.3} />
      </mesh>
      {/* still moving in: taped boxes */}
      {[
        [3.05, 0.25, -0.2, 0.5],
        [3.1, 0.72, -0.18, 0.42],
        [3.05, 0.22, 0.55, 0.44],
      ].map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} rotation-y={i * 0.4}>
          <Box at={[0, 0, 0]} size={[s, s, s]} color="#C99A6B" />
          <Box at={[0, s / 2 + 0.002, 0]} size={[s * 0.18, 0.004, s]} color="#E8D9B5" cast={false} />
        </group>
      ))}
      {/* easel sign */}
      <group position={[2.1, 0, 1.45]} rotation-y={-0.35}>
        <Box at={[0, 0.6, 0]} size={[0.05, 1.2, 0.05]} color="#2B2A2E" />
        <Box at={[0, 1.15, 0.03]} size={[0.8, 0.5, 0.03]} color="#121212" />
        <Text font={BOARD_FONTS.experience.url} fontSize={0.11} color="#F6EFE3" anchorX="center" anchorY="middle" position={[0, 1.15, 0.05]}>
          coming soon
        </Text>
      </group>
      <Plant at={[3.2, 0, -1.7]} />
    </group>
  );
}

/* ── 02 wealthsimple: a clean fintech office ──────────────────────────── */
function Wealthsimple() {
  const chart = useCanvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = "#FBF8F2";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#E3DDD0";
    g.lineWidth = 2;
    for (let y = 60; y < h; y += 60) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(w - 24, y);
      g.stroke();
    }
    g.strokeStyle = "#121212";
    g.lineWidth = 6;
    g.beginPath();
    const pts = [0.08, 0.22, 0.18, 0.35, 0.33, 0.5, 0.46, 0.62, 0.7, 0.82];
    pts.forEach((v, i) => {
      const x = 30 + (i / (pts.length - 1)) * (w - 60);
      const y = h - 30 - v * (h - 70);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  });
  const cm = useMemo(() => screenMat(chart), [chart]);
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("wealthsimple")} />
      <Rug at={[1.0, 0, 0.2]} w={3.4} d={2.0} color="#E7E1D4" />
      <Desk at={[1.7, 0, -1.4]} w={1.8} color="#FBF8F2" legs="#121212" />
      <Monitor at={[1.7, 0.78, -1.55]} w={0.95} h={0.58} screen={cm} />
      <Chair at={[1.7, 0, -0.8]} yaw={Math.PI} color="#121212" />
      {/* framed chart on the wall */}
      <group position={[-0.2, 1.75, BACK]}>
        <Box at={[0, 0, -0.01]} size={[1.25, 0.85, 0.04]} color="#121212" cast={false} />
        <mesh position={[0, 0, 0.012]} material={cm}>
          <planeGeometry args={[1.12, 0.72]} />
        </mesh>
      </group>
      {/* a little stack of coins */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Cyl key={i} at={[0.95, 0.8 + i * 0.035, -1.3]} r={0.08} h={0.03} color="#D9B44A" m={mat("#D9B44A", { metal: 0.7, rough: 0.3 })} />
      ))}
      <RoundedBox args={[0.9, 0.42, 0.8]} radius={0.12} position={[-0.6, 0.21, 0.9]} material={mat("#F6EFE3")} />
      <RoundedBox args={[0.9, 0.55, 0.16]} radius={0.06} position={[-0.6, 0.6, 0.55]} material={mat("#F6EFE3")} />
      <Plant at={[3.2, 0, -1.6]} s={1.15} />
    </group>
  );
}

/* ── 03 shopify: shelves of goods and a search / ranking board ────────── */
function Shopify() {
  const board = useCanvasTexture(512, 384, (g, w, h) => {
    g.fillStyle = "#F7FBF2";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#FFFFFF";
    g.strokeStyle = "#7FB069";
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(28, 24, w - 56, 58, 29);
    g.fill();
    g.stroke();
    g.fillStyle = "#7FB069";
    g.beginPath();
    g.arc(62, 53, 13, 0, Math.PI * 2);
    g.lineWidth = 5;
    g.stroke();
    g.font = "600 30px system-ui, sans-serif";
    g.fillStyle = "#4b5a44";
    g.fillText("search", 92, 63);
    const widths = [0.92, 0.8, 0.66, 0.54, 0.42];
    widths.forEach((k, i) => {
      const y = 112 + i * 52;
      g.fillStyle = "#121212";
      g.font = "700 28px system-ui, sans-serif";
      g.fillText(String(i + 1), 34, y + 30);
      g.fillStyle = i === 0 ? "#F37021" : "#9CC98B";
      g.beginPath();
      g.roundRect(72, y + 8, (w - 110) * k, 28, 8);
      g.fill();
    });
  });
  const bm = useMemo(() => screenMat(board), [board]);
  const goods = ["#F37021", "#81D8D0", "#F6EFE3", "#7FB069", "#D85E16", "#2B2A2E"];
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("shopify")} />
      <Shelf
        at={[2.4, 0, -1.85]}
        w={2.0}
        rows={4}
        color="#B98D62"
        fill={(r) => (
          <>
            {Array.from({ length: 5 }, (_, k) => (
              <Box key={k} at={[-0.75 + k * 0.37, 0.14, 0]} size={[0.26, 0.24 - (k % 2) * 0.05, 0.26]} color={goods[(r + k) % goods.length]} />
            ))}
          </>
        )}
      />
      <group position={[0.15, 1.65, BACK]}>
        <Box at={[0, 0, -0.01]} size={[1.7, 1.3, 0.04]} color="#2B2A2E" cast={false} />
        <mesh position={[0, 0, 0.012]} material={bm}>
          <planeGeometry args={[1.6, 1.2]} />
        </mesh>
      </group>
      {/* a counter with shopping bags */}
      <Box at={[0.4, 0.45, 0.7]} size={[1.5, 0.9, 0.6]} color="#F6EFE3" />
      <Box at={[0.4, 0.92, 0.7]} size={[1.58, 0.05, 0.66]} color="#7FB069" />
      {[
        [0.05, "#F37021"],
        [0.55, "#81D8D0"],
      ].map(([x, c]) => (
        <group key={x as number} position={[x as number, 0.95, 0.7]}>
          <Box at={[0, 0.18, 0]} size={[0.32, 0.36, 0.16]} color={c as string} />
          <mesh position={[0, 0.4, 0]} material={mat("#2B2A2E")}>
            <torusGeometry args={[0.07, 0.012, 4, 12, Math.PI]} />
          </mesh>
        </group>
      ))}
      <Plant at={[-1.4, 0, 1.4]} />
    </group>
  );
}

/* ── 04 vector institute: a research lab, GPU rack and latency graphs ── */
function Vector({ active }: RoomProps) {
  const leds = useRef<THREE.InstancedMesh>(null);
  const graph = useCanvasTexture(640, 400, (g, w, h) => {
    g.fillStyle = "#0F1620";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#22313f";
    for (let x = 40; x < w; x += 50) {
      g.beginPath();
      g.moveTo(x, 30);
      g.lineTo(x, h - 50);
      g.stroke();
    }
    // an unlabelled chart: decoration only, no numbers or claims
    [0.35, 0.55, 0.8].forEach((v, i) => {
      g.fillStyle = "#81D8D0";
      g.fillRect(110 + i * 190, h - 40 - v * 290, 90, v * 290);
    });
    g.fillStyle = "#F37021";
    g.font = "600 24px ui-monospace, monospace";
    g.fillText("inference", 40, 26);
  });
  const gm = useMemo(() => screenMat(graph), [graph]);
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#81D8D0", toneMapped: false }), []);
  const cols = 6;
  const rows = 9;
  useFrame(({ clock }) => {
    const im = leds.current;
    if (!im) return;
    const t = clock.elapsedTime;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < cols * rows; i++) {
      const on = active ? Math.sin(t * (3 + (i % 7)) + i * 1.7) > 0.1 : (i * 7) % 3 === 0;
      o.position.set(-0.3 + (i % cols) * 0.12, 0.25 + Math.floor(i / cols) * 0.2, 0.31);
      o.scale.setScalar(1);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, c.set(on ? (i % 5 === 0 ? "#F37021" : "#81D8D0") : "#16303a"));
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("vector-institute")} />
      {/* GPU rack */}
      <group position={[3.0, 0, -1.6]}>
        <Box at={[0, 1.0, 0]} size={[0.85, 2.0, 0.6]} color="#1E2329" />
        {Array.from({ length: 8 }, (_, i) => (
          <Box key={i} at={[0, 0.25 + i * 0.22, 0.301]} size={[0.75, 0.16, 0.02]} color="#2D343C" cast={false} />
        ))}
        <instancedMesh ref={leds} args={[undefined, undefined, cols * rows]} material={ledMat}>
          <boxGeometry args={[0.03, 0.03, 0.01]} />
        </instancedMesh>
      </group>
      <group position={[0.7, 1.7, BACK]}>
        <Box at={[0, 0, -0.01]} size={[2.0, 1.3, 0.05]} color="#121212" cast={false} />
        <mesh position={[0, 0, 0.02]} material={gm}>
          <planeGeometry args={[1.9, 1.19]} />
        </mesh>
      </group>
      <Desk at={[0.7, 0, -0.95]} w={1.8} d={0.7} color="#D6DCE2" legs="#2B2A2E" />
      {/* papers + laptop */}
      <Box at={[0.2, 0.79, -0.95]} size={[0.3, 0.01, 0.4]} color="#FBF7EF" cast={false} />
      <Box at={[0.28, 0.8, -0.9]} size={[0.3, 0.01, 0.4]} color="#F6EFE3" rot={[0, 0.2, 0]} cast={false} />
      <group position={[1.1, 0.79, -0.95]}>
        <Box at={[0, 0, 0]} size={[0.44, 0.02, 0.3]} color="#C7CBCF" />
        <Box at={[0, 0.14, -0.15]} size={[0.44, 0.28, 0.015]} color="#C7CBCF" rot={[-0.2, 0, 0]} />
      </group>
      <Chair at={[0.7, 0, -0.3]} yaw={Math.PI} />
      <Plant at={[-1.5, 0, 1.3]} />
    </group>
  );
}

/* ── 05 aws student builder group: chairs and a projector ─────────────── */
function Aws({ active }: RoomProps) {
  const beam = useRef<THREE.Mesh>(null);
  const slide = useCanvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = "#FFF8EC";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#E59A3A";
    g.fillRect(0, 0, w, 16);
    g.fillStyle = "#121212";
    g.font = "700 46px system-ui, sans-serif";
    g.fillText("builder group", 36, 110);
    g.fillStyle = "#81D8D0";
    for (const [x, y, r] of [
      [120, 220, 46],
      [180, 200, 60],
      [250, 222, 44],
    ] as const) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#121212";
    g.fillRect(330, 180, 140, 14);
    g.fillRect(330, 210, 110, 14);
    g.fillRect(330, 240, 125, 14);
  });
  const sm = useMemo(() => screenMat(slide), [slide]);
  useFrame(({ clock }) => {
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = (active ? 0.16 : 0.08) + Math.sin(clock.elapsedTime * 3) * 0.015;
  });
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("aws-sbg")} />
      <group position={[1.4, 1.65, BACK]}>
        <Box at={[0, 0, -0.01]} size={[2.3, 1.45, 0.03]} color="#2B2A2E" cast={false} />
        <mesh position={[0, 0, 0.01]} material={sm}>
          <planeGeometry args={[2.2, 1.35]} />
        </mesh>
      </group>
      {/* projector on a little stand, beam toward the screen */}
      <Box at={[1.4, 0.3, 1.75]} size={[0.5, 0.6, 0.4]} color="#2B2A2E" />
      <Box at={[1.4, 0.68, 1.75]} size={[0.42, 0.16, 0.36]} color="#F6EFE3" />
      <mesh ref={beam} position={[1.4, 1.2, 0.15]} rotation={[Math.PI / 2 - 0.3, 0, 0]}>
        <coneGeometry args={[0.95, 3.3, 4, 1, true]} />
        <meshBasicMaterial color="#FFF3D6" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* two rows of chairs facing the screen */}
      {[0, 1].flatMap((row) => [0, 1, 2, 3].map((k) => <Chair key={`${row}${k}`} at={[-0.1 + k * 0.85 + (row ? 0.4 : 0), 0, -0.25 + row * 0.95]} yaw={Math.PI} color={row ? "#E59A3A" : "#81D8D0"} />))}
    </group>
  );
}

/* ── 06 mali: a scrappy startup, GPUs everywhere ──────────────────────── */
function Mali({ active }: RoomProps) {
  const fans = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    fans.current?.children.forEach((f) => (f.rotation.z += dt * (active ? 14 : 4)));
  });
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("mali")} />
      <Board
        at={[0.4, 1.75, BACK + 0.01]}
        w={1.7}
        h={1.0}
        color="#FFFFFF"
        lines={["founding engineer"]}
        size={0.11}
      />
      {/* folding table stacked with GPUs */}
      <Desk at={[2.2, 0, -1.4]} w={2.1} d={0.75} color="#C9BBA6" legs="#6b6b6b" />
      <group ref={fans}>
        {[1.45, 1.95, 2.45, 2.95].map((x) => (
          <group key={x} position={[x, 0.98, -1.25]}>
            <Box at={[0, 0, 0]} size={[0.42, 0.36, 0.14]} color="#2B2A2E" />
            {[-0.1, 0.1].map((dx) => (
              <mesh key={dx} position={[dx, 0, 0.072]}>
                <circleGeometry args={[0.075, 3]} />
                <meshStandardMaterial color="#5c5c5c" />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {[1.7, 2.7].map((x) => (
        <Box key={x} at={[x, 1.25, -1.45]} size={[0.42, 0.36, 0.14]} color="#3a3a3a" />
      ))}
      {/* pizza box + beanbag */}
      <Box at={[2.6, 0.06, 0.6]} size={[0.5, 0.06, 0.5]} color="#D8B48A" rot={[0, 0.3, 0]} />
      <mesh position={[-0.8, 0.28, 0.9]} scale={[1, 0.62, 1]} material={mat("#F37021", { rough: 0.9 })} castShadow>
        <icosahedronGeometry args={[0.5, 1]} />
      </mesh>
      {/* a tangle of cables */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.9 + i * 0.3, 0.02, -0.75]} rotation-x={-Math.PI / 2} material={mat("#121212")}>
          <torusGeometry args={[0.18 + i * 0.05, 0.012, 4, 18]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── 07 yu blueprint: a nonprofit studio with whiteboards ─────────────── */
function Blueprint() {
  const notes = ["#F6C177", "#81D8D0", "#F37021", "#F6EFE3", "#9CC98B"];
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("yu-blueprint")} />
      {[0.15, 2.15].map((x, bi) => (
        <Board key={x} at={[x, 1.7, BACK + 0.01]} w={1.75} h={1.1} color="#FFFFFF" frame="#C7CBCF">
          {Array.from({ length: 7 }, (_, k) => (
            <mesh key={k} position={[-0.6 + (k % 4) * 0.38, 0.28 - Math.floor(k / 4) * 0.42, 0.01]} rotation-z={((k * 37 + bi) % 7) * 0.03 - 0.09} material={mat(notes[(k + bi) % notes.length], { rough: 1 })}>
              <planeGeometry args={[0.26, 0.26]} />
            </mesh>
          ))}
        </Board>
      ))}
      {/* the big shared table */}
      <Desk at={[1.1, 0, 0.35]} w={2.6} d={1.0} color="#F6EFE3" legs="#4C7BB8" />
      {[0.3, 1.1, 1.9].map((x, i) => (
        <group key={x}>
          <Chair at={[x, 0, -0.4]} yaw={0} color="#4C7BB8" />
          <group position={[x, 0.79, 0.25]} rotation-y={Math.PI + (i - 1) * 0.15}>
            <Box at={[0, 0, 0]} size={[0.4, 0.02, 0.28]} color="#C7CBCF" />
            <Box at={[0, 0.13, -0.14]} size={[0.4, 0.26, 0.015]} color="#C7CBCF" rot={[-0.2, 0, 0]} />
          </group>
        </group>
      ))}
      <Plant at={[3.2, 0, -1.6]} />
    </group>
  );
}

/* ── 08 itreb canada: a desk with architecture diagrams ───────────────── */
function Itreb() {
  const diagram = useCanvasTexture(640, 400, (g, w, h) => {
    g.fillStyle = "#F4F8F7";
    g.fillRect(0, 0, w, h);
    const box = (x: number, y: number, label: string, c: string) => {
      g.fillStyle = c;
      g.beginPath();
      g.roundRect(x, y, 150, 70, 12);
      g.fill();
      g.fillStyle = "#121212";
      g.font = "600 26px ui-monospace, monospace";
      g.textAlign = "center";
      g.fillText(label, x + 75, y + 45);
    };
    g.strokeStyle = "#2B2A2E";
    g.lineWidth = 4;
    for (const [a, b, c, d2] of [
      [320, 105, 320, 175],
      [320, 245, 140, 315],
      [320, 245, 320, 315],
      [320, 245, 500, 315],
    ] as const) {
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(c, d2);
      g.stroke();
    }
    // an unlabelled diagram (decoration only)
    box(245, 35, "", "#81D8D0");
    box(245, 175, "", "#F37021");
    box(65, 315, "", "#F6C177");
    box(245, 315, "", "#F6C177");
    box(425, 315, "", "#F6C177");
  });
  const dm = useMemo(() => screenMat(diagram), [diagram]);
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("itreb-canada")} />
      <group position={[0.6, 1.7, BACK]}>
        <Box at={[0, 0, -0.01]} size={[2.05, 1.33, 0.04]} color="#2B2A2E" cast={false} />
        <mesh position={[0, 0, 0.012]} material={dm}>
          <planeGeometry args={[1.95, 1.22]} />
        </mesh>
      </group>
      <Desk at={[2.4, 0, -1.2]} w={1.6} color="#8A6446" />
      <Monitor at={[2.4, 0.78, -1.38]} screen={dm} w={0.8} h={0.5} />
      <Chair at={[2.4, 0, -0.55]} yaw={Math.PI} />
      {/* filing cabinet + rolled-up plans */}
      <Box at={[3.2, 0.6, 0.6]} size={[0.5, 1.2, 0.55]} color="#6E8C8A" />
      {[0, 1, 2].map((i) => (
        <Box key={i} at={[3.2, 0.25 + i * 0.38, 0.88]} size={[0.3, 0.04, 0.02]} color="#C9A227" cast={false} />
      ))}
      {[0, 1].map((i) => (
        <Cyl key={i} at={[-0.4 + i * 0.12, 0.06, 0.9]} r={0.05} h={0.9} rot={[0, 0, Math.PI / 2]} color="#E8F1F7" />
      ))}
    </group>
  );
}

/* ── 09 prince aly khan hospital: a hospital-style room with a monitor ── */
function Hospital({ active }: RoomProps) {
  const cv = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    return c;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [cv]);
  const vm = useMemo(() => screenMat(tex), [tex]);
  const last = useRef(-1);
  useFrame(({ clock }) => {
    // a heartbeat trace, redrawn ~15×/s while we're on this floor
    const t = clock.elapsedTime;
    if (!active && last.current >= 0) return;
    if (t - last.current < 1 / 15) return;
    last.current = t;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#0E1A1A";
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#5CF2C8";
    g.lineWidth = 5;
    g.beginPath();
    for (let x = 0; x <= 512; x += 4) {
      const p = ((x / 512) * 3 + t * 0.8) % 1;
      const beat = p > 0.42 && p < 0.5 ? Math.sin(((p - 0.42) / 0.08) * Math.PI * 2) * 80 : 0;
      const y = 140 - beat + Math.sin(x * 0.05) * 3;
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    tex.needsUpdate = true;
  });
  const form = useCanvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8FCFC4";
    g.fillRect(0, 0, w, 44);
    g.fillStyle = "#E6EEED";
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.roundRect(30, 70 + i * 58, w - 60, 40, 8);
      g.fill();
    }
    g.fillStyle = "#F37021";
    g.beginPath();
    g.roundRect(w - 170, h - 52, 140, 34, 17);
    g.fill();
  });
  const fm = useMemo(() => screenMat(form), [form]);
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("prince-aly-khan-hospital")} />
      {/* bed */}
      <group position={[2.2, 0, -0.9]}>
        <Box at={[0, 0.35, 0]} size={[2.0, 0.18, 0.95]} color="#C7CBCF" />
        <Box at={[0, 0.5, 0]} size={[1.9, 0.14, 0.9]} color="#FBF7EF" />
        <Box at={[-0.75, 0.62, 0]} size={[0.4, 0.1, 0.6]} color="#FFFFFF" />
        <Box at={[0.25, 0.6, 0]} size={[1.2, 0.06, 0.92]} color="#8FCFC4" />
        <Box at={[-1.0, 0.65, 0]} size={[0.06, 0.8, 0.95]} color="#C7CBCF" />
        {[-0.9, 0.9].map((x) => [-0.4, 0.4].map((z) => <Cyl key={`${x}${z}`} at={[x, 0.15, z]} r={0.03} h={0.3} color="#8a8a8a" seg={6} />))}
      </group>
      {/* vitals monitor on a stand */}
      <group position={[0.75, 0, -1.6]}>
        <Cyl at={[0, 0.7, 0]} r={0.03} h={1.4} color="#C7CBCF" seg={6} />
        <Box at={[0, 1.55, 0]} size={[0.75, 0.48, 0.12]} color="#2B2A2E" />
        <mesh position={[0, 1.55, 0.065]} material={vm}>
          <planeGeometry args={[0.66, 0.38]} />
        </mesh>
      </group>
      {/* IV stand */}
      <group position={[3.25, 0, -1.4]}>
        <Cyl at={[0, 0.9, 0]} r={0.02} h={1.8} color="#C7CBCF" seg={6} />
        <Box at={[0, 1.65, 0.05]} size={[0.16, 0.24, 0.06]} color="#E8F5F2" />
      </group>
      {/* the desk where the workflow software lives */}
      <Desk at={[-0.3, 0, 0.6]} w={1.3} d={0.6} color="#F6EFE3" legs="#8FCFC4" yaw={Math.PI / 2} />
      <Monitor at={[-0.45, 0.78, 0.6]} w={0.7} h={0.44} screen={fm} yaw={Math.PI / 2} />
      <Window at={[0.75, 1.9, BACK]} w={0.9} h={0.6} />
      <Plant at={[3.2, 0, 1.3]} />
    </group>
  );
}

/* ── 10 aiesec: a globe, flags and an event-planning board ────────────── */
function Aiesec({ active }: RoomProps) {
  const globe = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (globe.current) globe.current.rotation.y += dt * (active ? 0.6 : 0.15);
  });
  const flagColors = ["#F37021", "#81D8D0", "#3C78C8", "#F6C177", "#9CC98B", "#D85E16", "#F6EFE3", "#4FA9A0"];
  const plan = useCanvasTexture(512, 384, (g, w, h) => {
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#C7D3E2";
    g.lineWidth = 3;
    for (let c = 0; c <= 7; c++) {
      g.beginPath();
      g.moveTo(20 + c * 67, 50);
      g.lineTo(20 + c * 67, h - 20);
      g.stroke();
    }
    for (let r = 0; r <= 5; r++) {
      g.beginPath();
      g.moveTo(20, 50 + r * 63);
      g.lineTo(w - 22, 50 + r * 63);
      g.stroke();
    }
    g.fillStyle = "#3C78C8";
    g.fillRect(20, 14, w - 42, 30);
    const cols = ["#F37021", "#81D8D0", "#F6C177"];
    for (let k = 0; k < 9; k++) {
      g.fillStyle = cols[k % 3];
      g.fillRect(28 + ((k * 3) % 7) * 67, 60 + ((k * 2) % 5) * 63, 52, 40);
    }
  });
  const pm = useMemo(() => screenMat(plan), [plan]);
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("aiesec")} />
      {/* bunting across the back wall */}
      {flagColors.map((c, i) => (
        <mesh key={i} position={[-0.6 + i * 0.52, 2.55 - Math.sin((i / (flagColors.length - 1)) * Math.PI) * 0.18, BACK + 0.02]} rotation-z={Math.PI} material={mat(c, { rough: 0.9 })}>
          <circleGeometry args={[0.18, 3]} />
        </mesh>
      ))}
      <group position={[2.4, 1.6, BACK]}>
        <Box at={[0, 0, -0.01]} size={[1.6, 1.22, 0.04]} color="#2B2A2E" cast={false} />
        <mesh position={[0, 0, 0.012]} material={pm}>
          <planeGeometry args={[1.5, 1.12]} />
        </mesh>
      </group>
      {/* globe on a stand */}
      <group position={[0.2, 0, -0.9]}>
        <Cyl at={[0, 0.45, 0]} r={0.05} h={0.9} color="#8A6446" seg={8} />
        <Cyl at={[0, 0.03, 0]} r={0.3} h={0.06} color="#8A6446" />
        <group ref={globe} position={[0, 1.25, 0]} rotation-z={0.4}>
          <mesh material={mat("#3C78C8", { rough: 0.6 })}>
            <icosahedronGeometry args={[0.4, 2]} />
          </mesh>
          {[
            [0.2, 0.25, 0.25],
            [-0.3, 0.05, 0.22],
            [0.05, -0.25, -0.3],
            [-0.1, 0.3, -0.25],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} material={mat("#9CC98B", { rough: 0.9 })}>
              <icosahedronGeometry args={[0.17, 0]} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 1.25, 0]} rotation-z={0.4} material={mat("#C9A227", { metal: 0.6, rough: 0.4 })}>
          <torusGeometry args={[0.47, 0.015, 4, 24, Math.PI]} />
        </mesh>
      </group>
      {/* planning table with flags in a cup */}
      <Desk at={[2.2, 0, 0.5]} w={1.5} d={0.8} color="#F6EFE3" legs="#3C78C8" />
      {[0, 1, 2].map((i) => (
        <group key={i} position={[1.85 + i * 0.08, 0.95, 0.4]}>
          <Cyl at={[0, 0, 0]} r={0.006} h={0.32} color="#2B2A2E" seg={4} />
          <mesh position={[0.06, 0.12, 0]} material={mat(flagColors[i * 2], { rough: 0.9 })}>
            <planeGeometry args={[0.12, 0.08]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── york university (TA): a lecture room ───────────────────────────── */
function YorkTa() {
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("york-ta")} />
      <Board at={[1.0, 1.7, BACK + 0.01]} w={2.6} h={1.15} color="#FFFFFF" frame="#C7CBCF" lines={["eecs 1021"]} size={0.2} />
      {/* lectern */}
      <Box at={[2.9, 0.55, -0.9]} size={[0.6, 1.1, 0.45]} color="#8A6446" />
      <Box at={[2.9, 1.12, -0.95]} size={[0.66, 0.05, 0.5]} color="#5A3B2B" rot={[-0.25, 0, 0]} />
      {/* rows of student desks */}
      {[0, 1].flatMap((row) =>
        [0, 1, 2].map((k) => (
          <group key={`${row}${k}`}>
            <Desk at={[-0.4 + k * 1.15, 0, 0.1 + row * 1.0]} w={0.8} d={0.45} color="#C9B79C" legs="#4a4a4a" />
            <Chair at={[-0.4 + k * 1.15, 0, 0.55 + row * 1.0]} yaw={Math.PI} color="#3D5A8C" />
          </group>
        )),
      )}
      <Box at={[1.0, 1.02, BACK + 0.06]} size={[2.4, 0.04, 0.1]} color="#C7CBCF" cast={false} />
    </group>
  );
}

/* ── vex robotics: a small robot workshop ─────────────────────────────── */
function VexWorkshop({ active }: RoomProps) {
  const bot = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = bot.current;
    if (!g) return;
    const t = clock.elapsedTime * (active ? 0.6 : 0.2);
    g.position.set(0.9 + Math.cos(t) * 0.9, 0, 0.45 + Math.sin(t) * 0.5);
    g.rotation.y = -t;
  });
  return (
    <group>
      <LogoPlaque at={PLAQUE_AT} src={logoOf("vex-robotics")} />
      {/* foam field tiles */}
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} at={[0.0 + (i % 3) * 0.9, 0.015, 0.0 + Math.floor(i / 3) * 0.9]} size={[0.88, 0.03, 0.88]} color={i % 2 ? "#6E7680" : "#5A616B"} cast={false} />
      ))}
      {/* the robot: a chassis, four wheels, a little arm */}
      <group ref={bot}>
        <Box at={[0, 0.16, 0]} size={[0.42, 0.12, 0.36]} color="#C7CBCF" />
        <Box at={[0, 0.3, -0.05]} size={[0.26, 0.16, 0.2]} color="#B8352E" />
        <Box at={[0, 0.42, 0.12]} size={[0.04, 0.24, 0.04]} color="#2B2A2E" rot={[0.5, 0, 0]} />
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} at={[sx * 0.23, 0.08, sz * 0.13]} r={0.08} h={0.05} rot={[0, 0, Math.PI / 2]} color="#2B2A2E" />))}
      </group>
      {/* workbench with parts and a laptop */}
      <Desk at={[2.4, 0, -1.5]} w={1.8} d={0.7} color="#8A6446" />
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} at={[1.75 + i * 0.22, 0.8, -1.45]} size={[0.16, 0.04, 0.3]} color="#C7CBCF" rot={[0, i * 0.3, 0]} cast={false} />
      ))}
      <group position={[2.85, 0.79, -1.45]} rotation-y={-0.3}>
        <Box at={[0, 0, 0]} size={[0.44, 0.02, 0.3]} color="#C7CBCF" />
        <Box at={[0, 0.14, -0.15]} size={[0.44, 0.28, 0.015]} color="#C7CBCF" rot={[-0.2, 0, 0]} />
      </group>
      {/* toolbox */}
      <Box at={[3.2, 0.25, 0.9]} size={[0.6, 0.5, 0.4]} color="#B8352E" />
      <Box at={[3.2, 0.53, 0.9]} size={[0.3, 0.05, 0.05]} color="#2B2A2E" cast={false} />
    </group>
  );
}

/** each room, by experience id */
const ROOM_FOR: Record<string, { Room: (p: RoomProps) => React.JSX.Element; wall: string; floor: string; spot: [number, number, number] }> = {
  cohere: { Room: Cohere, wall: "#ECEAF6", floor: "#3A3A48", spot: [0.45, 0, 0.35] },
  wealthsimple: { Room: Wealthsimple, wall: "#F4F1EA", floor: "#D9CFBF", spot: [0.5, 0, 0.3] },
  shopify: { Room: Shopify, wall: "#EEF4E6", floor: "#B98D62", spot: [-0.6, 0, 0.6] },
  "york-ta": { Room: YorkTa, wall: "#E9EDF5", floor: "#8A6446", spot: [2.3, 0, 0.2] },
  "aws-sbg": { Room: Aws, wall: "#F5EBDD", floor: "#9C7B57", spot: [-0.9, 0, 0.6] },
  "vector-institute": { Room: Vector, wall: "#DCE3EA", floor: "#56606B", spot: [-0.2, 0, 0.1] },
  mali: { Room: Mali, wall: "#EFE2D6", floor: "#8C7A66", spot: [0.6, 0, 0.3] },
  "yu-blueprint": { Room: Blueprint, wall: "#E4ECF6", floor: "#C9B79C", spot: [-0.6, 0, 1.0] },
  "itreb-canada": { Room: Itreb, wall: "#E6EEED", floor: "#8A6446", spot: [1.3, 0, 0.3] },
  "vex-robotics": { Room: VexWorkshop, wall: "#EDEDED", floor: "#4A4F57", spot: [-0.6, 0, 0.9] },
  "prince-aly-khan-hospital": { Room: Hospital, wall: "#E8F5F2", floor: "#DCE7E4", spot: [0.6, 0, 0.5] },
  aiesec: { Room: Aiesec, wall: "#E5EEF8", floor: "#B8865B", spot: [1.0, 0, -0.5] },
};

const floors: FloorDef[] = EXPERIENCE_FLOORS.map((meta) => {
  const r = ROOM_FOR[meta.id];
  return { meta, wall: r.wall, floor: r.floor, Room: r.Room, spot: { pos: r.spot, yaw: 0, pose: "idle" } };
});

export function ExperienceInterior() {
  return <Tower building="experience" floors={floors} w={W} d={D} fh={H} outer="cream" />;
}
