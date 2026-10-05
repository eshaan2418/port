/**
 * Single source of truth for experience content.
 * Order here is the display order everywhere (newest first): hero list,
 * 3D ribbon path, mobile stack and the reduced-motion list.
 */

export type ExperienceType =
  | "internship"
  | "research"
  | "community"
  | "founding"
  | "developer"
  | "leadership";

export type ExperienceLink = {
  label: string;
  href: string;
};

export type Experience = {
  id: string;
  year: number;
  company: string;
  /** Short label used everywhere (hero list, 3D cards, indexes). Do not expand. */
  role: string;
  /** Body text on the 3D gift-tag card. */
  summary: string;
  location: string;
  type: ExperienceType;
  /** Path under /public. Replace the file to swap a logo; no code change needed. */
  logo: string;
  link?: ExperienceLink;
};

export const experiences: Experience[] = [
  {
    id: "cohere",
    year: 2027,
    company: "Cohere",
    role: "Member of Technical Staff",
    summary:
      "Forward Deployed Engineer internship, Toronto. Incoming Winter 2027.",
    location: "Toronto",
    type: "internship",
    logo: "/logos/cohere.png",
  },
  {
    id: "wealthsimple",
    year: 2026,
    company: "Wealthsimple",
    role: "Engineering",
    summary: "Internship, Toronto. Incoming Fall 2026.",
    location: "Toronto",
    type: "internship",
    logo: "/logos/wealthsimple.jpeg",
  },
  {
    id: "shopify",
    year: 2026,
    company: "Shopify",
    role: "Engineering",
    summary:
      "Machine Learning Engineer internship, Toronto. User Recommendations team: improving search relevance and recommendation accuracy for large-scale product discovery. Search Relevance team: building production systems in C++ and Python to optimize ranking and retrieval pipelines.",
    location: "Toronto",
    type: "internship",
    logo: "/logos/shopify.svg",
  },
  {
    id: "vector-institute",
    year: 2026,
    company: "Vector Institute",
    role: "Researcher",
    summary:
      "Machine Learning Researcher (volunteer), Toronto. Developed SAGE-KV, an entropy-calibrated sparse attention mechanism that reduced Transformer decode latency by dynamically routing queries to local, global, and semantic KV-cache pages while minimizing unnecessary GPU memory reads. Designed a Python/C++/CUDA prototype and benchmarking framework comparing sparse attention against dense, sliding-window, static sparse, and FlashAttention-style baselines (p50/p90/p99 latency, fallback rate, bandwidth, retrieval quality).",
    location: "Toronto",
    type: "research",
    logo: "/logos/vector-institute.jpeg",
    link: {
      label: "View research paper →",
      href: "https://drive.google.com/file/d/1vsVoP_sBgLqXQblE80stIUYyOGJpyLm8/view",
    },
  },
  {
    id: "aws-sbg",
    year: 2025,
    company: "Amazon Web Services (SBG)",
    role: "Founder & Captain",
    summary:
      "Founded and scaled a 200+ member cloud engineering community (AWS Student Builder Groups, prev. Cloud Club, at York University). Led hands-on AWS workshops and built a strong builder culture on campus.",
    location: "York University, Toronto",
    type: "community",
    logo: "/logos/aws-sbg.svg",
    link: {
      label: "awsyorkucloud.com →",
      href: "https://awsyorkucloud.com/",
    },
  },
  {
    id: "mali",
    year: 2025,
    company: "Mali",
    role: "Founding Engineer",
    summary:
      "Founding Machine Learning Software Engineer, remote. Built and deployed PyTorch-based ML pipelines. Worked on distributed training and model optimization workflows.",
    location: "Remote",
    type: "founding",
    logo: "/logos/mali.svg",
  },
  {
    id: "yu-blueprint",
    year: 2025,
    company: "YU Blueprint",
    role: "Engineering",
    summary:
      "Machine Learning Software Developer, Toronto. Developing ML-driven applications for nonprofit organizations. Contributing to scalable full-stack systems using React and Django.",
    location: "Toronto",
    type: "developer",
    logo: "/logos/yu-blueprint.png",
  },
  {
    id: "itreb-canada",
    year: 2024,
    company: "ITREB Canada",
    role: "Engineering",
    summary:
      "Software Engineer internship, Toronto (hybrid). Built Spring Boot microservices and secure REST APIs. Improved system architecture and frontend/backend integration.",
    location: "Toronto (hybrid)",
    type: "internship",
    logo: "/logos/itreb-canada.jpeg",
  },
  {
    id: "prince-aly-khan-hospital",
    year: 2023,
    company: "Prince Aly Khan Hospital",
    role: "Engineering",
    summary:
      "Software Engineer internship, remote. Developed secure healthcare workflow solutions. Built responsive React interfaces with strong data compliance.",
    location: "Remote",
    type: "internship",
    logo: "/logos/prince-aly-khan-hospital.svg",
  },
  {
    id: "aiesec",
    year: 2023,
    company: "AIESEC",
    role: "VP of Technology",
    summary:
      "Vice President of Technology, remote. Led technical initiatives supporting global exchange programs. Contributed to web systems and event infrastructure.",
    location: "Remote",
    type: "leadership",
    logo: "/logos/aiesec.jpeg",
  },
];

/** DOM id for an experience's anchor in whichever experience view is active. */
export const experienceAnchorId = (id: string) => `exp-${id}`;
