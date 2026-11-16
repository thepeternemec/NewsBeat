import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";
import { ForecastWorkspace } from "@/components/site/market-briefing";

export const metadata = {
  title: "Hourly crypto forecasts | Rarebird",
  description: "Inspect Rarebird’s experimental BTC and ETH forecasts, the historical base rate, and the results after each target close.",
  alternates: { canonical: "/app/forecasts" },
};

export default function ForecastsPage() {
  return <WorkspaceShell active="/app/forecasts" title="Hourly crypto forecasts"
    description="See the current BTC and ETH move-risk estimates, the data behind them and how previous forecasts scored.">
    <WorkspaceEvidence title="What goes into a forecast?">
      <p>Rarebird uses closed Kraken spot candles. The move-risk model compares recent volatility with similar historical hours and blends that rate with the base rate.</p>
      <p>Open “Forecast evidence and results” for the sample size, target close and probability error. Move risk and direction have separate scorecards.</p>
      <a href="/api/v2/forecasts">View the live API response</a>
    </WorkspaceEvidence>
    <ForecastWorkspace />
  </WorkspaceShell>;
}
