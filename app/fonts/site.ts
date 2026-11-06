import localFont from "next/font/local";

/**
 * Inter (The Inter Project Authors, SIL OFL 1.1; ./OFL-inter.txt): the normal
 * website's only face, self-hosted by next/font from a local variable file
 * (no runtime CDN). Weights 400, 500 and 600 are used.
 */
export const inter = localFont({
  src: "./inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
