import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { buildMoveRisk, isLargeMove, moveRiskHistory } from "../apps/api/dist/lib/move-risk.js";

const BAR = 300_000;
const HOUR = 12 * BAR;
const DAY = 24 * HOUR;
const [venue, directory, from, to] = process.argv.slice(2);
if (!["kraken", "binance"].includes(venue) || !directory || !from || !to
  || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || Date.parse(from) >= Date.parse(to)) {
  throw new Error("Usage: node scripts/replay-move-risk.mjs <kraken|binance> <csv directory> <start YYYY-MM-DD> <end YYYY-MM-DD, exclusive>");
}

function loadBars(instrument) {
  const pattern = venue === "kraken" ? new RegExp(`^(?:kraken-\\d+-)?${instrument}_5[.]csv$`) : new RegExp(`^${instrument}-5m-\\d{4}-\\d{2}[.]csv$`);
  const rows = new Map();
  for (const file of readdirSync(directory).filter(name => pattern.test(name))) {
    for (const line of readFileSync(join(directory, file), "utf8").trim().split(/\r?\n/)) {
      const [stamp, open, high, low, close, volume, ...fields] = line.split(",").map(Number);
      const time = venue === "kraken" ? stamp * 1000 : stamp >= 1e15 ? stamp / 1000 : stamp;
      const trades = fields[venue === "kraken" ? 0 : 2];
      if (time % BAR !== 0 || ![open, high, low, close].every(price => Number.isFinite(price) && price > 0)
        || !Number.isFinite(volume) || volume < 0 || !Number.isInteger(trades) || trades < 0) throw new Error("Invalid market row in " + basename(file));
      const item = { time, open, high, low, close, volume, trades };
      if (rows.has(time) && JSON.stringify(rows.get(time)) !== JSON.stringify(item)) throw new Error("Conflicting candle in " + basename(file));
      rows.set(time, item);
    }
  }
  if (!rows.size) throw new Error("No candles found for " + instrument);
  return [...rows.values()].sort((a, b) => a.time - b.time);
}

const average = (rows, read) => rows.length ? rows.reduce((sum, row) => sum + read(row), 0) / rows.length : null;

function blockInterval(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const id = Math.floor(row.at / (7 * DAY));
    const block = grouped.get(id) ?? { n: 0, difference: 0 };
    block.n++;
    block.difference += row.baselineLoss - row.modelLoss;
    grouped.set(id, block);
  }
  const blocks = [...grouped.values()];
  if (blocks.length < 8) return null;
  let seed = 42013;
  const samples = Array.from({ length: 4000 }, () => {
    let sum = 0, n = 0;
    for (const _ of blocks) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      const draw = blocks[seed % blocks.length];
      sum += draw.difference;
      n += draw.n;
    }
    return sum / n;
  }).sort((a, b) => a - b);
  return [samples[100], samples[3899]];
}

const instruments = venue === "kraken" ? ["XBTUSD", "ETHUSD"] : ["BTCUSDT", "ETHUSDT"];
for (const instrument of instruments) {
  const bars = loadBars(instrument);
  const history = moveRiskHistory(bars);
  const test = [];
  const eligible = [];
  const prior = [];
  for (let at = Math.ceil(bars[0].time / HOUR) * HOUR; at < Date.parse(to); at += HOUR) {
    while (prior.length && prior[0].at < at - 30 * DAY) prior.shift();
    const start = history.byTime.get(at - BAR), previousHour = history.byTime.get(at - HOUR - BAR);
    const target = history.byTime.get(at + HOUR - BAR), entry = history.byTime.get(at + 2 * BAR);
    const direction = start && previousHour && target && entry && start.trades && previousHour.trades && target.trades && entry.trades;
    if (at >= Date.parse(from)) {
      const call = buildMoveRisk(history, at, at + 8 * 60_000, "https://example.com");
      if (call && target?.trades > 0) {
        const event = Number(isLargeMove(call.reference_price_usd, target.close));
        test.push({ at, event, p: call.probability, base: call.baseline_probability,
          modelLoss: (call.probability - event) ** 2, baselineLoss: (call.baseline_probability - event) ** 2 });
      }
      if (direction && prior.length >= 240) {
        const trend = start.close >= previousHour.close;
        const matched = prior.filter(row => row.trend === trend);
        const base = (prior.reduce((sum, row) => sum + row.up, 0) + 1) / (prior.length + 2);
        const p = (matched.reduce((sum, row) => sum + row.up, 0) + 20 * base) / (matched.length + 20);
        if (p >= 0.55) eligible.push(target.close / entry.open - 1);
      }
    }
    if (direction) prior.push({ at, trend: start.close >= previousHour.close, up: Number(target.close > start.close) });
  }
  const alerts = test.filter(row => row.p >= 0.10 && row.p - row.base >= 0.03);
  console.log(JSON.stringify({
    venue, instrument, from, to, assessed: test.length, eventRate: average(test, x => x.event),
    modelBrier: average(test, x => x.modelLoss), baselineBrier: average(test, x => x.baselineLoss),
    pairedBrierImprovementBlock95: blockInterval(test),
    riskWatch: { hours: alerts.length, eventRate: average(alerts, x => x.event), meanForecast: average(alerts, x => x.p) },
    directionScenario: { trades: eligible.length, meanGrossBps: average(eligible, x => x * 1e4),
      costSensitivity: [20, 50, 100, 160].map(cost => ({ costBps: cost, meanNetBps: average(eligible, x => x * 1e4 - cost) })) },
  }));
}
