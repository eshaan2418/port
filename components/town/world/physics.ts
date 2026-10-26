import { COLLIDERS, WALK_RADIUS, type Collider } from "./layout";

/**
 * Tiny 2D (XZ) collision: the character is a circle; obstacles are circles
 * and oriented boxes. Penetrations are resolved by pushing the character out
 * along the contact normal, which leaves the tangential part of the move
 * intact, so walking into a wall at an angle slides along it.
 */

export const PLAYER_RADIUS = 0.4;

/** his height, for overhangs: he fits under anything whose underside is above his head */
export const PLAYER_HEIGHT = 1.85;

/** Moving obstacles (taxis), rewritten every frame by their owner. */
export const dynamicColliders: Collider[] = [];
/** The building signs' boards (they turn toward the camera and grow with distance), one slot per sign, kept up to date by SignPosts. */
export const signColliders: (Collider | null)[] = [];

type V2 = { x: number; z: number };

function pushOut(p: V2, c: Collider, r: number) {
  if (c.kind === "circle") {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.r + r;
    if (d < min) {
      const nx = d > 1e-5 ? dx / d : 1;
      const nz = d > 1e-5 ? dz / d : 0;
      p.x = c.x + nx * min;
      p.z = c.z + nz * min;
      return true;
    }
    return false;
  }
  // oriented box: into local space, find closest point, push out
  const cos = Math.cos(c.rot);
  const sin = Math.sin(c.rot);
  const dx = p.x - c.x;
  const dz = p.z - c.z;
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  const cx = Math.max(-c.hw, Math.min(c.hw, lx));
  const cz = Math.max(-c.hd, Math.min(c.hd, lz));
  const ox = lx - cx;
  const oz = lz - cz;
  const d = Math.hypot(ox, oz);
  if (d >= r) return false;
  if (d < 1e-5) {
    // centre is inside the box: leave through the nearest face
    if (c.hw - Math.abs(lx) < c.hd - Math.abs(lz)) {
      return setLocal(p, c, (Math.sign(lx) || 1) * (c.hw + r), lz, cos, sin);
    }
    return setLocal(p, c, lx, (Math.sign(lz) || 1) * (c.hd + r), cos, sin);
  }
  const k = r / d;
  return setLocal(p, c, cx + ox * k, cz + oz * k, cos, sin);
}

function setLocal(p: V2, c: { x: number; z: number }, lx: number, lz: number, cos: number, sin: number) {
  // local → world (inverse of the rotation above)
  p.x = c.x + lx * cos + lz * sin;
  p.z = c.z - lx * sin + lz * cos;
  return true;
}

function* iterColliders() {
  yield* COLLIDERS;
  yield* dynamicColliders;
  for (const c of signColliders) if (c) yield c;
}

/** distance from a point to the nearest static collider's edge (negative = inside one) */
export function clearanceAt(x: number, z: number) {
  let m = Infinity;
  for (const c of COLLIDERS) {
    if (c.air || c.base !== undefined) continue; // overhead only: never in a walker's way
    let d: number;
    if (c.kind === "circle") d = Math.hypot(x - c.x, z - c.z) - c.r;
    else {
      const cos = Math.cos(c.rot);
      const sin = Math.sin(c.rot);
      const dx = x - c.x;
      const dz = z - c.z;
      const qx = Math.abs(dx * cos - dz * sin) - c.hw;
      const qz = Math.abs(dx * sin + dz * cos) - c.hd;
      d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    }
    if (d < m) m = d;
  }
  return m;
}

/** is (x, z) inside this collider's footprint (grown by r)? */
function inside(c: Collider, x: number, z: number, r = 0) {
  if (c.kind === "circle") return Math.hypot(x - c.x, z - c.z) < c.r + r;
  const cos = Math.cos(c.rot);
  const sin = Math.sin(c.rot);
  const dx = x - c.x;
  const dz = z - c.z;
  return Math.abs(dx * cos - dz * sin) < c.hw + r && Math.abs(dx * sin + dz * cos) < c.hd + r;
}

/** the height he'd stand at here: a roof he's over (and above), else the ground */
export function floorAt(x: number, z: number, altitude: number) {
  let f = 0;
  for (const c of COLLIDERS) if (c.roof && c.h !== undefined && c.h <= altitude + 0.05 && c.h > f && inside(c, x, z, -0.1)) f = c.h;
  return f;
}

/** does this obstacle stop him at this altitude? (over it, under an overhang, or a crown he only meets in flight) */
function blocks(c: Collider, altitude: number, flying: boolean) {
  if (c.air && !flying) return false;
  if (altitude > 0.05 && altitude >= (c.h ?? 1.6)) return false; // above it
  if (c.base !== undefined && altitude + PLAYER_HEIGHT <= c.base) return false; // underneath it
  return true;
}

/** the top of the tallest obstacle within r of (x, z) (0 = open ground), signs and cars included */
export function topAt(x: number, z: number, r: number, moving = true) {
  let m = 0;
  for (const c of moving ? iterColliders() : COLLIDERS) {
    const h = c.h ?? 1.6;
    if (h > m && inside(c, x, z, r)) m = h;
  }
  return m;
}

/** the tallest obstacle along a to b (sampled every `step`, skipping the first `skip` metres) */
export function topAlong(a: V2, b: V2, r: number, skip = 0, step = 0.4) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len <= skip) return 0;
  const n = Math.max(1, Math.ceil((len - skip) / step));
  let m = 0;
  for (let i = 0; i <= n; i++) {
    const t = (skip + ((len - skip) * i) / n) / len;
    m = Math.max(m, topAt(a.x + dx * t, a.z + dz * t, r));
  }
  return m;
}

/**
 * Resolve the proposed position in place. Returns true if anything was hit.
 * `altitude`: his feet's height; obstacles lower than that are flown over,
 * overhangs higher than his head are passed under.
 */
export function resolve(p: V2, r = PLAYER_RADIUS, altitude = 0, flying = false) {
  let hit = false;
  for (let iter = 0; iter < 3; iter++) {
    let any = false;
    for (const c of iterColliders()) {
      if (!blocks(c, altitude, flying)) continue;
      // cheap reject
      const reach = c.kind === "circle" ? c.r : Math.hypot(c.hw, c.hd);
      if (Math.abs(p.x - c.x) > reach + r || Math.abs(p.z - c.z) > reach + r) continue;
      if (pushOut(p, c, r)) any = true;
    }
    // island boundary
    const d = Math.hypot(p.x, p.z);
    if (d > WALK_RADIUS - r) {
      p.x *= (WALK_RADIUS - r) / d;
      p.z *= (WALK_RADIUS - r) / d;
      any = true;
    }
    hit ||= any;
    if (!any) break;
  }
  return hit;
}
