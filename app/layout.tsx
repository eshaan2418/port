import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import { site } from "@/data/site";
import "./globals.css";

// titles · UI text · clocks, years and labels
const title = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

const ui = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const description =
  "Eshaan Kapooswalla: engineering + community builder in Toronto. Machine learning, distributed systems, and the communities around them.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: `${site.name} · engineering + community builder`,
    template: `%s · ${site.name}`,
  },
  description,
  authors: [{ name: site.name, url: site.github }],
  openGraph: {
    type: "website",
    title: site.name,
    description,
    siteName: site.name,
    locale: "en_CA",
  },
  twitter: { card: "summary_large_image", title: site.name, description },
  // the machine-readable versions (see lib/agent.ts)
  alternates: {
    types: {
      "text/markdown": "/agent.md",
      "application/json": "/agent.json",
      "text/plain": [
        { url: "/llms.txt", title: "llms.txt" },
        { url: "/llms-full.txt", title: "llms-full.txt" },
      ],
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#F6EFE3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${title.variable} ${ui.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* before first paint, on / only: honour ?view= / "remember my choice" (and reduced motion), so the
            chooser, the list or the city's cover shows straight away with nothing jumping into place */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(location.pathname!=="/")return;var q=new URLSearchParams(location.search),v=q.get("view"),c=q.has("choose"),s=null,d=document.documentElement.dataset;try{s=localStorage.getItem("site-mode")}catch(e){}if(c)return;if(v==="agent"||(!v&&s==="agent")){location.replace("/agent/");return}if(v==="list"||(!v&&s==="list")||(!v&&!s&&matchMedia("(prefers-reduced-motion: reduce)").matches))d.initialView="list";else if(v==="city"||(!v&&s==="town"))d.initialView="city"}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
