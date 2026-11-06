import localFont from "next/font/local";

/**
 * DM Sans (local OFL file, self-hosted by next/font): the mode chooser's text.
 * The normal website uses Inter (./site.ts); the 3D boards and the city HUD
 * keep their own fonts.
 */
export const listBody = localFont({
  src: "./dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});
