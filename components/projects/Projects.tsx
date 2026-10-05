import { PROJECT_FLOORS, projects, projectsOnFloor } from "@/data/projects";
import { Section } from "@/components/list/Section";
import { ProjectCard } from "./ProjectCard";

/** Projects in the list view, grouped by the gallery's themes: one card each. */
export function Projects() {
  return (
    <Section anchor="projects" id="projects-heading" title="projects" kicker={`${projects.length} repositories`}>
      <div className="space-y-12">
        {PROJECT_FLOORS.map((f) => (
          <div key={f.floor}>
            <h3 className="micro-label text-ink/70">{f.theme}</h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {projectsOnFloor(f.floor).map((p) => (
                <li key={p.slug} className={p.featured ? "sm:col-span-2" : ""}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
