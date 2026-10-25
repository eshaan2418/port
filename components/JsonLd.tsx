import { personJsonLd } from "@/lib/agent";

/** schema.org Person, server-rendered into the page */
export function PersonJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()).replace(/</g, "\\u003c") }} />;
}
