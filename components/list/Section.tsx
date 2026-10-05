import type { ReactNode } from "react";

/**
 * One section of the list view: a quiet label and the title on the left
 * (sticky on desktop), the content on the right; a hairline above.
 */
export function Section({ anchor, id, title, kicker, children }: { anchor: string; id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section id={anchor} aria-labelledby={id} className="list-wrap border-t border-ink/12 py-14 md:py-20">
      <div className="grid gap-8 md:grid-cols-[13rem_1fr] md:gap-12 lg:grid-cols-[16rem_1fr]">
        <div className="md:sticky md:top-24 md:self-start">
          {kicker && (
            <p className="micro-label flex items-center gap-2 text-ink/70">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-orange" />
              {kicker}
            </p>
          )}
          <h2 id={id} className="mt-3 font-display text-[2.6rem] leading-[0.95] lowercase md:text-[3.1rem]">
            {title}
          </h2>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
