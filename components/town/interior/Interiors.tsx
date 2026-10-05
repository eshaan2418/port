"use client";

import { useTown } from "../state";
import { HomeInterior } from "./HomeInterior";
import { ExperienceInterior } from "./experience/ExperienceInterior";
import { ProjectsInterior } from "./projects/ProjectsInterior";
import { ExtracurricularsInterior } from "./extracurriculars/ExtracurricularsInterior";
import { EducationInterior } from "./education/EducationInterior";

/**
 * Home's dollhouse is always mounted (the intro opens in it); a tower's
 * interior only exists while you're inside it.
 */
export function Interiors() {
  const interior = useTown((s) => s.interior);
  return (
    <>
      <HomeInterior />
      {interior === "experience" && <ExperienceInterior />}
      {interior === "projects" && <ProjectsInterior />}
      {interior === "extracurriculars" && <ExtracurricularsInterior />}
      {interior === "education" && <EducationInterior />}
    </>
  );
}
