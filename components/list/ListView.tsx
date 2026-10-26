import { ArrowUpRight, Award, Cloud, Code, Medal, Sigma, Snowflake, Sparkles, Trophy, Zap } from "lucide-react";
import { experiences, experienceAnchorId } from "@/data/experiences";
import { websiteProjects } from "@/data/projects";
import { education } from "@/data/education";
import { extracurricularHighlights } from "@/data/extracurriculars";
import { site, mailto } from "@/data/site";
import { LogoMark } from "@/components/LogoMark";
import { LinkedInIcon } from "@/components/icons";
import { listBody, listDisplay } from "@/app/fonts/list";
import { FallbackNotice, FreeRoamButton, SwitchModeButton } from "./ModeControls";

/**
 * The normal website: one screen, no scrolling on desktop (a 100dvh
 * grid: a slim top bar, then experience / projects / education +
 * extracurriculars + contact). Below 1100px wide or 700px tall it stacks
 * into one scrolling column. Server-rendered, with all the text in the HTML
 * (it's also in the DOM, visually hidden, in the other modes). Styles:
 * `.list-view` in globals.css.
 */
/** an icon per extracurricular fact, in the order of extracurricularHighlights (decoration only) */
const EXTRA_ICONS = [Trophy, Award, Zap, Snowflake, Medal, Code, Sigma, Cloud];

export function ListView() {
  return (
    <div className={`list-view ${listDisplay.variable} ${listBody.variable}`}>
      <div className="lv-frame">
        <FallbackNotice />

        {/* top bar */}
        <header className="lv-top">
          <div className="min-w-0">
            <h1 className="lv-name">{site.name.toLowerCase()}</h1>
            <p className="lv-sub">
              <LogoMark src={education.logo} alt={`${education.school} logo`} size={16} />
              {site.subtitle}
            </p>
          </div>
          <nav aria-label="Links" className="lv-links">
            <a href={site.github} target="_blank" rel="noopener noreferrer">
              github<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={site.linkedin} target="_blank" rel="noopener noreferrer">
              linkedin<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={mailto}>email</a>
            <SwitchModeButton />
            <FreeRoamButton />
          </nav>
        </header>

        <main className="lv-grid">
          {/* DOM order = the phone order; desktop places these in three columns (grid areas) */}
          <section id="education" aria-labelledby="h-education" className="lv-area-edu">
            <h2 id="h-education" className="lv-label">
              education
            </h2>
            <article className="lv-card lv-pad flex gap-3">
              <LogoMark src={education.logo} alt={`${education.school} logo`} size={26} />
              <div className="min-w-0">
                <h3 className="lv-strong">
                  {education.degree} @ {education.school}
                </h3>
                <p className="lv-muted">{education.faculty}</p>
                <ul className="lv-small mt-1.5 space-y-0.5">
                  {education.details
                    .filter(([k]) => k !== "Degree")
                    .map(([, v]) => (
                      <li key={v}>{v}</li>
                    ))}
                </ul>
              </div>
            </article>
          </section>

          {/* experience */}
          <section id="experience" aria-labelledby="h-experience" className="lv-area-exp lv-col">
            <h2 id="h-experience" className="lv-label">
              experience
            </h2>
            <ol className="lv-exp-list">
              {experiences.filter((e) => !e.hideOnWebsite).map((e) => (
                <li key={e.id} id={experienceAnchorId(e.id)} className="lv-exp-row">
                  <LogoMark src={e.logo} alt={`${e.org} logo`} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="lv-exp-head">
                      <h3 className="lv-exp-role">{e.role}</h3>
                      <p className="lv-dates">{e.dates}</p>
                    </div>
                    <p className="lv-exp-company">
                      {e.org}
                      {e.company.endsWith(" · Internship") && <span className="lv-chip">Internship</span>}
                    </p>
                    {(e.line || e.link) && (
                      <p className="lv-exp-line">
                        {e.line}
                        {e.link && (
                          <>
                            {e.line && " "}
                            <a href={e.link.href} target="_blank" rel="noopener noreferrer" className="lv-inline-link">
                              {e.link.label}
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="extracurriculars" aria-labelledby="h-extra" className="lv-area-extra">
            <h2 id="h-extra" className="lv-label">
              extracurriculars
            </h2>
            <div className="lv-card lv-pad lv-extra">
              <ul className="lv-extra-list">
                {extracurricularHighlights.map((x, i) => {
                  const Icon = EXTRA_ICONS[i] ?? Sparkles;
                  return (
                    <li key={x} className="lv-extra-row">
                      <Icon size={17} strokeWidth={1.8} aria-hidden="true" className="lv-extra-icon" />
                      {x}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          {/* projects */}
          <section id="projects" aria-labelledby="h-projects" className="lv-area-proj lv-col">
            <h2 id="h-projects" className="lv-label">
              projects
            </h2>
            <ul className="lv-proj-grid">
              {websiteProjects.map((p) => (
                <li key={p.slug}>
                  <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className="lv-card lv-project">
                    <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" className="lv-arrow" />
                    <h3 className="lv-proj-name">{p.name}</h3>
                    <p className="lv-proj-desc">{p.shortDescription ?? p.description}</p>
                    <span className="sr-only"> (view {p.name} on GitHub, opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section id="contact" aria-labelledby="h-contact" className="lv-area-contact lv-contact-wrap">
            <h2 id="h-contact" className="lv-label">
              contact
            </h2>
            <div className="lv-card lv-contact">
              <p className="lv-contact-title">let&apos;s work together.</p>
              <div className="lv-contact-row">
                <a href={mailto} className="lv-btn">
                  Send me a note <span aria-hidden="true">→</span>
                </a>
                <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="lv-btn-ghost">
                  <LinkedInIcon size={14} /> LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              <p className="lv-foot">© 2026 {site.name}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
