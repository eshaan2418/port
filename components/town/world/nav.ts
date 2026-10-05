import { BUILDINGS, SIDEWALK_RING, SQUARE_RADIUS, placement, type BuildingId } from "./layout";
import { clearanceAt } from "./physics";

type V2 = { x: number; z: number };

/**
 * Auto-walk routes (fast travel and click-to-walk). A straight line is used
 * only when it stays outside the sidewalk (clear of the street furniture at
 * the curb, the street and the square). Otherwise the route follows the
 * sidewalk lane the short way round, then goes out to the destination.
 *
 * The lane isn't a fixed circle: the lamps, signals and hydrants sit on the
 * curb while stoops and the subway entrance stick out from the buildings, so
 * no single radius clears everything. For each few degrees the lane takes the
 * radius with the most room around it (preferring the middle of the
 * sidewalk), smoothed, so he never grazes a pole.
 */

const STEP_DEG = 1.5;
const R_MIN = 10.25;
const R_MAX = 11.9;
const R_STEP = 0.05;
const R_PREF = 10.95;
/** he's 0.4 m wide either side: keep at least this much room to anything */
const ROOM = 0.45;

let lane: number[] | null = null;

const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return clearanceAt(Math.cos(a) * r, Math.sin(a) * r);
};

/**
 * Lane radius per STEP_DEG of angle, built once from the colliders: a
 * shortest path round the ring (dynamic programming over angle × radius)
 * that never comes within ROOM of anything, bends smoothly, and otherwise
 * keeps to the middle of the sidewalk. The ring is cut at the roomiest angle
 * so the seam never sits in a tight spot.
 */
function laneRadii() {
  if (lane) return lane;
  const n = Math.round(360 / STEP_DEG);
  const radii: number[] = [];
  for (let r = R_MIN; r <= R_MAX + 1e-6; r += R_STEP) radii.push(r);
  const m = radii.length;
  const room = (i: number, j: number) => at(i * STEP_DEG, radii[j]);

  // start at the roomiest angle
  let seam = 0;
  let seamRoom = -Infinity;
  for (let i = 0; i < n; i++) {
    const best = Math.max(...radii.map((_, j) => room(i, j)));
    if (best > seamRoom) {
      seamRoom = best;
      seam = i;
    }
  }

  const BIG = 1e9;
  const nodeCost = (i: number, j: number) => {
    const c = room(i, j);
    if (c < ROOM) return BIG;
    return 0.6 * (1 - Math.min(c, 1)) + 0.25 * Math.abs(radii[j] - R_PREF);
  };
  const cost: number[][] = [];
  const back: number[][] = [];
  for (let k = 0; k <= n; k++) {
    const i = (seam + k) % n;
    const row: number[] = [];
    const brow: number[] = [];
    for (let j = 0; j < m; j++) {
      const nc = nodeCost(i, j);
      if (k === 0) {
        row.push(nc);
        brow.push(-1);
        continue;
      }
      let best = BIG * 2;
      let bj = 0;
      for (let pj = Math.max(0, j - 6); pj <= Math.min(m - 1, j + 6); pj++) {
        // a smooth bend, and the step between samples must have room too
        const mid = at(((seam + k - 0.5) % n) * STEP_DEG, (radii[j] + radii[pj]) / 2);
        const c = cost[k - 1][pj] + 1.5 * Math.abs(radii[j] - radii[pj]) + (mid < ROOM ? BIG : 0);
        if (c < best) {
          best = c;
          bj = pj;
        }
      }
      row.push(best + nc);
      brow.push(bj);
    }
    cost.push(row);
    back.push(brow);
  }
  // close the loop where it started (same radius), then walk back
  const startRow = cost[0];
  let j = 0;
  let bestEnd = Infinity;
  for (let jj = 0; jj < m; jj++) {
    const c = cost[n][jj] + 1.5 * Math.abs(radii[jj] - radii[startRow.indexOf(Math.min(...startRow))]);
    if (c < bestEnd) {
      bestEnd = c;
      j = jj;
    }
  }
  const out = new Array<number>(n);
  for (let k = n; k >= 1; k--) {
    out[(seam + k) % n] = radii[j];
    j = back[k][j];
  }
  lane = out;
  return lane;
}

function lanePoint(deg: number): V2 {
  const radii = laneRadii();
  const n = radii.length;
  const f = (((deg % 360) + 360) % 360) / STEP_DEG;
  const i = Math.floor(f);
  const r = radii[i % n] + (radii[(i + 1) % n] - radii[i % n]) * (f - i);
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

function segmentClearsCentre(a: V2, b: V2, clearance: number) {
  // distance from origin to segment ab
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const t = Math.max(0, Math.min(1, -(a.x * abx + a.z * abz) / (abx * abx + abz * abz || 1)));
  const px = a.x + abx * t;
  const pz = a.z + abz * t;
  return Math.hypot(px, pz) > clearance;
}

export function routeTo(from: V2, to: V2): V2[] {
  // destinations inside the square only need to avoid cutting across it
  const inside = Math.hypot(to.x, to.z) < SQUARE_RADIUS + 0.5;
  const clearance = inside ? SQUARE_RADIUS + 0.4 : SIDEWALK_RING - 0.2;
  if (segmentClearsCentre(from, to, clearance)) return [to];

  const a0 = (Math.atan2(from.z, from.x) * 180) / Math.PI;
  const a1 = (Math.atan2(to.z, to.x) * 180) / Math.PI;
  let delta = a1 - a0;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / STEP_DEG));
  const pts: V2[] = [];
  for (let i = 0; i <= steps; i++) pts.push(lanePoint(a0 + (delta * i) / steps));
  pts.push(to);
  return pts;
}

export function doorApproach(id: BuildingId) {
  const b = BUILDINGS.find((x) => x.id === id)!;
  return placement(b).approach;
}

/** (for checks) the lane's radius at an angle in degrees */
export const laneRadiusAt = (deg: number) => {
  const p = lanePoint(deg);
  return Math.hypot(p.x, p.z);
};
