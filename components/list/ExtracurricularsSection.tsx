import { line } from "@/data/speech";
import { EXTRA_FLOORS } from "@/components/town/interior/floors";
import { Section } from "./Section";

/** The Extracurriculars Tower in plain DOM: each room's plaque, link and line. */
export function ExtracurricularsSection() {
  return (
    <Section anchor="extracurriculars" id="list-extra" title="extracurriculars" kicker="beyond work">
      <ul className="grid gap-4 sm:grid-cols-2">
        {EXTRA_FLOORS.map((f) => {
          const said = line(f.speech);
          return (
            <li key={f.id} className="card flex flex-col rounded-[18px] p-6 md:p-7">
              <h3 className="flex items-center gap-2.5 font-display text-[1.45rem] lowercase">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-ink/25" style={{ background: f.mood }} />
                {f.label}
              </h3>
              <ul className="mt-3 space-y-0.5 text-[0.98rem]">
                {f.plaque.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {said && <p className="mt-4 text-[0.92rem] leading-relaxed text-ink/70">“{said}”</p>}
              {f.link && (
                <a href={f.link} target="_blank" rel="noopener noreferrer" className="mt-auto inline-block pt-4 text-[0.92rem] font-semibold">
                  {f.link.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
