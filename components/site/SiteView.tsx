import { experienceAnchorId } from "@/data/experiences";
import { websiteProjectsWithImages } from "@/lib/website-project-images";
import { inter } from "@/app/fonts/site";
import { FallbackNotice } from "./SiteControls";
import { Hero } from "./Hero";
import { SiteNav } from "./SiteNav";
import { GlyphHeading } from "./GlyphHeading";
import { ExperienceRails } from "./ExperienceRails";
import { ProjectRow } from "./ProjectRow";
import { ContactBento, EducationBento, ExtrasBento } from "./Bento";
import { isInternship, roles } from "./content";
import "./site.css";

/**
 * The normal website ("list mode"): white Inter on black, red accents. The hero (./Hero)
 * is the one big moment; everything below sits calmly in normal document flow
 * in the same language (large sentence-case Inter headings, hairlines, red accents).
 * All of it is server-rendered, so every word is in the HTML. Styles: ./site.css.
 */
export function SiteView() {
  return (
    <div className={`site-view ${inter.variable}`} data-site>
      <SiteNav />
      <FallbackNotice />
      <Hero />

      <div className="pg" id="content" tabIndex={-1}>
        <section id="experience" className="pg-sec" aria-labelledby="h-experience">
          <GlyphHeading id="h-experience" text="experience" hint={{ mouse: "hover a badge, pull it down, click to flip it", touch: "tap a badge to flip it, swipe to browse" }} />
          <div className="ex-lanyard">
            <ExperienceRails />
          </div>
          {/* the full list for screen readers, crawlers and no-JS visitors (the badges only show their backs one at a time) */}
          <ol className="sr-only">
            {roles.map((e) => (
              <li key={e.id} id={experienceAnchorId(e.id)}>
                <h3>
                  {e.role} @ {e.org}
                </h3>
                {isInternship(e.company) && <p>Internship</p>}
                <p>{e.dates}</p>
                {e.line && <p>{e.line}</p>}
                {e.link && (
                  <a href={e.link.href} target="_blank" rel="noopener noreferrer">
                    {e.link.label}
                    <span> (opens in a new tab)</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section id="projects" className="pg-sec" aria-labelledby="h-projects">
          <GlyphHeading id="h-projects" text="projects" hint={{ mouse: "click a project to learn more", touch: "tap a project to learn more", icon: true }} />
          <ProjectRow projects={websiteProjectsWithImages()} />
        </section>

        <section id="education" className="pg-sec" aria-labelledby="h-education">
          <GlyphHeading id="h-education" text="education" />
          <EducationBento />
        </section>

        <section id="extracurriculars" className="pg-sec" aria-labelledby="h-extracurriculars">
          <GlyphHeading id="h-extracurriculars" text="extracurriculars" />
          <ExtrasBento />
        </section>

        <section id="contact" className="pg-sec pg-last" aria-labelledby="h-contact">
          <GlyphHeading id="h-contact" text="contact" />
          <ContactBento />
        </section>
      </div>
    </div>
  );
}
