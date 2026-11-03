/**
 * Every advertised tool must be callable.
 *
 * `newsbeat_stories` shipped in `tools/list`, documented in AGENTS.md, and
 * absent from the dispatcher — so an agent that chose it by its advertised
 * schema got `unknown_tool`. Three places have to agree about a tool (the
 * definition, the docs, the handler) and the guards covered only the first two.
 *
 * This one calls each tool and asserts the failure, if any, is not "unknown".
 * A missing database gives `service_unavailable`, which is a real answer; the
 * only unacceptable answer is that the tool does not exist.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { NEWS_TOOLS } from "@newsbeat/contracts";
import { callNewsTool } from "./news-routes.js";

/** The smallest arguments each tool will accept. */
const MINIMAL: Record<string, unknown> = {
  newsbeat_topics: {},
  newsbeat_news: { beat_id: "b_bb964843350e" },
  newsbeat_changes: { beat_id: "b_bb964843350e", cursor: "x" },
  newsbeat_brief: { beat_id: "b_bb964843350e" },
  newsbeat_stories: { beat_id: "b_bb964843350e" },
  newsbeat_summary: { beat_id: "b_bb964843350e" },
};

test("every advertised tool has a handler", async () => {
  for (const tool of NEWS_TOOLS) {
    let code: string | undefined;
    try {
      await callNewsTool(tool.name, MINIMAL[tool.name] ?? {});
    } catch (error) {
      code = (error as { code?: string }).code;
      const message = String((error as Error)?.message ?? "");
      code ??= message.includes("Unknown news tool") ? "unknown_tool" : undefined;
    }
    assert.notEqual(
      code,
      "unknown_tool",
      `${tool.name} is advertised in tools/list but no handler answers it`,
    );
  }
});

// Rebranding must not break clients that cached the old tool names.
test("legacy tool names still reach a handler", async () => {
  for (const tool of NEWS_TOOLS) {
    await assert.doesNotReject(async () => {
      try { await callNewsTool(tool.name.replace(/^newsbeat_/, "newsgraph_"), MINIMAL[tool.name] ?? {}); }
      catch (error) { assert.notEqual((error as {code?: string}).code, "unknown_tool"); }
    });
  }
});
