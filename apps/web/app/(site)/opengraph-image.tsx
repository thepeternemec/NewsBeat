import { ImageResponse } from "next/og";
import BrandMark from "@/components/site/brand-mark";

export const alt = "NewsBeat — The news behind stocks and crypto.";
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
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 5 }}>NEWSBEAT</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
        <span style={{ fontSize: 18, color: "#bbbbbb", letterSpacing: 2 }}>
          THE NEWS FEED FOR AI AGENTS
        </span>
        <span style={{ marginTop: 22, fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          The news behind
        </span>
        <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          stocks and crypto.
        </span>
        <span style={{ marginTop: 26, fontSize: 24, color: "#bbbbbb" }}>
          Recent headlines. Clear updates. Every source linked.
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
        <span>MCP + API · Free to try</span>
        <span>www.newsbeat.dev</span>
      </div>
    </div>,
    size,
  );
}

