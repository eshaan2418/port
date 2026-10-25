import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/agent";

export const dynamic = "force-static";

// everyone, humans and agents, is welcome everywhere
export default function robots(): MetadataRoute.Robots {
  // a Sitemap line must be an absolute URL, so it's only added when the domain is known at build time
  return { rules: [{ userAgent: "*", allow: "/" }], ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}) };
}
