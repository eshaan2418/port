import Link from "next/link";
import type { Project } from "@/data/projects";

/** A project on a paper card: name, description, tags, GitHub (and the case study for the featured four). */
export function ProjectCard({ project: p }: { project: Project }) {
  return (
    <article className="card flex h-full flex-col rounded-[18px] p-6 md:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className={`font-display leading-tight ${p.featured ? "text-[1.7rem] md:text-[2rem]" : "text-[1.35rem]"}`}>{p.name}</h4>
        {p.featured && <span className="micro-label shrink-0 rounded-full bg-orange px-2.5 py-1.5 text-ink">featured</span>}
      </div>
      <p className={`mt-3 text-[0.95rem] leading-[1.65] text-ink/75 ${p.featured ? "max-w-[70ch]" : ""}`}>{p.description}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
        {p.tags.map((t) => (
          <li key={t} className="rounded-full bg-tiffany-soft px-2.5 py-0.5 font-mono text-[0.68rem] tracking-[0.06em]">
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-5 text-[0.92rem] font-semibold">
        <a href={p.repoUrl} target="_blank" rel="noopener noreferrer">
          GitHub ↗<span className="sr-only"> {p.name} repository (opens in a new tab)</span>
        </a>
        {p.featured && (
          <Link href={`/projects/${p.slug}`}>
            Case study →<span className="sr-only"> {p.name}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
