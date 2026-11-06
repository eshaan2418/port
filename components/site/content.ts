import { experiences } from "@/data/experiences";

/** the experience entries on the normal website, in data order (VEX Robotics has hideOnWebsite) */
export const roles = experiences.filter((e) => !e.hideOnWebsite);
export const isInternship = (company: string) => company.endsWith(" · Internship");
