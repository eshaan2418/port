/**
 * Education, extracurriculars and contact as bento grids.
 *
 * The grid is "Features 8" from 21st.dev (a shadcn block; the author isn't
 * named in the component's prompt; check its licence on its 21st.dev page
 * before reusing it elsewhere): its 6-column grid, gap and responsive spans
 * (full width on small screens, then halves, then thirds / halves on large),
 * the big-figure-over-a-blob card and the double-ring icon circle. Changes:
 * dark cards with hairline borders and a red offset shadow on hover, every illustration redrawn as monoline strokes and
 * flat red fills, the big text in Inter, and this site's
 * content only. All text is real DOM in the server HTML.
 */
import { Mail, Sigma, Snowflake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { education } from "@/data/education";
import { extracurricularHighlights } from "@/data/extracurriculars";
import { site, mailto } from "@/data/site";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";

const RED = "#e5262c";
const LINE = "#ffffff"; // drawings are white and red linework on the dark cards
const CUT = "#0f0f0f"; // the card surface, for cut-outs

/** the component's double-ring circle, holding a logo */
function Ring({ src, alt, size = "lg" }: { src: string; alt: string; size?: "lg" | "md" }) {
  return (
    <span className={`bt-ring bt-ring-${size}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local logo files; the static export has no image optimiser */}
      <img src={src} alt={alt} />
    </span>
  );
}

/* ── poster drawings: white monoline strokes and flat red fills, nothing that reads as data ── */
const stroke = { fill: "none", stroke: LINE, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Medal() {
  return (
    <svg viewBox="0 0 120 120" className="bt-art" aria-hidden="true">
      <path d="M34 6 H54 L66 48 H48 Z" fill={RED} />
      <path d="M86 6 H66 L54 48 H72 Z" fill={LINE} />
      <circle cx="60" cy="78" r="30" {...stroke} />
      <circle cx="60" cy="78" r="17" fill={RED} />
      <path d="M60 68 L63 75 H70 L64.5 79.5 L66.5 87 L60 82.5 L53.5 87 L55.5 79.5 L50 75 H57 Z" fill={LINE} />
    </svg>
  );
}

function Cup() {
  return (
    <svg viewBox="0 0 120 120" className="bt-art" aria-hidden="true">
      <path d="M34 16 H86 V42 C86 62 74 74 60 74 C46 74 34 62 34 42 Z" fill={RED} />
      <path d="M34 24 C16 24 16 50 37 52" {...stroke} />
      <path d="M86 24 C104 24 104 50 83 52" {...stroke} />
      <path d="M60 74 V92" {...stroke} strokeWidth={7} />
      <path d="M40 94 H80 V106 H40 Z" fill={LINE} />
      <path d="M48 28 C48 42 52 52 58 58" fill="none" stroke={CUT} strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}

/** a small red die: a flourish in the links card */
function Die() {
  return (
    <svg className="bt-die" viewBox="0 0 92 92" aria-hidden="true">
      <rect width="92" height="92" rx="6" fill={RED} />
      {[
        [28, 26],
        [64, 26],
        [46, 46],
        [28, 66],
        [64, 66],
      ].map(([x, y]) => (
        <circle key={x + "-" + y} cx={x} cy={y} r={7.5} fill={LINE} />
      ))}
    </svg>
  );
}

const [scholarName, scholarAmount] = (() => {
  // "Tentanda Via Scholar ($120,000)" → the name and the amount, both exactly as in the data
  const s = education.details.find(([k]) => k === "Scholarship")?.[1] ?? "";
  const m = s.match(/^(.*?)\s*\((\$[\d,]+)\)$/);
  return m ? [m[1], m[2]] : [s, ""];
})();
// the normal website spells the degree out (the data, the city and the agent files keep "B.Sc")
const degree = education.degree.replace(/^B\.Sc\b/, "Bachelors of Science").replace(/\s*\(Hons\)/, "");
const honors = education.details.find(([k]) => k === "Honours")?.[1] ?? "";

export function EducationBento() {
  return (
    <div className="bt-grid">
      <Card className="bt-card bt-lg3">
        <CardContent className="bt-body bt-degree">
          <Ring src={education.logo} alt={`${education.school} logo`} />
          <div>
            <h3 className="bt-h">{degree}</h3>
            <p className="bt-p bt-strong">{education.school}</p>
            <p className="bt-p">{education.faculty}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bt-card bt-lg3">
        <CardContent className="bt-body bt-center">
          <p className="bt-figure">{scholarAmount}</p>
          <h3 className="bt-h">{scholarName}</h3>
          <p className="bt-stamp">{honors}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/** a small skate for the chip (the big drawing's shape, drawn at icon size) */
function SkateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h5l1 6 6 2c2 .7 2 3.5 0 3.5H5z" />
      <path d="M4 18h16" />
      <circle cx="7" cy="21" r="1.4" fill="currentColor" />
      <circle cx="12" cy="21" r="1.4" fill="currentColor" />
      <circle cx="17" cy="21" r="1.4" fill="currentColor" />
    </svg>
  );
}

const ICPC_PROFILE = "https://icpc.global/ICPCID/C8T45MGWA8FY";

export function ExtrasBento() {
  const [champion, records, skater, iceSkating, icpc, competitive, math, aws] = extracurricularHighlights;
  const chips = [
    { text: skater, Icon: SkateIcon },
    { text: iceSkating, Icon: () => <Snowflake size={18} strokeWidth={2} aria-hidden="true" /> },
    { text: math, Icon: () => <Sigma size={18} strokeWidth={2} aria-hidden="true" /> },
  ];
  return (
    <div className="bt-grid">
      <Card className="bt-card bt-sm3 bt-lg2">
        <CardContent className="bt-body bt-center">
          <Medal />
          <h3 className="bt-stamped">{champion}</h3>
        </CardContent>
      </Card>
      <Card className="bt-card bt-sm3 bt-lg2">
        <CardContent className="bt-body bt-center">
          <Cup />
          <h3 className="bt-stamped">{records}</h3>
        </CardContent>
      </Card>
      {/* ICPC and competitive programming, together: the big card (two rows tall on wide screens) */}
      <Card className="bt-card bt-lg2 bt-lg-tall">
        <CardContent className="bt-body bt-icpc">
          <h3 className="bt-icpc-h">{icpc}</h3>
          <p className="bt-icpc-sub">{competitive}</p>
          <a className="bt-btn bt-btn-ink" href={ICPC_PROFILE} target="_blank" rel="noopener noreferrer">
            View ICPC profile <span aria-hidden="true">→</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </CardContent>
      </Card>
      <Card className="bt-card bt-sm3 bt-lg2">
        <CardContent className="bt-body">
          <ul className="bt-chips">
            {chips.map(({ text, Icon }) => (
              <li key={text}>
                <Icon />
                {text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="bt-card bt-sm3 bt-lg2">
        <CardContent className="bt-body bt-aws">
          <Ring src="/logos/aws-sbg.svg" alt="Amazon Web Services (AWS) logo" size="md" />
          <h3 className="bt-h">{aws}</h3>
        </CardContent>
      </Card>
    </div>
  );
}

const CLOSER = "let's work together.";

export function ContactBento() {
  const links = [
    { label: "github", href: site.github, Icon: GitHubIcon, external: true },
    { label: "linkedin", href: site.linkedin, Icon: LinkedInIcon, external: true },
    { label: "email", href: mailto, Icon: (p: { size?: number }) => <Mail size={p.size} strokeWidth={2} aria-hidden="true" />, external: false },
  ];
  return (
    <div className="bt-grid">
      <Card className="bt-card bt-lg3">
        <CardContent className="bt-body bt-message">
          <p className="bt-closer">{CLOSER}</p>
          <p className="bt-p bt-lead">want to collaborate? chat?</p>
          <p className="bt-p bt-lead">i&apos;m always down to meet curious and kind people.</p>
          <a className="bt-btn" href={mailto}>
            Send me a note <span aria-hidden="true">→</span>
          </a>
        </CardContent>
      </Card>
      <Card className="bt-card bt-lg3">
        <CardContent className="bt-body bt-links-card">
          <ul className="bt-links">
            {links.map(({ label, href, Icon, external }) => (
              <li key={label}>
                <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  <Icon size={22} />
                  <span>{label}</span>
                  {external && <span className="sr-only"> (opens in a new tab)</span>}
                  <span className="bt-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="bt-foot">
            <p>© 2026 {site.name}</p>
            <Die />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
