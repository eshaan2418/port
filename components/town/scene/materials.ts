import * as THREE from "three";

/**
 * One shared set of flat-shaded materials (stylised low-poly NYC). Created once;
 * every mesh reuses these, so there are only a handful of shader programs.
 * Emissive "night" materials are driven by scene/TimeOfDay.tsx.
 */
const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
const glow = (color: string, emissive: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  std(color, { emissive: new THREE.Color(emissive), emissiveIntensity: 0, roughness: 0.5, ...extra });

let cached: ReturnType<typeof make> | null = null;

function make() {
  return {
    // facades
    brownstone: std("#8E5B45"),
    brownstoneDark: std("#6F4535"),
    brick: std("#A5533F"),
    brickDark: std("#7F3E30"),
    limestone: std("#E8DDC8", { roughness: 0.9 }),
    cream: std("#F6EFE3", { roughness: 0.9 }),
    creamShade: std("#E2D6C2"),
    ink: std("#232020", { roughness: 0.7 }),
    iron: std("#2C2928", { roughness: 0.55, metalness: 0.3 }),
    wood: std("#8A6446"),
    // accents (Eshaan's palette)
    orange: std("#F37021", { roughness: 0.65 }),
    orangeDeep: std("#D85E16", { roughness: 0.7 }),
    tiffany: std("#81D8D0", { roughness: 0.6 }),
    tiffanyDeep: std("#4FA9A0", { roughness: 0.7 }),
    // windows: some stay dark, most light up warm at night
    glassDark: std("#2E3F45", { roughness: 0.25, metalness: 0.15 }),
    glassLit: glow("#34474C", "#FFB25C", { roughness: 0.25, metalness: 0.1 }),
    // street
    asphalt: std("#3B3A3E", { roughness: 0.95 }),
    paint: std("#EEE7D9", { roughness: 0.9 }),
    sidewalk: std("#CDC4B4", { roughness: 0.95 }),
    curb: std("#B3A999", { roughness: 0.95 }),
    paving: std("#E4D9C6", { roughness: 0.95 }),
    lawn: std("#93C49A", { roughness: 1 }),
    lawnDeep: std("#7AB285", { roughness: 1 }),
    stone: std("#8C7E70", { roughness: 1 }),
    trunk: std("#7E5238"),
    canopy: std("#ffffff"), // tinted per instance
    water: new THREE.MeshStandardMaterial({ color: "#8EDDD5", roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.9 }),
    river: new THREE.MeshStandardMaterial({ color: "#3C7DAE", roughness: 0.3, metalness: 0.1 }),
    carPaint: std("#ffffff", { roughness: 0.4 }), // tinted per instance
    sportPaint: std("#E8501F", { roughness: 0.3, metalness: 0.1 }),
    tyre: std("#1F1C1B", { roughness: 0.6 }),
    riderTop: std("#F6EFE3", { roughness: 0.8 }),
    skinTone: std("#E9C3A3", { roughness: 0.7 }),
    trousers: std("#2A2626", { roughness: 0.8 }),
    jacket: std("#2C2928", { roughness: 0.6 }),
    chrome: std("#C7CBCF", { roughness: 0.3, metalness: 0.6 }),
    hydrant: std("#B8432F", { roughness: 0.6 }),
    cloud: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, flatShading: true }),
    signInk: std("#1d1b1b", { roughness: 0.55 }),
    streetGreen: std("#2F6B4F", { roughness: 0.6 }),
    // lights (night)
    lampGlow: glow("#FFF1D6", "#FFD08A", { roughness: 0.4 }),
    subwayGlobe: glow("#7CC79A", "#58D184", { roughness: 0.4 }),
    awningLight: glow("#FFE9C4", "#FFC67A"),
    doorway: glow("#5A3B2B", "#FFB868", { roughness: 0.9 }), // Home's hallway, seen when the door opens
    signalRed: glow("#7A2A22", "#FF4A33"),
    signalGreen: glow("#2B5A3A", "#42E08A"),
    tailLight: glow("#7A2620", "#FF3B2E"),
  };
}

export const getMats = () => (cached ??= make());
export type Mats = ReturnType<typeof make>;
