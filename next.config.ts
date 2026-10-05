import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * Static export for plain web hosting (Hostinger): `npm run build` writes the
 * whole site as HTML/CSS/JS into `dist/`. Upload the *contents* of `dist/`
 * to `public_html` (see README → Deploy). `npm run dev` keeps using `.next/`,
 * so nothing from development ends up in `dist/`.
 */
export default function config(phase: string): NextConfig {
  return {
    output: "export",
    distDir: phase === PHASE_PRODUCTION_BUILD ? "dist" : ".next",
    // /projects/jobber → /projects/jobber/index.html, which any web server serves as-is
    trailingSlash: true,
    // no image server on static hosting: images are served as they are
    images: { unoptimized: true },
  };
}
