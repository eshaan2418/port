/**
 * Extracurriculars: only the facts given in the brief (no years, orgs,
 * titles, record categories or numbers beyond these words and the 200+
 * AWS members). The 3D tower, the list view and the agent view read this.
 */
export type Extracurricular = {
  id: string;
  label: string;
  facts: string[];
  /** optional source / site link */
  link?: string;
};

export const extracurriculars: Extracurricular[] = [
  { id: "records", label: "hall of records", facts: ["world champion, martial arts", "Guinness World Records holder"], link: "" }, // add a source link here later
  { id: "dojo", label: "dojo", facts: ["martial arts", "world champion"] },
  { id: "rink", label: "the rink", facts: ["speed inline roller skater", "loves ice skating"] },
  { id: "brain", label: "brain gym", facts: ["ICPC", "competitive programming", "math"] },
  {
    id: "aws",
    label: "aws community hall",
    facts: ["AWS Student Builder Groups (formerly Cloud Club)", "200+ member cloud community"],
    link: "https://awsyorkucloud.com/",
  },
];

/** the short list for the normal website's extracurriculars card (exactly these facts) */
export const extracurricularHighlights = [
  "world champion in martial arts",
  "Guinness World Records holder",
  "speed inline roller skater",
  "ice skating",
  "ICPC",
  "competitive programming",
  "math",
  "AWS Student Builder Groups",
];
