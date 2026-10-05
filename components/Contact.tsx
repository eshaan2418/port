import { mailto, site } from "@/data/site";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";

/** The close of the list view: a solid ink card. */
export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="list-wrap border-t border-ink/12 py-16 md:py-24">
      <div className="mx-auto max-w-[56rem] rounded-[24px] bg-ink px-6 py-14 text-center text-cream md:px-16 md:py-20">
        <p className="micro-label text-cream/70">Contact</p>
        <h2 id="contact-heading" className="mt-5 font-display text-[clamp(2.8rem,7vw,5rem)] leading-[0.95] lowercase">
          let&apos;s work together.
        </h2>
        <p className="mx-auto mt-6 max-w-[42ch] text-lg leading-relaxed text-cream/85">
          want to collaborate? chat?
          <br />
          i&apos;m always down to meet curious and kind people.
        </p>
        <a href={mailto} className="btn mt-9 inline-flex h-13 items-center gap-3 rounded-full bg-orange px-8 py-3.5 text-[1.02rem] font-semibold text-ink transition-colors hover:bg-cream">
          Send me a note <span aria-hidden="true">→</span>
        </a>
        <div className="mt-6 flex justify-center gap-6 text-[0.95rem] font-semibold">
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
            <LinkedInIcon size={14} /> LinkedIn<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={site.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
            <GitHubIcon size={15} /> GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
