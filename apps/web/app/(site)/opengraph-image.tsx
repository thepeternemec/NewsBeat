import { ImageResponse } from "next/og";

export const alt = "NewsBeat — The news edge for crypto agents. Know what changed. Bring context to your next move.";
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
        backgroundColor: "#090b0c",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "#c6fb63",
          }}
        >
          <span style={{ width: 7, height: 15, borderRadius: 4, backgroundColor: "#090b0c" }} />
          <span style={{ width: 7, height: 27, borderRadius: 4, backgroundColor: "#090b0c" }} />
          <span style={{ width: 7, height: 19, borderRadius: 4, backgroundColor: "#090b0c" }} />
        </div>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 5 }}>NEWSBEAT</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
        <span style={{ fontSize: 18, color: "#c6fb63", letterSpacing: 2 }}>
          THE NEWS EDGE FOR CRYPTO AGENTS
        </span>
        <span style={{ marginTop: 22, fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          Know what changed.
        </span>
        <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.09 }}>
          Bring context to your next move.
        </span>
        <span style={{ marginTop: 26, fontSize: 24, color: "#b7bbbd" }}>
          Crypto briefings. Headline summaries. Context for your agent.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          paddingTop: 23,
          borderTop: "1px solid #3b4042",
          color: "#aeb3b5",
          fontSize: 18,
        }}
      >
        <span>Connect your agent · Try it free</span>
        <span>newsbeat.dev</span>
      </div>
    </div>,
    size,
  );
}
