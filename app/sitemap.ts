import type { MetadataRoute } from "next";
import { url } from "@/lib/agent";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/agent/", "/agent.md", "/llms.txt", "/llms-full.txt", "/agent.json"].map((p) => ({ url: url(p) }));
}
