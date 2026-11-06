import { existsSync } from "node:fs";
import { join } from "node:path";
import { websiteProjects } from "@/data/website-projects";

/**
 * Build time (server only): each website project's image is its real photo
 * when the file exists under /public (e.g. /public/projects/recall.webp),
 * otherwise its TEMPORARY poster tile (/public/projects/temp/<slug>.svg,
 * made by scripts/make-project-tiles.ts). Drop in the photos and rebuild:
 * nothing else changes.
 */
export function websiteProjectsWithImages() {
  return websiteProjects.map((p) => {
    const real = existsSync(join(process.cwd(), "public", p.image));
    return { ...p, src: real ? p.image : `/projects/temp/${p.slug}.svg`, temporary: !real };
  });
}
export type ResolvedProject = ReturnType<typeof websiteProjectsWithImages>[number];
