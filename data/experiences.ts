/**
 * Single source of truth for experience content: the normal website, the
 * 3D Experience Tower (one room each, top to bottom), the agent view and its
 * .md / .json / llms.txt files all read this. Array order is the display
 * order everywhere. Every string here is exactly as given; don't add to it.
 */

export type ExperienceLink = {
  label: string;
  href: string;
};

export type Experience = {
  id: string;
  /** role title, e.g. "Member of Technical Staff" */
  role: string;
  /** company as shown, including " · Internship" where it applies */
  company: string;
  /** company name alone (logos, alt text, "Role @ Company") */
  org: string;
  dates: string;
  /** the one short line (none for AIESEC) */
  line?: string;
  /** Path under /public. Replace the file to swap a logo; no code change needed. */
  logo: string;
  link?: ExperienceLink;
};

export const experiences: Experience[] = [
  {
    id: "cohere",
    role: "Member of Technical Staff",
    company: "Cohere · Internship",
    org: "Cohere",
    dates: "Jun 2026 – Present",
    line: "north models. ( incoming winter'27 )",
    logo: "/logos/cohere.png",
  },
  {
    id: "wealthsimple",
    role: "Engineering",
    company: "Wealthsimple · Internship",
    org: "Wealthsimple",
    dates: "Sep 2026 – Present",
    line: "financial markets.",
    logo: "/logos/wealthsimple.jpeg",
  },
  {
    id: "shopify",
    role: "Engineering",
    company: "Shopify · Internship",
    org: "Shopify",
    dates: "May 2026 – Aug 2026",
    line: "sidekick, recommendations & search relevance (received return offer)",
    logo: "/logos/shopify.svg",
  },
  {
    id: "york-ta",
    role: "Teaching Assistant",
    company: "York University",
    org: "York University",
    dates: "May 2026 – Aug 2026",
    line: "eecs 1021",
    logo: "/logos/york.png",
  },
  {
    id: "aws-sbg",
    role: "Student Builder Group Leader",
    company: "Amazon Web Services (AWS)",
    org: "Amazon Web Services (AWS)",
    dates: "Nov 2025 – May 2026",
    line: "founded a 200+ member community.",
    logo: "/logos/aws-sbg.svg",
  },
  {
    id: "vector-institute",
    role: "Researcher",
    company: "Vector Institute",
    org: "Vector Institute",
    dates: "Jan 2026 – Apr 2026",
    line: "authored a paper on inference.",
    logo: "/logos/vector-institute.jpeg",
    link: {
      label: "View research paper →",
      href: "https://drive.google.com/file/d/1vsVoP_sBgLqXQblE80stIUYyOGJpyLm8/view",
    },
  },
  {
    id: "mali",
    role: "Founding Engineer",
    company: "Mali",
    org: "Mali",
    dates: "May 2025 – Dec 2025",
    line: "backed by ibm, 5-figure exit.",
    logo: "/logos/mali.svg",
  },
  {
    id: "yu-blueprint",
    role: "Engineering",
    company: "YU Blueprint",
    org: "YU Blueprint",
    dates: "May 2025 – Aug 2025",
    line: "university club, made friends & built projects.",
    logo: "/logos/yu-blueprint.png",
  },
  {
    id: "itreb-canada",
    role: "Engineering",
    company: "ITREB Canada · Internship",
    org: "ITREB Canada",
    dates: "May 2024 – Dec 2024",
    line: "built software used by thousands of community members.",
    logo: "/logos/itreb-canada.jpeg",
  },
  {
    id: "vex-robotics",
    role: "Bot Programmer",
    company: "VEX Robotics",
    org: "VEX Robotics",
    dates: "Jan 2022 – May 2024",
    line: "built some cool bots, using c++.",
    logo: "/logos/vex-robotics.svg",
  },
  {
    id: "prince-aly-khan-hospital",
    role: "Engineering",
    company: "Prince Aly Khan Hospital · Internship",
    org: "Prince Aly Khan Hospital",
    dates: "Jan 2024 – Apr 2024",
    line: "built tools that helped hospital teams manage information and support day-to-day medical work.",
    logo: "/logos/prince-aly-khan-hospital.svg",
  },
  {
    // not in the latest source: title, company and year only
    id: "aiesec",
    role: "VP of Technology",
    company: "AIESEC",
    org: "AIESEC",
    dates: "2023",
    logo: "/logos/aiesec.jpeg",
  },
];

/** DOM id for an experience's anchor in whichever experience view is active. */
export const experienceAnchorId = (id: string) => `exp-${id}`;
