/** small shared helpers for the normal website (replaces the drawn-glyph module) */
export const az = "abcdefghijklmnopqrstuvwxyz";
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** round for SVG attributes, so the server and the browser print the same numbers (no hydration mismatch) */
export const r2 = (n: number) => Math.round(n * 100) / 100;
