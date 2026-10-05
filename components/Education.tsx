import { Section } from "@/components/list/Section";

export function Education() {
  return (
    <Section anchor="education" id="education-heading" title="education" kicker="study">
      <article className="card rounded-[18px] p-6 md:p-8">
        <h3 className="font-display text-[1.9rem] leading-tight lowercase md:text-[2.3rem]">york university</h3>
        <p className="mt-1 text-[1rem] text-ink/75">Lassonde School of Engineering</p>
        <dl className="mt-6 border-t border-ink/12">
          {[
            ["Degree", "B.Sc (Hons) Computer Science"],
            ["Location", "Toronto, ON, Canada"],
            ["Scholarship", "Tentanda Via Scholar ($120,000)"],
            ["Honours", "Dean's Honor Roll"],
          ].map(([term, value]) => (
            <div key={term} className="grid grid-cols-[7.5rem_1fr] items-baseline gap-4 border-b border-ink/12 py-3.5 last:border-0 sm:grid-cols-[9rem_1fr]">
              <dt className="micro-label text-ink/70">{term}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </article>
    </Section>
  );
}
