import { experiences } from "@/data/experiences";
import { projects } from "@/data/projects";
import { extracurriculars } from "@/data/extracurriculars";
import { education } from "@/data/education";
import { site } from "@/data/site";

/**
 * The agent-facing content, built only from the /data files (one source of
 * truth, nothing added): used by /agent, /agent.json, /agent.md,
 * /llms-full.txt, /llms.txt and the JSON-LD.
 */

/** absolute base URL if NEXT_PUBLIC_SITE_URL is set at build time, else "" (root-relative links) */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
export const url = (path: string) => `${siteUrl}${path}`;

export const MACHINE_FILES = [
  { path: "/agent/", type: "text/html", title: "Agent version (HTML, no scripts needed)" },
  { path: "/agent.md", type: "text/markdown", title: "Full content in Markdown" },
  { path: "/llms-full.txt", type: "text/plain", title: "Full content in Markdown (llms-full.txt)" },
  { path: "/agent.json", type: "application/json", title: "Structured data (JSON)" },
  { path: "/llms.txt", type: "text/plain", title: "Index for LLMs" },
] as const;

export function agentData() {
  return {
    name: site.name,
    subtitle: site.subtitle,
    contact: { email: site.email, linkedin: site.linkedin, github: site.github },
    experience: experiences.map((e) => ({
      role: e.role,
      company: e.company,
      dates: e.dates,
      ...(e.line ? { line: e.line } : {}),
      ...(e.link ? { link: { label: e.link.label.replace(/\s*→\s*$/, ""), url: e.link.href } } : {}),
    })),
    projects: projects.map((p) => ({ name: p.name, description: p.description, github: p.repoUrl })),
    extracurriculars: extracurriculars.map((x) => ({ name: x.label, facts: x.facts, ...(x.link ? { link: x.link } : {}) })),
    education: {
      school: education.school,
      faculty: education.faculty,
      ...Object.fromEntries(education.details.map(([k, v]) => [k.toLowerCase(), v])),
    },
  };
}

export function agentMarkdown() {
  const d = agentData();
  const out: string[] = [];
  out.push(`# ${d.name}`, "", d.subtitle, "");
  out.push(`- Email: ${d.contact.email}`, `- LinkedIn: ${d.contact.linkedin}`, `- GitHub: ${d.contact.github}`, "");
  out.push("## Experience", "", "Newest first.", "");
  for (const e of d.experience) {
    out.push(`### ${e.role} @ ${e.company} (${e.dates})`);
    if ("line" in e && e.line) out.push("", e.line);
    if ("link" in e && e.link) out.push("", `- ${e.link.label}: ${e.link.url}`);
    out.push("");
  }
  out.push("## Projects", "");
  for (const p of d.projects) {
    out.push(`### ${p.name}`, "", p.description, "", `- GitHub: ${p.github}`, "");
  }
  out.push("## Extracurriculars", "");
  for (const x of d.extracurriculars) {
    out.push(`- ${x.name}: ${x.facts.join("; ")}${"link" in x && x.link ? ` (${x.link})` : ""}`);
  }
  out.push("", "## Education", "", `${d.education.school}, ${d.education.faculty}`, "");
  for (const [k, v] of education.details) out.push(`- ${k}: ${v}`);
  out.push("");
  return out.join("\n");
}

export function llmsTxt() {
  const d = agentData();
  return [
    `# ${d.name}`,
    "",
    `> ${d.name}'s portfolio: experience, projects, extracurriculars and education.`,
    "",
    "## Machine-readable versions",
    "",
    ...MACHINE_FILES.map((f) => `- [${f.title}](${url(f.path)})`),
    "",
    "## Human versions",
    "",
    `- [Normal website](${url("/?view=list")})`,
    `- [3D city (free roam)](${url("/?view=city")})`,
    "",
    "## Contact",
    "",
    `- [Email](mailto:${d.contact.email})`,
    `- [LinkedIn](${d.contact.linkedin})`,
    `- [GitHub](${d.contact.github})`,
    "",
  ].join("\n");
}

/** schema.org Person (only facts from /data; no location, no job title) */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    email: `mailto:${site.email}`,
    ...(siteUrl ? { url: `${siteUrl}/` } : {}),
    affiliation: { "@type": "CollegeOrUniversity", name: education.school, department: { "@type": "Organization", name: education.faculty } },
    sameAs: [site.linkedin, site.github],
  };
}
