import assert from "node:assert/strict";
import { test } from "node:test";
import type { ResearchEvidence } from "@newsbeat/contracts";
import { reasonAboutQuestion } from "./research-model.js";

const evidence: ResearchEvidence[] = [{
  id: "news:test", beat_id: "b_bb964843350e", kind: "report", text: "Nvidia reports stronger chip demand",
  source: "Example", url: "https://example.com", observed_at: "2026-11-07T12:00:00Z", freshness: "fresh",
}];
const input = (question: string) => ({ question, intent: "risk", context: "risk", assets: [], evidence, limitations: ["No current market measurements."] });
const answer = { answer: "Demand may support the business; the price reaction cannot be established.",
  reasoning: [{ kind: "interpretation", claim: "If demand converts into sales, it could support revenue. The evidence does not establish a market move.", evidence_ids: ["news:test"] }],
  unknowns: ["Whether expectations already reflect demand."], next_checks: ["Check guidance and identified venue measurements."] };
const response = (content: unknown, finish_reason = "stop") => new Response(JSON.stringify({ choices: [{ finish_reason, message: { content: JSON.stringify(content) } }] }), { status: 200 });

test("one bounded call returns validated reasoning and shares an evidence fingerprint", async () => {
  let calls = 0;
  const request: typeof fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens, 1600);
    assert.equal(JSON.parse(body.messages[1].content).evidence_scope.financial_statements, false);
    assert.equal(body.response_format.type, "json_schema");
    assert.ok(JSON.stringify(body.response_format.json_schema.schema).includes("news:test"));
    assert.deepEqual(body.response_format.json_schema.schema.properties.reasoning.items.properties.kind.enum, ["interpretation"]);
    assert.equal(body.messages[0].role, "system");
    assert.ok(init?.signal);
    return response(answer);
  };
  const requestInput = input("What could weaken the outlook for NVIDIA? cache-test");
  const [first, second] = await Promise.all([
    reasonAboutQuestion(requestInput, "test-credential", request),
    reasonAboutQuestion(requestInput, "test-credential", request),
  ]);
  assert.ok(first); assert.deepEqual(second, first); assert.equal(calls, 1);
});

test("provider failures, invalid claims and truncated output return no invented answer", async () => {
  const failed: typeof fetch = async () => new Response("", { status: 503 });
  assert.equal(await reasonAboutQuestion(input("provider-failed"), "test-credential", failed), null);
  const invalid: typeof fetch = async () => response({ ...answer, answer: "Shares will rally by 99%." });
  assert.equal(await reasonAboutQuestion(input("invalid-output"), "test-credential", invalid), null);
  const truncated: typeof fetch = async () => response(answer, "length");
  assert.equal(await reasonAboutQuestion(input("truncated-output"), "test-credential", truncated), null);
  const malformed: typeof fetch = async () => new Response("not json", { status: 200 });
  assert.equal(await reasonAboutQuestion(input("malformed-output"), "test-credential", malformed), null);
});

test("an unsupported figure gets one shared repair under the original deadline", async () => {
  const requests: Array<{ body: string; signal: RequestInit["signal"] }> = [];
  const request: typeof fetch = async (_url, init) => {
    requests.push({ body: String(init?.body), signal: init?.signal });
    return response(requests.length === 1 ? { ...answer, reasoning: [
      { ...answer.reasoning[0], claim: "Demand may support revenue growth of 5%." },
    ] } : answer);
  };
  const requestInput = input("What supports the NVIDIA outlook? repair test");
  const [first, second] = await Promise.all([
    reasonAboutQuestion(requestInput, "test-credential", request),
    reasonAboutQuestion(requestInput, "test-credential", request),
  ]);
  assert.deepEqual(first, answer);
  assert.deepEqual(second, answer);
  assert.equal(requests.length, 2);
  assert.ok(requests[0]?.signal);
  assert.equal(requests[0]?.signal, requests[1]?.signal);
  const initial = JSON.parse(requests[0]!.body);
  const repair = JSON.parse(requests[1]!.body);
  assert.match(repair.messages[0].content, /omit numeric details/i);
  assert.deepEqual(repair.messages[1], initial.messages[1]);
});

test("a failed repair remains rejected and every waiting caller receives the failure", async () => {
  let calls = 0;
  const request: typeof fetch = async () => {
    calls++;
    return response({ ...answer, answer: "Demand may improve by 5%." });
  };
  const errors: string[] = [];
  const requestInput = input("What supports the NVIDIA outlook? rejected repair test");
  const results = await Promise.all([1, 2].map(() =>
    reasonAboutQuestion(requestInput, "test-credential", request, error => errors.push(error))));
  assert.deepEqual(results, [null, null]);
  assert.deepEqual(errors, ["unsupported_answer_figure", "unsupported_answer_figure"]);
  assert.equal(calls, 2);
});
