import { experiences, experienceAnchorId } from "@/data/experiences";
import { site, mailto } from "@/data/site";
import { Projects } from "@/components/projects/Projects";
import { Education } from "@/components/Education";
import { Contact } from "@/components/Contact";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { listBody } from "@/app/fonts/list";
import { ExperienceCard } from "./ExperienceCard";
import { ExtracurricularsSection } from "./ExtracurricularsSection";
import { Section } from "./Section";
import { Navbar } from "./Navbar";

/**
 * The plain DOM version of the whole site (server-rendered). Shown in list
 * mode, and always present (visually hidden) for screen readers and SEO.
 * Experiences newest first, projects by theme, extracurriculars, education
 * and contact, under a fixed navbar: solid cream, paper cards, ink text,
 * orange accents (see `.list-view` in globals.css).
 */
export function ListView() {
  return (
    <div className={`list-view ${listBody.variable}`}>
      <Navbar />
      <header id="top" className="list-wrap pt-32 pb-16 md:pt-40 md:pb-24">
        <p className="micro-label flex items-center gap-2 text-ink/70">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange" />
          {site.location}
        </p>
        <h1 className="mt-5 font-display text-[clamp(3.4rem,10vw,8rem)] leading-[0.9] lowercase">eshaan kapooswalla</h1>
        <p className="mt-6 text-xl text-ink/75 md:text-2xl">engineering + community builder</p>
        <nav aria-label="Contact links" className="mt-9 flex flex-wrap items-center gap-3">
          <a href={mailto} className="btn inline-flex h-11 items-center rounded-full bg-ink px-6 text-[0.95rem] font-semibold text-cream transition-colors hover:bg-ink/85">
            Email me
          </a>
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="btn inline-flex h-11 items-center gap-2 rounded-full border border-ink/25 bg-paper px-5 text-[0.95rem] font-semibold transition-colors hover:border-ink">
            <LinkedInIcon size={14} /> LinkedIn<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={site.github} target="_blank" rel="noopener noreferrer" className="btn inline-flex h-11 items-center gap-2 rounded-full border border-ink/25 bg-paper px-5 text-[0.95rem] font-semibold transition-colors hover:border-ink">
            <GitHubIcon size={15} /> GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </header>

      <Section anchor="experience" id="list-experience" title="experience" kicker="2027 — 2023">
        <ol className="space-y-4">
          {experiences.map((exp) => (
            <li key={exp.id} id={experienceAnchorId(exp.id)}>
              <ExperienceCard exp={exp} />
            </li>
          ))}
        </ol>
      </Section>

      <Projects />
      <ExtracurricularsSection />
      <Education />
      <Contact />

      <footer className="list-wrap flex flex-wrap items-center justify-between gap-3 border-t border-ink/12 py-8">
        <p className="micro-label text-ink/70">© 2026 {site.name}</p>
        <p className="micro-label text-ink/70">{site.location}</p>
      </footer>
    </div>
  );
}
