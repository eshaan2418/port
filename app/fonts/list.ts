import localFont from "next/font/local";

/**
 * Normal-website type (local OFL files, self-hosted by next/font): Space
 * Grotesk for the name and headings, DM Sans for body text. The 3D boards and
 * the city HUD keep their own fonts.
 */
export const listDisplay = localFont({
  src: "./space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

export const listBody = localFont({
  src: "./dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});
