import { ImageResponse } from "next/og";
import BrandMark from "@/components/site/brand-mark";

export const alt = "Rarebird — Meaningful signals for AI agents.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "62px 74px",
        color: "#f9f9f9",
        backgroundColor: "#0b0b0b",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <BrandMark size={52} />
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 5 }}>RAREBIRD</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
        <span style={{ fontSize: 18, color: "#bbbbbb", letterSpacing: 2 }}>
          AGENT INTELLIGENCE
        </span>
        <span style={{ marginTop: 22, fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          Meaningful signals.
        </span>
        <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          Built for agents.
        </span>
        <span style={{ marginTop: 26, fontSize: 24, color: "#bbbbbb" }}>
          From reported changes to context worth understanding.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          paddingTop: 23,
          borderTop: "1px solid #404040",
          color: "#b3b3b3",
          fontSize: 18,
        }}
      >
        <span>News foundation live · Intelligence ahead</span>
        <span>www.newsbeat.dev</span>
      </div>
    </div>,
    size,
  );
}

