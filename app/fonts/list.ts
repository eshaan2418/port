import localFont from "next/font/local";

/**
 * List-view body type: DM Sans (local OFL file, self-hosted by next/font).
 * Headings in the list use Fraunces (already loaded for the site); the 3D
 * boards and the city HUD keep their own fonts.
 */
export const listBody = localFont({
  src: "./dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});
