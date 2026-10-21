import { Hono } from "hono";
import { db, hasDatabaseEnv } from "@newsbeat/db";
import {
  SEED_BEATS,
  type OperationComponent,
  type OperationSnapshot,
} from "@newsbeat/contracts";
import {
  atomFeed,
  ingestionComponent,
  overall,
  statusDocument,
} from "./operations-policy.js";

// Fixed targets prevent callers from turning the monitor into a URL fetch proxy.
const ORIGIN = "https://www.newsbeat.dev";
const NVIDIA = "b_bb964843350e";
type Json = Record<string, unknown>;
async function requestJson(path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${ORIGIN}${path}`, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Probe request failed");
  return (await response.json()) as Json;
}
async function probe(
  id: "api" | "mcp",
  name: string,
  check: () => Promise<void>,
): Promise<OperationComponent> {
  const start = Date.now();
  try {
    await check();
    return {
      id,
      name,
      status: "operational",
      detail:
        id === "api"
          ? "A real news request returned headlines and a follow-up cursor."
          : "Initialization and a news tool call succeeded.",
      latency_ms: Date.now() - start,
    };
  } catch {
    // Public output deliberately excludes upstream bodies, URLs and exception text.
    return {
      id,
      name,
      status: "outage",
      detail:
        "The scheduled request failed or did not return the expected response.",
      latency_ms: Date.now() - start,
    };
  }
}

/** Only the authenticated production cron calls this writer. Bootstrap is additive. */
export async function runOperationalCheck(): Promise<OperationSnapshot> {
  const sql = db();
  await sql`create table if not exists public.newsbeat_operation_checks (
    slot timestamptz primary key,
    checked_at timestamptz not null,
    report jsonb not null
  )`;
  const [api, mcp, ingestion] = await Promise.all([
    probe("api", "News API", async () => {
      const data = await requestJson(`/api/v2/news?beat_id=${NVIDIA}`);
      if (
        !Array.isArray(data.items) ||
        typeof data.cursor !== "string" ||
        !data.freshness
      )
        throw new Error("Invalid news response");
    }),
    probe("mcp", "Agent connection (MCP)", async () => {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };
      const initialized = await requestJson("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "newsbeat-status", version: "1.0" },
          },
        }),
      });
      const init = initialized.result as Json | undefined;
      if (!init?.serverInfo || typeof init.protocolVersion !== "string")
        throw new Error("Initialization failed");
      const called = await requestJson("/api/mcp", {
        method: "POST",
        headers: { ...headers, "MCP-Protocol-Version": init.protocolVersion },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: { name: "newsbeat_brief", arguments: { beat_id: NVIDIA } },
        }),
      });
      const result = called.result as Json | undefined;
      const content = result?.content as
        | Array<{ type: string; text?: string }>
        | undefined;
      const payload =
        result?.structuredContent ??
        (content?.[0]?.text ? JSON.parse(content[0].text) : null);
      if (
        result?.isError ||
        !payload ||
        !Array.isArray((payload as Json).items)
      )
        throw new Error("News tool failed");
    }),
    (async (): Promise<OperationComponent> => {
      try {
        const rows = await sql<
          Array<{
            beat_id: string;
            last_success_at: Date | null;
            last_checked_at: Date | null;
          }>
        >`select beat_id, last_success_at, last_checked_at from public.news_ingestion_status`;
        return ingestionComponent(SEED_BEATS, rows);
      } catch {
        return {
          id: "ingestion",
          name: "News collection",
          status: "outage",
          detail: "News collection records could not be read.",
        };
      }
    })(),
  ]);
  const report: OperationSnapshot = {
    checked_at: new Date().toISOString(),
    status: overall([api, mcp, ingestion]),
    components: [api, mcp, ingestion],
  };
  const slot = new Date(
    Math.floor(Date.parse(report.checked_at) / 300_000) * 300_000,
  ).toISOString();
  await sql`insert into public.newsbeat_operation_checks (slot, checked_at, report) values (${slot}, ${report.checked_at}, ${JSON.stringify(report)}::jsonb) on conflict (slot) do nothing`;
  await sql`delete from public.newsbeat_operation_checks where slot < now() - interval '45 days'`;
  return report;
}

export async function readOperationStatus() {
  if (!hasDatabaseEnv()) return statusDocument([], Date.now(), false);
  try {
    const rows = await db()<
      Array<{ report: OperationSnapshot }>
    >`select report from public.newsbeat_operation_checks order by slot desc limit 48`;
    return statusDocument(rows.map((row) => row.report));
  } catch (error) {
    // Before the first scheduled run, the table has not been bootstrapped yet.
    return statusDocument(
      [],
      Date.now(),
      (error as { code?: string }).code === "42P01",
    );
  }
}

export const operationRoutes = new Hono();
operationRoutes.get("/", async (c) => {
  const document = await readOperationStatus();
  c.header("Cache-Control", "public, max-age=0, s-maxage=30");
  return c.json(document, document.monitoring === "unavailable" ? 503 : 200);
});
operationRoutes.get("/feed", async (c) => {
  const document = await readOperationStatus();
  c.header("Content-Type", "application/atom+xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=0, s-maxage=30");
  return c.body(
    atomFeed(document),
    document.monitoring === "unavailable" ? 503 : 200,
  );
});
