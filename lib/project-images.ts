import fs from "node:fs";
import path from "node:path";
import { projects } from "@/data/projects";

/**
 * Which projects have a real image at /public/projects/<slug>.webp, checked
 * at build time (server only). Empty today: no view shows an image, or a
 * placeholder, unless the file actually exists.
 */
export function existingProjectImages(): string[] {
  return projects.filter((p) => fs.existsSync(path.join(process.cwd(), "public", p.image))).map((p) => p.slug);
}
