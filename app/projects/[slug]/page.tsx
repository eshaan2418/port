import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { caseStudySlugs, projects } from "@/data/projects";
import { Footer } from "@/components/Footer";

// Placeholder case-study pages for the featured projects. Fill in later.
export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return project
    ? { title: `${project.name} case study`, description: project.description }
    : {};
}

export default async function CaseStudy({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug && p.featured);
  if (!project) notFound();

  return (
    <>
      <main className="min-h-[100svh] bg-cream">
        <div className="mx-auto max-w-[1100px] px-6 pt-10 pb-28 md:px-10">
          <Link href="/#projects" className="micro-label text-muted transition-colors hover:text-ink">
            ← Back to projects
          </Link>
          <p className="micro-label mt-24 text-muted">Case study · coming soon</p>
          <h1 className="mt-6 font-display text-[clamp(3.5rem,9vw,8rem)] leading-[0.9] lowercase">
            {project.name}
          </h1>
          <p className="mt-8 max-w-[60ch] text-lg leading-relaxed text-ink/80">
            {project.description}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.75rem] tracking-[0.12em] text-muted uppercase">
            {project.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-12 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-medium text-cream transition-colors hover:bg-orange hover:text-ink"
          >
            View on GitHub ↗
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
