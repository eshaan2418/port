/**
 * The look of every hour, as keyframes interpolated in sRGB (mixing in
 * linear light lifts dark tones and muddies cream + orange).
 *
 *   night → pre-dawn → dawn (pale peach) → morning → day (clear blue)
 *   → golden hour → sunset (orange) → dusk → night
 */
type Key = {
  h: number;
  top: string;
  mid: string;
  horizon: string;
  light: string; // sun (or moon) colour
  intensity: number;
  night: number; // 0 day → 1 night (glows, stars, fireflies)
};

const KEYS: Key[] = [
  { h: 0, top: "#070D22", mid: "#111C40", horizon: "#24315C", light: "#9DB2EA", intensity: 0.7, night: 1 },
  { h: 4.8, top: "#070D22", mid: "#111C40", horizon: "#24315C", light: "#9DB2EA", intensity: 0.7, night: 1 },
  { h: 5.6, top: "#1B2449", mid: "#3D4170", horizon: "#8F7288", light: "#B6A7C9", intensity: 0.65, night: 0.75 },
  { h: 6.4, top: "#6E8FC4", mid: "#CBBBCB", horizon: "#F7CFB6", light: "#FFC9A0", intensity: 0.95, night: 0.25 },
  { h: 7.4, top: "#3F8AD6", mid: "#8EC1EA", horizon: "#DCEBF3", light: "#FFF0DD", intensity: 1.8, night: 0 },
  { h: 12, top: "#2F7ED3", mid: "#6FB1E8", horizon: "#C3E2F6", light: "#FFF5E4", intensity: 2.45, night: 0 },
  { h: 16, top: "#3A84D2", mid: "#7BB6E6", horizon: "#D2E6F0", light: "#FFEFD6", intensity: 2.2, night: 0 },
  { h: 17.4, top: "#4E86C8", mid: "#E7B98A", horizon: "#F8C47E", light: "#FFC27A", intensity: 1.9, night: 0.05 },
  { h: 18.4, top: "#3E4F8E", mid: "#E07D5B", horizon: "#F37021", light: "#FF8A3D", intensity: 1.25, night: 0.25 },
  { h: 19.3, top: "#172150", mid: "#4B3D6F", horizon: "#A35B63", light: "#A9B6E6", intensity: 0.75, night: 0.75 },
  { h: 20.3, top: "#070D22", mid: "#111C40", horizon: "#24315C", light: "#9DB2EA", intensity: 0.7, night: 1 },
  { h: 24, top: "#070D22", mid: "#111C40", horizon: "#24315C", light: "#9DB2EA", intensity: 0.7, night: 1 },
];

const hex = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)].map((v) => v / 255);
const PARSED = KEYS.map((k) => ({ ...k, top: hex(k.top), mid: hex(k.mid), horizon: hex(k.horizon), light: hex(k.light) }));
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number];
const smooth = (t: number) => t * t * (3 - 2 * t);

export type SkySample = {
  top: [number, number, number];
  mid: [number, number, number];
  horizon: [number, number, number];
  light: [number, number, number];
  intensity: number;
  night: number;
};

/** sRGB 0–1 triplets for hour h */
export function sampleSky(h: number): SkySample {
  const t = ((h % 24) + 24) % 24;
  let i = 0;
  while (i < PARSED.length - 2 && PARSED[i + 1].h <= t) i++;
  const a = PARSED[i];
  const b = PARSED[i + 1];
  const k = smooth((t - a.h) / (b.h - a.h || 1));
  return {
    top: mix(a.top, b.top, k),
    mid: mix(a.mid, b.mid, k),
    horizon: mix(a.horizon, b.horizon, k),
    light: mix(a.light, b.light, k),
    intensity: a.intensity + (b.intensity - a.intensity) * k,
    night: a.night + (b.night - a.night) * k,
  };
}

const SUNRISE = 6.4;
const SUNSET = 18.6;

/**
 * Sun / moon direction (unit vector toward the light) for hour h. The sun
 * rises in the east (+x), peaks over the park side (+z) and sets in the
 * west (−x); the moon follows the same path through the night.
 */
export function lightDir(h: number) {
  const t = ((h % 24) + 24) % 24;
  const day = t >= SUNRISE && t < SUNSET;
  const u = day ? (t - SUNRISE) / (SUNSET - SUNRISE) : ((t - SUNSET + 24) % 24) / (24 - (SUNSET - SUNRISE));
  const phi = Math.PI * u;
  const el = Math.sin(phi) * (day ? 1.05 : 0.9);
  const c = Math.cos(el);
  return { x: Math.cos(phi) * c, y: Math.sin(el), z: Math.sin(phi) * 0.75 * c, day, elevation: el };
}
