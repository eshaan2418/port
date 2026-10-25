import type { Metadata } from "next";
import { agentData, MACHINE_FILES } from "@/lib/agent";
import { PersonJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Agent version",
  description: "Eshaan Kapooswalla's portfolio as clean, structured, machine-readable HTML.",
};

/**
 * The agent version: server-rendered semantic HTML, no canvas, no scripts
 * needed, no animation. Ink background, Tiffany text in IBM Plex Mono
 * (Tiffany on ink ~11:1). Everything comes from /data via lib/agent.ts.
 */
export default function AgentPage() {
  const d = agentData();
  const a = "text-tiffany underline underline-offset-4 decoration-tiffany/60 hover:decoration-tiffany";
  return (
    <div className="agent-view min-h-[100svh] bg-ink font-mono text-[0.95rem] leading-relaxed text-tiffany">
      <PersonJsonLd />
      <header className="mx-auto max-w-[52rem] border-b border-tiffany/30 px-5 py-8 md:px-8">
        {/* plain links on purpose: "/" boots fresh from its URL (?view / ?choose), so a full page load is right */}
        {/* eslint-disable @next/next/no-html-link-for-pages */}
        <p className="text-[0.85rem]">
          this page is structured for AI agents. humans may prefer the{" "}
          <a className={a} href="/?view=list">
            normal website
          </a>{" "}
          · <a className={a} href="/?choose=1">switch mode</a>
        </p>
        {/* eslint-enable @next/next/no-html-link-for-pages */}
        <h1 className="mt-6 text-[1.9rem] font-semibold leading-tight">{d.name}</h1>
        <p className="mt-1">
          {d.tagline} · {d.location}
        </p>
        <ul className="mt-4 space-y-0.5" aria-label="Contact">
          <li>
            email: <a className={a} href={`mailto:${d.contact.email}`}>{d.contact.email}</a>
          </li>
          <li>
            linkedin: <a className={a} href={d.contact.linkedin}>{d.contact.linkedin}</a>
          </li>
          <li>
            github: <a className={a} href={d.contact.github}>{d.contact.github}</a>
          </li>
        </ul>
        <nav aria-label="Machine-readable versions" className="mt-4">
          <p>other formats:</p>
          <ul className="flex flex-wrap gap-x-4">
            {MACHINE_FILES.filter((f) => f.path !== "/agent/").map((f) => (
              <li key={f.path}>
                <a className={a} href={f.path} type={f.type}>
                  {f.path}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-[52rem] px-5 md:px-8">
        <section aria-labelledby="agent-experience" className="border-b border-tiffany/30 py-8">
          <h2 id="agent-experience" className="text-[1.25rem] font-semibold">
            experience <span className="font-normal">(newest first)</span>
          </h2>
          <ol className="mt-4 space-y-5">
            {d.experience.map((e) => (
              <li key={e.company}>
                <article aria-labelledby={`exp-${e.company}`} className="border-l-2 border-tiffany/50 pl-4">
                  <h3 id={`exp-${e.company}`} className="font-semibold">
                    {e.company} · {e.role} · <time dateTime={String(e.year)}>{e.year}</time>
                  </h3>
                  <p className="mt-1">{e.summary}</p>
                  {"link" in e && e.link && (
                    <p className="mt-1">
                      {e.link.label}: <a className={a} href={e.link.url}>{e.link.url}</a>
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="agent-projects" className="border-b border-tiffany/30 py-8">
          <h2 id="agent-projects" className="text-[1.25rem] font-semibold">
            projects <span className="font-normal">({d.projects.length})</span>
          </h2>
          <ol className="mt-4 space-y-5">
            {d.projects.map((p) => (
              <li key={p.name}>
                <article aria-labelledby={`proj-${p.name}`} className="border-l-2 border-tiffany/50 pl-4">
                  <h3 id={`proj-${p.name}`} className="font-semibold">
                    {p.name}
                    {p.featured && <span className="font-normal"> · featured</span>}
                  </h3>
                  <p className="mt-1">{p.description}</p>
                  <p className="mt-1">tags: {p.tags.length ? p.tags.join(", ") : "none listed"}</p>
                  <p>
                    github: <a className={a} href={p.github}>{p.github}</a>
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="agent-extra" className="border-b border-tiffany/30 py-8">
          <h2 id="agent-extra" className="text-[1.25rem] font-semibold">
            extracurriculars
          </h2>
          <ul className="mt-4 space-y-2">
            {d.extracurriculars.map((x) => (
              <li key={x.name}>
                <strong className="font-semibold">{x.name}:</strong> {x.facts.join("; ")}
                {"link" in x && x.link && (
                  <>
                    {" "}
                    (<a className={a} href={x.link}>{x.link}</a>)
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="agent-education" className="py-8">
          <h2 id="agent-education" className="text-[1.25rem] font-semibold">
            education
          </h2>
          <p className="mt-4 font-semibold">
            {d.education.school}, {d.education.faculty}
          </p>
          <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1">
            {Object.entries(d.education)
              .filter(([k]) => k !== "school" && k !== "faculty")
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>{k}:</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
