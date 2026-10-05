import { site } from "@/data/site";

export function Footer() {
  return (
    <footer data-theme="dark" className="bg-ink text-cream">
      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-10">
        <p className="micro-label text-muted-dark">© 2026 {site.name}</p>
      </div>
    </footer>
  );
}
