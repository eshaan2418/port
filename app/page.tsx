import { TownShell } from "@/components/town/TownShell";
import { ListView } from "@/components/list/ListView";
import { PersonJsonLd } from "@/components/JsonLd";
import { existingProjectImages } from "@/lib/project-images";

/**
 * Everything is server-rendered here: the mode chooser is an overlay on top
 * and the full list-view content is always in the HTML (for crawlers and
 * screen readers), whichever mode ends up showing.
 */
export default function Home() {
  return (
    <main>
      <PersonJsonLd />
      <TownShell list={<ListView />} projectImages={existingProjectImages()} />
    </main>
  );
}
