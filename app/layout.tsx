import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Manrope } from "next/font/google";
import { site } from "@/data/site";
import { Analytics } from "@/components/Analytics";
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

const description = "Eshaan Kapooswalla's portfolio.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description,
  authors: [{ name: site.name, url: site.github }],
  openGraph: {
    type: "website",
    title: site.name,
    description,
    siteName: site.name,
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
        {/* before first paint, on / only: honour ?view= (and reduced motion), so the chooser, the list or the
            city's cover shows straight away with nothing jumping into place; also clears the old saved pick */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{try{localStorage.removeItem("site-mode")}catch(e){}if(location.pathname!=="/")return;var q=new URLSearchParams(location.search),v=q.get("view"),d=document.documentElement.dataset;if(q.has("choose"))return;if(v==="agent"){location.replace("/agent/");return}if(v==="list"||(!v&&matchMedia("(prefers-reduced-motion: reduce)").matches))d.initialView="list";else if(v==="city")d.initialView="city"}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <div className="grain" aria-hidden="true" />
        <Analytics />
      </body>
    </html>
  );
}
