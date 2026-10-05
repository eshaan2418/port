import { COLLIDERS, WALK_RADIUS, type Collider } from "./layout";

/**
 * Tiny 2D (XZ) collision: the character is a circle; obstacles are circles
 * and oriented boxes. Penetrations are resolved by pushing the character out
 * along the contact normal, which leaves the tangential part of the move
 * intact, so walking into a wall at an angle slides along it.
 */

export const PLAYER_RADIUS = 0.4;

/** Moving obstacles (taxis), rewritten every frame by their owner. */
export const dynamicColliders: Collider[] = [];

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
}

/** distance from a point to the nearest static collider's edge (negative = inside one) */
export function clearanceAt(x: number, z: number) {
  let m = Infinity;
  for (const c of COLLIDERS) {
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

/** Resolve the proposed position in place. Returns true if anything was hit. */
export function resolve(p: V2, r = PLAYER_RADIUS) {
  let hit = false;
  for (let iter = 0; iter < 3; iter++) {
    let any = false;
    for (const c of iterColliders()) {
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
