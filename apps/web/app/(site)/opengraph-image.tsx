import { ImageResponse } from "next/og";
import { BrandWordmark } from "@/components/site/brand-mark";

export const alt = "Rarebird — Market intelligence for stocks and crypto";
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
      <BrandWordmark width={235} color="#F2F4F7" />

      <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
        <span style={{ fontSize: 18, color: "#bbbbbb", letterSpacing: 2 }}>
          MARKET INTELLIGENCE FOR STOCKS AND CRYPTO
        </span>
        <span style={{ marginTop: 22, fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          Find your edge.
        </span>
        <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          In either direction.
        </span>
        <span style={{ marginTop: 26, fontSize: 24, color: "#bbbbbb" }}>
          Find what changed. Check the evidence.
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
        <span>One app. One agent.</span>
        <span>RAREBIRD.NETWORK</span>
      </div>
    </div>,
    size,
  );
}

