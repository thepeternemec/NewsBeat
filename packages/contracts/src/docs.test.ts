/**
 * Docs drift guards.
 *
 * Every stale claim found on 2026-09-18 was wrong for weeks and broke no test:
 * the catalog said four topics three catalogs after it grew, the landing sold a
 * price card while /pricing said none existed, and a documented field was always
 * empty because the provider stopped returning it. None of that is a code error,
 * so nothing failed — the docs simply stopped being true.
 *
 * These tests assert claims against the code. They cannot check prose, but they
 * can check the things prose is most likely to get wrong: a count, a list, and a
 * field somebody is told to read.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { SEED_BEATS, NEWS_TOOLS } from "./index.js";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const ROOT = "../../../";

const agents = read(`${ROOT}AGENTS.md`);
const status = read(`${ROOT}docs/STATUS.md`);
const readme = read(`${ROOT}README.md`);
// Files an agent is expected to fetch and act on. `auth.md` is the registration
// protocol's own front door and `skill.md` is the integration guide — both listed
// four of five tools while AGENTS.md listed five, and nothing compared them.
const authMd = read(`${ROOT}apps/web/public/auth.md`);
const skillMd = read(`${ROOT}apps/web/public/skill.md`);

/** Every doc that states the size of the catalog. */
// `llms.txt` is the file an agent fetches first, and it said "+1000 topics" until
// someone read it — a round number that had been wrong for three catalog changes.
// It is a count source now, so it cannot drift again.
const llms = read(`${ROOT}apps/web/public/llms.txt`);
const COUNT_SOURCES: Array<[string, string, RegExp]> = [
  ["AGENTS.md", agents, /\*\*([\d,]+) topics\*\*/],
  ["docs/STATUS.md", status, /\*\*([\d,]+) topics\*\*/],
  ["apps/web/public/llms.txt", llms, /([\d,]+) assets covered/],
];

test("every stated catalog size matches the catalog", () => {
  for (const [name, text, pattern] of COUNT_SOURCES) {
    const match = text.match(pattern);
    assert.ok(match, `${name} no longer states a catalog size — update this test if that is deliberate`);
    assert.equal(
      Number(String(match[1]).replace(/,/g, "")),
      SEED_BEATS.length,
      `${name} says ${match[1]} topics, the catalog has ${SEED_BEATS.length}`,
    );
  }
});

test("every command the contributor guide gives exists", () => {
  // CONTRIBUTING.md described "contracts -> db -> sdk -> realtime -> api -> worker
  // -> bots -> web", an app/(app) route group, a treasury, deposit verification and
  // /v1/catalog. None of it existed. A new contributor following it would have
  // concluded the repository was broken rather than the document.
  const guide = read(`${ROOT}CONTRIBUTING.md`);
  const pkg = JSON.parse(read(`${ROOT}package.json`)) as { scripts: Record<string, string> };
  const scripts = new Set(Object.keys(pkg.scripts));

  // "npm run x" resolves against the root; "npm run x -w pkg" against that
  // workspace. Checking only the root would reject correct workspace commands,
  // which is how this guard first failed on its own guide.
  const commands = [...guide.matchAll(/npm run ([a-z:]+)(?:\s+-w\s+([a-z@/.-]+))?/g)];
  assert.ok(commands.length > 0, "the guide should tell someone how to run something");

  for (const [, script, workspace] of commands) {
    if (!workspace) {
      assert.ok(scripts.has(script!), `CONTRIBUTING.md says \`npm run ${script}\`, which does not exist`);
      continue;
    }
    const known: Record<string, string> = {
      "blacksheep-worker": "apps/worker",
      "@blacksheep/api": "apps/api",
      "blacksheep-web": "apps/web",
      "@blacksheep/contracts": "packages/contracts",
      "@blacksheep/db": "packages/db",
    };
    const dir = known[workspace!];
    assert.ok(dir, `CONTRIBUTING.md references unknown workspace \`${workspace}\``);
    const pkgJson = JSON.parse(read(`${ROOT}${dir}/package.json`)) as { scripts: Record<string, string> };
    assert.ok(
      script! in pkgJson.scripts,
      `CONTRIBUTING.md says \`npm run ${script} -w ${workspace}\`, which does not exist`,
    );
  }
});

test("sample responses quote the real catalog size", () => {
  // A sample copied from a live response goes stale the moment the catalog
  // grows, and a reader comparing their own response to the docs concludes
  // something is broken. `article_count` moves every fifteen minutes and cannot
  // be guarded; the catalog total can.
  for (const file of ["apps/web/app/(site)/docs/quickstart/page.tsx"]) {
    const text = read(`${ROOT}${file}`);
    for (const match of text.matchAll(/"total":\s*(\d+)/g)) {
      assert.equal(
        Number(match[1]!.replace(/,/g, "")),
        SEED_BEATS.length,
        `${file} shows "total": ${match[1]} in a sample; the catalog has ${SEED_BEATS.length}`,
      );
    }
  }
});

test("the tool table in auth.md lists every tool", () => {
  // A union check cannot catch a file being incomplete — `auth.md` listed four of
  // five tools while `skill.md` happened to mention the fifth, so "every tool is
  // named somewhere" passed. `auth.md` carries a table of the tools, which is a
  // promise that the table is the complete set.
  for (const tool of NEWS_TOOLS) {
    assert.ok(
      authMd.includes(tool.name),
      `apps/web/public/auth.md does not list ${tool.name}; agents read this file first`,
    );
  }
});

test("the published floor is a floor", () => {
  // Marketing copy says "+1000 topics covered" rather than naming the exact
  // count, because a number printed on a landing page is a number that goes
  // stale. A floor only goes stale if the catalog *shrinks* below it, which is
  // the thing worth failing on — and the exact counts stay in STATUS.md and
  // AGENTS.md, where the count guard above watches them.
  const MARKETING = ["apps/web/public/llms.txt", "apps/web/public/auth.md"];
  for (const file of MARKETING) {
    const text = readFileSync(fileURLToPath(new URL(`${ROOT}${file}`, import.meta.url)), "utf8");
    if (!text.includes("+1000 topics")) continue;
    assert.ok(
      SEED_BEATS.length > 2000,
      `${file} advertises "+1000 topics" but the catalog holds ${SEED_BEATS.length}`,
    );
  }
});

test("the docs name the tools, and every tool they name exists", () => {
  // This started as a one-way check and was vacuous: no doc mentioned a tool at
  // all, so the loop never ran and the guard could not fail. It now asserts both
  // directions — an agent guide that names no tools is as broken as one that
  // names a tool the server does not have.
  const defined = new Set<string>(NEWS_TOOLS.map((t) => t.name));
  const seen = new Set<string>();
  for (const [name, text] of [
    ["AGENTS.md", agents],
    ["README.md", readme],
    ["docs/STATUS.md", status],
    ["apps/web/public/auth.md", authMd],
    ["apps/web/public/skill.md", skillMd],
  ] as const) {
    for (const mentioned of text.match(/blacksheep_[a-z_]+/g) ?? []) {
      seen.add(mentioned);
      assert.ok(defined.has(mentioned), `${name} mentions ${mentioned}, which is not a defined tool`);
    }
  }
  assert.ok(seen.size > 0, "no doc names a single tool — the agent guide should list them");
  for (const tool of defined) {
    assert.ok(seen.has(tool), `${tool} exists but no doc tells an agent to call it`);
  }
});

test("no doc describes the pre-Google-News item shape", () => {
  // Google News returns a headline, a link, a publisher and a time. It returns
  // no excerpt and no publisher URL, and both were documented for weeks after
  // the provider changed — the quickstart even showed an "excerpt" field in its
  // example payload that is always empty.
  const FORBIDDEN: Array<[string, RegExp]> = [
    ["a publisher URL", /publisher('s)? URL/i],
    ["an excerpt", /\bexcerpt\b/i],
    ["capped ledes", /ledes? capped/i],
  ];
  for (const [name, text] of [["AGENTS.md", agents], ["docs/STATUS.md", status], ["README.md", readme]] as const) {
    for (const [what, pattern] of FORBIDDEN) {
      assert.equal(pattern.test(text), false, `${name} still describes ${what}, which the API does not return`);
    }
  }
});

test("no doc still describes a catalog of four topics", () => {
  // The specific drift that started this: the catalog went 4 -> 148 -> 540 and
  // the docs kept naming NVIDIA, Bitcoin, Tesla and the oil price.
  for (const [name, text] of [["AGENTS.md", agents], ["docs/STATUS.md", status], ["README.md", readme]] as const) {
    // Specific to the claim, not to the phrase. A bare `/four topics/` flagged
    // "four topics carry no articles" — a true sentence — as the old
    // "the catalog holds four topics". A guard that fires on true statements
    // teaches people to ignore it.
    const claimsFour = /(catalog[^.]{0,48}four topics)|(four topics[^.]{0,32}catalog)|(holds? four topics)|(four topics exist)/i;
    assert.equal(claimsFour.test(text), false, `${name} still describes a four-topic catalog`);
    assert.equal(
      /NVIDIA, Bitcoin, Tesla/.test(text),
      false,
      `${name} still lists the four-topic catalog`,
    );
  }
});

test("the docs and the catalog agree about what is in it", () => {
  const crypto = SEED_BEATS.filter((b) => b.asset === "crypto");
  const equity = SEED_BEATS.filter((b) => b.asset !== "crypto");

  // Crypto was removed once and restored on purpose. Both halves are now part of
  // the product, and a doc that describes only one of them is the same drift in
  // either direction — which is exactly what the four-topic guard caught.
  assert.ok(equity.length > 500, `expected a full equity catalog, found ${equity.length}`);
  assert.ok(crypto.length >= 90, `expected ~100 crypto topics, found ${crypto.length}`);
  assert.ok(SEED_BEATS.length > 2000, `expected past 2000 topics, found ${SEED_BEATS.length}`);

  for (const [name, text] of [["AGENTS.md", agents], ["docs/STATUS.md", status], ["README.md", readme]] as const) {
    if (!/\b\d{3,4} topics\b/.test(text)) continue;
    assert.equal(
      /all US-listed equities|equity-only/i.test(text),
      false,
      `${name} claims the catalog is equities only, but it holds ${crypto.length} crypto assets`,
    );
  }
});
