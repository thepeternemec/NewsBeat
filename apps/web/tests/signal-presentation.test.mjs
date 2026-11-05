import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function compile(path, stubs = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const module = { exports: {} };
  const scoped = id => id.endsWith(".css") ? {} : Object.hasOwn(stubs, id) ? stubs[id] : require(id);
  new Function("require", "module", "exports", outputText)(scoped, module, module.exports);
  return module.exports;
}
const presentation = compile("../components/site/signal-presentation.ts");
const { presentTiming } = presentation;
const Panel = compile("../components/site/quantitative-panel.tsx", { "./signal-presentation": presentation }).default;

test("plain-language presentation cannot upgrade a held or stale decision", () => {
  assert.equal(presentTiming().state, "hold");
  assert.equal(presentTiming({ phase: "developing", action: "review_now" }).state, "review");
  assert.equal(presentTiming({ phase: "developing", action: "review_now" }, true).state, "hold");
  assert.equal(presentTiming({ phase: "developing", action: "keep_watching" }).state, "watch");
  assert.equal(presentTiming({ phase: "data_hold", action: "review_now" }).state, "hold");
  assert.equal(presentTiming({ phase: "developing", action: "no_alert" }).state, "outside");
});
test("waiting, extended and opposing evidence stay distinct in the readable view", () => {
  for (const phase of ["data_hold", "analysis_hold", "inactive", "liquidity_hold"]) assert.equal(presentTiming({ phase, action: "keep_watching" }).state, "hold");
  for (const phase of ["old_information", "unconfirmed", "extended", "fading"]) assert.equal(presentTiming({ phase, action: "keep_watching" }).state, "watch");
  for (const phase of ["diverging", "invalidated"]) assert.equal(presentTiming({ phase, action: "reassess" }).state, "reassess");
});

const at = "2026-11-05T12:00:00Z";
const window = { minutes: 30, start_at: at, end_at: at, asset_return: .0123, benchmark_return: .005, residual_return: .0073, residual_z: 1.4 };
const fit = { beta: 1.2, intercept: 0, r_squared: .5, samples: 240, start_at: at, end_at: at };
const decision = { phase: "unconfirmed", action: "keep_watching", evaluated_at: at, reason: "Directional residual 73 bp / 1.4 residual sigma.", context_id: "fundamentals", policy_version: "market-timing-v1", source_signal_id: "signal", signal_version: 1, direction: "supportive", delta: { kind: "new_development", previous_version: null, current_version: 1, new_report_count: 5, description: "New reported development.", known_at: at }, recent_window: window, event_window: null, fit, volume_ratio: 2.4, checks: [{ id: "information_delta", passed: true, reason: "Fresh." }, { id: "post_information_response", passed: false, reason: "Waiting." }], alert_id: null };
const market = { status: "ready", instrument: { symbol: "NVDAx/USD", underlying_ticker: "NVDA", kind: "tokenized_equity", venue: "kraken", mapping_url: "https://example.com/pair" }, curve: [], benchmark: { label: "QQQx/USD", methodology: "Venue proxy." }, windows: [window], fit, volume_ratio: 2.4, quality: [], limitations: ["Research estimates."], observed_at: at, last_trade_at: at, book: { spread_bps: 4, buy_impact_bps: 2, sell_impact_bps: 2 } };
const bundle = { market, evaluations: [], evaluation: { observations: 17, alerts: 0, horizons: [], review_horizons: [], note: "Prospective observations." }, policy_version: "market-timing-v1" };

test("the default panel explains the decision and keeps exact numbers in a closed disclosure", () => {
  const html = renderToStaticMarkup(createElement(Panel, { bundle, decision }));
  const boundary = html.indexOf('<details class="quant-technical">');
  assert.ok(boundary > 0);
  const readable = html.slice(0, boundary).replace(/<[^>]+>/g, " ");
  assert.match(readable, /The story needs more confirmation/);
  assert.ok(!readable.includes("73 bp"));
  assert.ok(!readable.includes("1.23%"));
  assert.ok(!readable.includes("Estimated β"));
  assert.ok(html.slice(boundary).includes("1.23%"), "exact observations remain available on demand");
  assert.ok(!/<details class="quant-technical"[^>]*\bopen\b/.test(html));
  assert.ok(html.includes('href="/docs/intelligence"'));
});
test("a stale panel cannot display a current review outcome", () => {
  const html = renderToStaticMarkup(createElement(Panel, { bundle, decision: { ...decision, phase: "developing", action: "review_now" }, readStale: true }));
  const readable = html.slice(0, html.indexOf('<details class="quant-technical">')).replace(/<[^>]+>/g, " ");
  assert.match(readable, /Get a fresh view first/);
  assert.ok(!readable.includes("Review now"));
});
