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
        {/* decide "list view" before first paint (?view=list, reduced motion), so the list doesn't jump into place after hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var v=new URLSearchParams(location.search).get("view");if(v==="list"||(v!=="city"&&matchMedia("(prefers-reduced-motion: reduce)").matches))document.documentElement.dataset.initialView="list"}catch(e){}`,
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
