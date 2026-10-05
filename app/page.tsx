import { TownShell } from "@/components/town/TownShell";
import { ListView } from "@/components/list/ListView";

export default function Home() {
  return (
    <main>
      <TownShell list={<ListView />} />
    </main>
  );
}
