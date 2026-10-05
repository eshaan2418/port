"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Gradient sky dome. Colours are uniforms driven by TimeOfDay: a clear blue
 * day (deep at the zenith, pale at the horizon) and an ink-blue night.
 */
export const SKY = {
  day: { top: "#2F7ED3", mid: "#6FB1E8", horizon: "#C3E2F6" },
  night: { top: "#070D22", mid: "#111C40", horizon: "#24315C" },
};

let material: THREE.ShaderMaterial | null = null;
export function getSkyMaterial() {
  return (material ??= new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(SKY.day.top) },
      mid: { value: new THREE.Color(SKY.day.mid) },
      horizon: { value: new THREE.Color(SKY.day.horizon) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 c = mix(horizon, mid, smoothstep(-0.02, 0.22, h));
        c = mix(c, top, smoothstep(0.22, 0.9, h));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
}

export function Sky() {
  const mat = useMemo(() => getSkyMaterial(), []);
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[190, 32, 16]} />
    </mesh>
  );
}
