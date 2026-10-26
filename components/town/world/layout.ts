/**
 * eshaan's city: one cozy New York block as plain data (no three.js), shared
 * by the scene, collision, auto-walk and HUD. World units ≈ metres; the
 * character is ~1.75 tall and walks ~3.3 u/s, so the island is ~15 s across.
 *
 *  rings, from the middle out:
 *    0 ─ 7.0    the square: fountain, benches, pretzel cart, pigeons
 *    7.0 ─ 9.8  the street: one-way loop with taxis and crosswalks
 *    9.8 ─ …    the sidewalk: street lamps, hydrants, newspaper boxes, signs
 *    …          the five buildings; a small park with a pond in the open front
 *    20.4       walk boundary; promenade railing; then water and the skyline
 *
 *            Experience (−148°)    Home (−90°)    Projects (−32°)
 *            Education (152°)   park (90°)      Extracurriculars (28°)
 */

export type BuildingId = "home" | "experience" | "projects" | "extracurriculars" | "education";

export type Building = {
  id: BuildingId;
  name: string; // HUD / fast-travel label
  sign: string; // lowercase sign text
  kind: "house" | "tower" | "gallery" | "round" | "education";
  angle: number; // degrees around the square
  radius: number; // distance of the footprint centre from the fountain
  w: number; // facade width (local x)
  d: number; // depth (local z); round towers use w as the diameter
  floors: number;
  groundH: number; // ground floor: door, awning and sign live here
  floorH: number; // upper floors
  approachGap: number; // how far in front of the facade the door spot is (stoops, porticos)
};

export const BUILDINGS: Building[] = [
  { id: "home", name: "Home", sign: "home", kind: "house", angle: -90, radius: 15.6, w: 7, d: 5.6, floors: 3, groundH: 3.8, floorH: 2.6, approachGap: 1.75 },
  { id: "experience", name: "Experience", sign: "experience tower", kind: "tower", angle: -148, radius: 15.6, w: 6.6, d: 6.6, floors: 10, groundH: 4.2, floorH: 2.0, approachGap: 1.15 },
  { id: "projects", name: "Projects", sign: "projects gallery", kind: "gallery", angle: -32, radius: 15.6, w: 9.6, d: 6.6, floors: 5, groundH: 4.2, floorH: 2.6, approachGap: 1.15 },
  { id: "extracurriculars", name: "Extracurriculars", sign: "extracurriculars tower", kind: "round", angle: 28, radius: 15.2, w: 6.8, d: 6.8, floors: 5, groundH: 4.2, floorH: 2.3, approachGap: 1.35 },
  { id: "education", name: "Education", sign: "education", kind: "education", angle: 152, radius: 16.2, w: 10.6, d: 6.6, floors: 2, groundH: 4.2, floorH: 3.0, approachGap: 2.0 },
];

export const ISLAND_RADIUS = 23;
export const WALK_RADIUS = 20.4; // invisible boundary for the character
export const SQUARE_RADIUS = 7.0;
export const STREET = { inner: 7.0, outer: 9.8, lane: 8.4 };
export const CURB_R = 10.05; // sidewalk furniture line (just outside the curb)
export const SIDEWALK_RING = 10.65; // auto-walk route along the sidewalk
export const FOUNTAIN_RADIUS = 2.8;
export const POND = { angle: 90, radius: 15.4, r: 2.1 };

export const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (deg: number, r: number) => ({ x: Math.cos(rad(deg)) * r, z: Math.sin(rad(deg)) * r });
/** yaw that makes local +z point from p toward q */
const yawToward = (p: { x: number; z: number }, q: { x: number; z: number }) => Math.atan2(q.x - p.x, q.z - p.z);

/** Footprint centre, facing (front = toward the square), door + approach. */
export function placement(b: Building) {
  const a = rad(b.angle);
  const x = Math.cos(a) * b.radius;
  const z = Math.sin(a) * b.radius;
  const fx = -Math.cos(a);
  const fz = -Math.sin(a);
  const rotY = Math.atan2(fx, fz); // local +z → front
  const half = b.d / 2;
  return {
    x,
    z,
    rotY,
    front: { x: fx, z: fz },
    door: { x: x + fx * half, z: z + fz * half },
    approach: { x: x + fx * (half + b.approachGap), z: z + fz * (half + b.approachGap) },
    height: buildingHeight(b),
  };
}

/** Education doubles as the post office: its mailbox sits beside the steps. */
export const MAILBOX_LOCAL = { x: 4.85, z: 3.3 + 1.25 };

export const buildingHeight = (b: Building) => b.groundH + (b.floors - 1) * b.floorH;
export const buildingById = (id: BuildingId) => BUILDINGS.find((b) => b.id === id)!;

/** local (building frame) → world */
export function toWorld(b: Building, lx: number, lz: number) {
  const p = placement(b);
  const c = Math.cos(p.rotY);
  const s = Math.sin(p.rotY);
  return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c };
}

/* ── street furniture ─────────────────────────────────────────────────── */

export type Spot = { x: number; z: number; rotY: number };
const curb = (deg: number, r = CURB_R): Spot => {
  const p = polar(deg, r);
  return { ...p, rotY: yawToward(p, { x: 0, z: 0 }) }; // +z faces the street
};

/** crosswalks: one in front of every building, one into the park */
export const CROSSWALKS = [...BUILDINGS.map((b) => b.angle), 90];

export const STREET_LAMPS: Spot[] = [
  // (the one by the subway sits at 67°, past the entrance, so the sidewalk between them stays walkable)
  ...[-175, -120, -62, 0, 67, 75, 105, 120].map((d) => curb(d)),
  // inner ring sits between the building axes so it never blocks the arrival view
  ...[-120, -60, 0, 60, 120, 180].map((d) => curb(d, 6.62)),
];
export const TRAFFIC_LIGHTS: Spot[] = CROSSWALKS.map((d) => curb(d + 10));
export const HYDRANTS: Spot[] = [-134, -12, 42, 168].map((d) => curb(d)); // 42°: clear of the subway entrance
export const NEWS_BOXES: Spot[] = [-104, -100, -46, 136, 140].map((d) => curb(d, 9.98));
export const STREET_SIGNS: (Spot & { name: string })[] = [
  { ...curb(-160), name: "tiffany ave" },
  { ...curb(-20), name: "orange st" },
  { ...curb(40), name: "cream st" },
  { ...curb(140), name: "ink pl" },
];
export const MANHOLES = [polar(-60, STREET.lane), polar(118, STREET.lane)];
export const CART: Spot = { ...polar(60, 5.1), rotY: yawToward(polar(60, 5.1), { x: 0, z: 0 }) + Math.PI / 2 };
export const SUBWAY: Spot = { ...polar(55, 12.6), rotY: yawToward(polar(55, 12.6), { x: 0, z: 0 }) };

/** benches face what they're looking at */
export type Bench = Spot;
const SQUARE_BENCHES: Bench[] = [-120, -60, 0, 120, 180].map((d) => {
  const p = polar(d, 5.0);
  return { ...p, rotY: yawToward(p, { x: 0, z: 0 }) };
});
const pond = polar(POND.angle, POND.radius);
const PARK_BENCHES: Bench[] = [70, 110].map((d) => {
  const p = polar(d, 12.5);
  return { ...p, rotY: yawToward(p, pond) };
});
export const BENCHES: Bench[] = [...SQUARE_BENCHES, ...PARK_BENCHES];

/* ── building signs (billboards on posts, one per walkable side) ──────── */

export type SignPost = {
  building: BuildingId;
  text: string;
  /** facade: over the door on a short bracket; post: freestanding on a side */
  mount: "facade" | "post";
  x: number;
  z: number;
  y: number; // board centre height
  size: number; // lettering size
  /** yaw of the side's outward normal; the board turns toward the camera but
   *  never further than `maxTurn` from it, so it can't swing into the wall */
  normalYaw: number;
  wallGap: number; // distance from the post to the wall it belongs to
};

function makeSignPosts(): SignPost[] {
  const out: SignPost[] = [];
  for (const b of BUILDINGS) {
    const p = placement(b);
    const hw = b.w / 2;
    const hd = b.d / 2;
    // front: over the door, on a bracket that stands it off the wall
    const facade = {
      house: { z: hd + 0.62, y: 4.35, size: 0.6 },
      tower: { z: hd + 0.62, y: 3.6, size: 0.58 },
      gallery: { z: hd + 0.62, y: 3.6, size: 0.64 },
      round: { z: b.w / 2 + 0.95, y: 3.7, size: 0.5 },
      education: { z: hd + 2.3, y: 5.05, size: 0.44 }, // on the entablature
    }[b.kind];
    const fp = toWorld(b, 0, facade.z);
    out.push({
      building: b.id,
      text: b.sign,
      mount: "facade",
      ...fp,
      y: facade.y,
      size: facade.size,
      normalYaw: Math.atan2(p.front.x, p.front.z),
      wallGap: b.kind === "education" ? 0.25 : 0.62,
    });
    // left / right / back, if that side faces walkable ground
    const sides: { lx: number; lz: number; nx: number; nz: number; half: number }[] = [
      { lx: -(hw + 1.45), lz: 0, nx: -1, nz: 0, half: hw },
      { lx: hw + 1.45, lz: 0, nx: 1, nz: 0, half: hw },
      { lx: 0, lz: -(hd + 1.45), nx: 0, nz: -1, half: hd },
    ];
    for (const s of sides) {
      const w = toWorld(b, s.lx, s.lz);
      if (Math.hypot(w.x, w.z) > WALK_RADIUS - 0.6) continue;
      const blocked = BUILDINGS.some((o) => o !== b && Math.hypot(placement(o).x - w.x, placement(o).z - w.z) < Math.max(o.w, o.d) / 2 + 1.6);
      if (blocked) continue;
      const n = toWorld(b, s.nx, s.nz);
      out.push({ building: b.id, text: b.sign, mount: "post", ...w, y: 3.05, size: 0.5, normalYaw: Math.atan2(n.x - p.x, n.z - p.z), wallGap: 1.45 });
    }
  }
  return out;
}
export const SIGN_POSTS = makeSignPosts();

/* ── trees (deterministic) ────────────────────────────────────────────── */

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Tree = { x: number; z: number; s: number; tone: number; rot: number };

function nearBuilding(x: number, z: number, margin: number) {
  return BUILDINGS.some((b) => {
    const p = placement(b);
    const c = Math.cos(p.rotY);
    const s = Math.sin(p.rotY);
    const dx = x - p.x;
    const dz = z - p.z;
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    return Math.abs(lx) < b.w / 2 + margin && lz > -b.d / 2 - margin && lz < b.d / 2 + margin + 2.6;
  });
}

function makeTrees(): Tree[] {
  const rnd = mulberry32(11);
  const out: Tree[] = [];
  const keepClear = [
    { ...pond, r: POND.r + 1.6 },
    { ...SUBWAY, r: 2.6 },
    ...PARK_BENCHES.map((b) => ({ ...b, r: 1.6 })),
    ...SIGN_POSTS.map((s) => ({ ...s, r: 1.4 })),
  ];
  let guard = 0;
  while (out.length < 30 && guard++ < 6000) {
    const a = rnd() * Math.PI * 2;
    const deg = ((a * 180) / Math.PI + 360) % 360;
    const park = deg > 40 && deg < 140;
    const r = park ? 11.6 + rnd() * 8.2 : 16.5 + rnd() * 3.6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x, z) > WALK_RADIUS + 0.4) continue;
    if (nearBuilding(x, z, 1.5)) continue;
    if (keepClear.some((k) => Math.hypot(k.x - x, k.z - z) < k.r)) continue;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
    out.push({ x, z, s: 0.85 + rnd() * 0.5, tone: rnd(), rot: rnd() * Math.PI });
  }
  return out;
}
export const TREES = makeTrees();

/* ── colliders (XZ plane) ────────────────────────────────────────────── */

/**
 * `h`: the obstacle's top (he flies over it above that height);
 * `base`: its underside, for overhangs (awnings, the portico, fire escapes,
 * tree crowns): he passes underneath when his head is lower;
 * `roof`: a flat top he can land on (at `h`);
 * `air`: only stops him in flight (tree crowns: walkers duck under them).
 */
export type Collider = ({ kind: "circle"; x: number; z: number; r: number } | { kind: "box"; x: number; z: number; hw: number; hd: number; rot: number }) & {
  h?: number;
  base?: number;
  roof?: boolean;
  air?: boolean;
};

/** where each building's roof really is (the cornice slab sits on top of the walls) */
export const roofTop = (b: Building) => buildingHeight(b) + (b.kind === "house" ? 0.41 : 0.36);
/** the art deco tower's stepped crown (Experience): tier widths / heights, from the roof up */
export const CROWN = { tiers: [1.5, 1.3, 1.1], firstInset: 1.0, step: 1.1, spire: 3.2 };
/** the round tower's copper roof (Extracurriculars): a truncated cone with a small flat deck */
export const COPPER = { h: 2.4, overhang: 0.5, deck: 1.3, mast: 1.0 };

/** awning over a door (matches Buildings.tsx `entrance`): local z of the wall, width, door base / height */
function awningCollider(b: Building, z: number, aw: number, base: number, dh: number): Collider {
  const p = placement(b);
  const c = toWorld(b, 0, z + 0.58);
  const ay = base + dh + 0.42;
  return { kind: "box", x: c.x, z: c.z, hw: aw / 2 + 0.05, hd: 0.62, rot: p.rotY, base: ay - 0.45, h: ay + 0.3 };
}

function buildColliders(): Collider[] {
  const out: Collider[] = [];
  for (const b of BUILDINGS) {
    const p = placement(b);
    const H = buildingHeight(b);
    const top = roofTop(b);
    const hd = b.d / 2;
    if (b.kind === "round") {
      // walls, then the copper roof as stacked rings (he slides off the slope), a flat deck on top and the finial mast
      const r = b.w / 2;
      const R = r + COPPER.overhang;
      out.push({ kind: "circle", x: p.x, z: p.z, r: r + 0.05, h: H });
      out.push({ kind: "circle", x: p.x, z: p.z, r: R, base: H - 0.3, h: H + 0.05 }); // the eave
      for (let rr = R - 0.5; rr > COPPER.deck + 0.2; rr -= 0.5)
        out.push({ kind: "circle", x: p.x, z: p.z, r: rr, h: H + (COPPER.h * (R - rr)) / (R - COPPER.deck) });
      out.push({ kind: "circle", x: p.x, z: p.z, r: COPPER.deck, h: H + COPPER.h, roof: true });
      out.push({ kind: "circle", x: p.x, z: p.z, r: 0.1, h: H + COPPER.h + COPPER.mast + 0.3 });
      const v = toWorld(b, 0, r + 0.05); // vestibule
      out.push({ kind: "box", x: v.x, z: v.z, hw: 1.55, hd: 0.3, rot: p.rotY, h: 4 });
      out.push(awningCollider(b, r + 0.3, 3.2, 0, 2.4));
    } else {
      out.push({ kind: "box", x: p.x, z: p.z, hw: b.w / 2 + 0.05, hd: hd + 0.05, rot: p.rotY, h: top, roof: true });
    }
    if (b.kind === "house") {
      // stoop: steps + side walls in front of the raised door
      const s = toWorld(b, 0, hd + 0.7);
      out.push({ kind: "box", x: s.x, z: s.z, hw: 1.15, hd: 0.72, rot: p.rotY, h: 1.3 });
      out.push(awningCollider(b, hd, 2.4, 1.15, 2.2));
      const wt = toWorld(b, -1.6, -0.9); // the water tower on the roof
      out.push({ kind: "circle", x: wt.x, z: wt.z, r: 1.0, h: H + 4.45 });
    }
    if (b.kind === "tower") {
      // the stepped crown: each tier is a roof of its own; the spire on top
      let w = b.w - CROWN.firstInset;
      let y = top;
      for (const th of CROWN.tiers) {
        y += th;
        out.push({ kind: "box", x: p.x, z: p.z, hw: w / 2, hd: w / 2, rot: p.rotY, h: y, roof: true });
        w -= CROWN.step;
      }
      out.push({ kind: "circle", x: p.x, z: p.z, r: 0.36, h: y + CROWN.spire });
      out.push(awningCollider(b, hd, 3.4, 0, 2.5));
    }
    if (b.kind === "gallery") {
      out.push(awningCollider(b, hd, 3.8, 0, 2.5));
      for (const side of [-1, 1]) {
        // fire escapes: from the first platform up to the top rail
        const f = toWorld(b, side * (b.w / 2 + 0.45), 0);
        out.push({ kind: "box", x: f.x, z: f.z, hw: 0.47, hd: Math.min(3.2, b.d - 1.4) / 2 + 0.05, rot: p.rotY, base: b.groundH, h: b.groundH + (b.floors - 2) * b.floorH + 0.6 });
      }
    }
    if (b.kind === "education") {
      for (const cx of [-2.85, -0.95, 0.95, 2.85]) {
        const c = toWorld(b, cx, hd + 1.1);
        out.push({ kind: "circle", x: c.x, z: c.z, r: 0.34, h: 6.8 });
      }
      const pt = toWorld(b, 0, hd + 1.0); // entablature + pediment over the columns
      out.push({ kind: "box", x: pt.x, z: pt.z, hw: 4.45, hd: 1.3, rot: p.rotY, base: 4.55, h: 6.9 });
      out.push(awningCollider(b, hd, 2.8, 0, 2.5));
      const mb = toWorld(b, MAILBOX_LOCAL.x, MAILBOX_LOCAL.z); // the post-office mailbox
      out.push({ kind: "circle", x: mb.x, z: mb.z, r: 0.36, h: 1.2 });
    }
  }
  out.push({ kind: "circle", x: 0, z: 0, r: FOUNTAIN_RADIUS + 0.05, h: 1.6 });
  out.push({ kind: "circle", x: pond.x, z: pond.z, r: POND.r + 0.25, h: 0.3 });
  for (const t of TREES) {
    out.push({ kind: "circle", x: t.x, z: t.z, r: 0.36 * t.s + 0.12, h: 3.8 * t.s });
    out.push({ kind: "circle", x: t.x, z: t.z, r: 1.2 * t.s, base: 1.0 * t.s, h: 3.8 * t.s, air: true }); // the crown
  }
  for (const l of STREET_LAMPS) out.push({ kind: "circle", x: l.x, z: l.z, r: 0.18, h: 4.6 });
  for (const l of TRAFFIC_LIGHTS) out.push({ kind: "circle", x: l.x, z: l.z, r: 0.16, h: 4.2 });
  for (const h of HYDRANTS) out.push({ kind: "circle", x: h.x, z: h.z, r: 0.2, h: 0.9 });
  for (const n of NEWS_BOXES) out.push({ kind: "box", x: n.x, z: n.z, hw: 0.26, hd: 0.22, rot: n.rotY, h: 1.2 });
  for (const s of STREET_SIGNS) out.push({ kind: "circle", x: s.x, z: s.z, r: 0.12, h: 3.2 });
  for (const s of SIGN_POSTS) if (s.mount === "post") out.push({ kind: "circle", x: s.x, z: s.z, r: 0.14, h: 4.5 });
  for (const b of BENCHES) out.push({ kind: "box", x: b.x, z: b.z, hw: 0.95, hd: 0.36, rot: b.rotY, h: 1 });
  out.push({ kind: "box", x: CART.x, z: CART.z, hw: 0.95, hd: 0.55, rot: CART.rotY, h: 2.6 });
  out.push({ kind: "box", x: SUBWAY.x, z: SUBWAY.z, hw: 1.25, hd: 1.75, rot: SUBWAY.rotY, h: 2.8 });
  return out;
}

export const COLLIDERS = buildColliders();

/** the highest roof he can stand on (the top of Experience's crown) */
export const HIGHEST_ROOF = Math.max(...COLLIDERS.filter((c) => c.roof).map((c) => c.h ?? 0));
/** the suit's ceiling: just over the highest roof (so he can land on it), never above the tallest building */
export const FLY_CEILING = HIGHEST_ROOF + 2.5;

