import type { Experience } from "@/data/experiences";
import { LogoMark } from "../LogoMark";

/** One role, on a paper card: logo, company, role, year, the summary and its link. */
export function ExperienceCard({ exp }: { exp: Experience }) {
  return (
    <article className="card rounded-[18px] p-6 md:p-8">
      <header className="flex items-start gap-4">
        <LogoMark src={exp.logo} alt={`${exp.company} logo`} size={30} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-semibold tracking-tight">{exp.company}</p>
          <h3 className="mt-0.5 font-display text-[1.65rem] leading-[1.08] lowercase md:text-[1.95rem]">{exp.role}</h3>
        </div>
        <p className="shrink-0 rounded-full border border-ink/15 px-2.5 py-0.5 font-mono text-[0.8rem] tabular-nums">{exp.year}</p>
      </header>
      <p className="mt-5 max-w-[68ch] text-[0.98rem] leading-[1.7] text-ink/75">{exp.summary}</p>
      {exp.link && (
        <a href={exp.link.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-[0.95rem] font-semibold">
          {exp.link.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
