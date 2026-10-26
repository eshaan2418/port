import { ImageResponse } from "next/og";

// Placeholder OG card in the palette. Swap for a designed image later by
// replacing this file with app/opengraph-image.png.
export const dynamic = "force-static"; // rendered once at build (static export)
export const alt = "Eshaan Kapooswalla's portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F6EFE3",
          color: "#121212",
          padding: 72,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 180, width: 36, background: "#F37021", display: "flex" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 462, height: 30, background: "#81D8D0", display: "flex" }} />
        <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase", display: "flex" }}>portfolio</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 128, lineHeight: 0.9, letterSpacing: -4 }}>
          <span>eshaan</span>
          <span>kapooswalla</span>
        </div>
        <div style={{ fontSize: 32, display: "flex" }}>CS @ York University</div>
      </div>
    ),
    size,
  );
}
