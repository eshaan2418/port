import { projects } from "@/data/projects";
import { existingProjectImages } from "@/lib/project-images";
import { Section } from "@/components/list/Section";
import { ProjectCard } from "./ProjectCard";

/** Projects in the list view: one flat set, in the fixed order from data/projects.ts (featured four wider). */
export function Projects() {
  const images = new Set(existingProjectImages());
  return (
    <Section anchor="projects" id="projects-heading" title="projects" kicker={`${projects.length} repositories`}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => (
          <li key={p.slug} className={p.featured ? "sm:col-span-2" : ""}>
            <ProjectCard project={p} hasImage={images.has(p.slug)} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
