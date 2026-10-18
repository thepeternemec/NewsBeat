/**
 * The API must serve every route anything advertises.
 *
 * `/v2/brief` shipped without appearing in the agent guide; `newsgraph_stories`
 * shipped with no handler; `/connect` told developers to import a package that
 * had been deleted. All three are the same defect at different layers: a promise
 * made in prose that nothing verified.
 *
 * The first version of this file kept a hard-coded copy of the documented routes
 * and described it as "exactly what AGENTS.md says". Nothing read AGENTS.md, so
 * the list was a second source of truth that could drift from the first — the
 * same mistake the guard was supposed to catch.
 *
 * It now derives the list from the documents themselves, and checks the site's
 * prose too, because that is where the deleted-SDK promise lived.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import app from "../index.js";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const served = () => app.routes.map((r) => ({ method: r.method, path: r.path }));

/** Any `/v2/foo` or `/mcp` or `/health` an author wrote down. */
const routePattern = /\/(?:v\d\/[a-z]+|mcp|health)\b/g;

/** Documents a client is expected to read and act on. */
const ADVERTISING = ["AGENTS.md", "README.md", "apps/web/public/llms.txt", "apps/web/public/skill.md"];

/** Pages whose prose and samples tell a developer what to call. */
const SITE = [
  "apps/web/app/(site)/docs/connect/page.tsx",
  "apps/web/app/(site)/docs/quickstart/page.tsx",
  "apps/web/app/(site)/docs/connect/page.tsx",
  "apps/web/app/(site)/connect/page.tsx",
  "apps/web/app/(site)/docs/page.tsx",
];

test("every route the docs advertise is served", () => {
  const routes = served();
  const paths = new Set(routes.map((r) => r.path));
  const reported = new Set<string>();

  for (const file of ADVERTISING) {
    const text = read(file);
    // A doc naming /v2/x means a client will call /api/v2/x.
    for (const mention of text.match(routePattern) ?? []) {
      if (reported.has(mention)) continue;
      // `/v2/topics` in prose maps to the mounted `/v2/topics`.
      const mounted = paths.has(mention) || paths.has(`/api${mention}`);
      if (!mounted) reported.add(mention);
    }
  }

  assert.deepEqual(
    [...reported],
    [],
    `these routes are advertised but not mounted: ${[...reported].join(", ")}`,
  );
});

test("every route the site's samples call is served", () => {
  const paths = new Set(served().map((r) => r.path));
  const missing = new Set<string>();

  for (const file of SITE) {
    let text: string;
    try {
      text = read(file);
    } catch {
      continue; // a page that does not exist is caught elsewhere
    }
    for (const mention of text.match(routePattern) ?? []) {
      if (!paths.has(mention) && !paths.has(`/api${mention}`)) missing.add(`${mention} (${file})`);
    }
  }

  assert.deepEqual([...missing], [], `the site calls routes that do not exist: ${[...missing].join(", ")}`);
});

test("no sample imports a package that does not exist", () => {
  // `/connect` told developers to `import { NewsGraphClient } from "@newsgraph/sdk"`
  // for weeks after that package was deleted. It is the most damaging kind of
  // stale doc: the reader copies it, gets a resolution error, and concludes the
  // project is broken rather than the sample.
  // Dependencies live per workspace, not at the root — `react` and
  // `lucide-react` are installed by apps/web. Checking only the root package
  // reported them as missing, which is a guard failing on working code.
  const WORKSPACES = ["apps/api", "apps/web", "apps/worker", "packages/contracts", "packages/db"];
  const installed = new Set<string>();
  for (const dir of [".", ...WORKSPACES]) {
    try {
      const pkg = JSON.parse(read(`${dir}/package.json`)) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]) {
        installed.add(name);
      }
    } catch {
      /* not a package */
    }
  }

  // Workspace package names, read from the workspaces themselves.
  const workspacePkg = (dirs: string[]) => {
    const names = new Set<string>();
    for (const dir of dirs) {
      try {
        names.add((JSON.parse(read(`${dir}/package.json`)) as { name: string }).name);
      } catch {
        /* not a package */
      }
    }
    return names;
  };
  const local = workspacePkg(WORKSPACES);

  const bare = (spec: string) =>
    !spec.startsWith(".") && !spec.startsWith("@/") && !spec.startsWith("node:");

  const offenders = new Set<string>();
  for (const file of [...SITE, ...ADVERTISING]) {
    let text: string;
    try {
      text = read(file);
    } catch {
      continue;
    }
    for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = match[1]!;
      if (!bare(spec)) continue;
      // "@scope/pkg/sub" resolves against the package, so trim to two segments.
      const name = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
      if (!installed.has(name) && !local.has(name)) offenders.add(`${name} (${file})`);
    }
  }

  assert.deepEqual(
    [...offenders],
    [],
    `these samples import packages that are not installed or not in the workspace: ${[...offenders].join(", ")}`,
  );
});

test("every public route is mentioned in the docs", () => {
  // The reverse direction, and the one that was missing. The guards above check
  // that a route someone wrote down exists; nothing checked that a route that
  // exists was written down. `/v2/stories` — the story clustering, the thing
  // that makes a 118-article topic readable — appeared in no docs page at all.
  // SITE only, not ADVERTISING. `/v2/stories` was in AGENTS.md and therefore
  // "documented" while appearing in no page a human reads — so a developer
  // browsing the docs would never find the story clustering at all. The agent
  // guide is not the human documentation.
  const onSite = new Set<string>();
  for (const file of SITE) {
    try {
      for (const mention of read(file).match(routePattern) ?? []) onSite.add(mention);
    } catch {
      /* absent file is another test's problem */
    }
  }

  const undocumented: string[] = [];
  for (const route of served()) {
    if (!route.path.startsWith("/v2/")) continue;
    // `/api/v2/x` and `/v2/x` are the same public route written two ways.
    const bare = route.path.replace(/^\/api/, "");
    if (!onSite.has(bare)) undocumented.push(route.path);
  }

  assert.deepEqual(
    undocumented,
    [],
    `these routes are served but appear on no docs page: ${undocumented.join(", ")}`,
  );
});

/** POST is allowed only where a request body is the whole point, and writes nothing. */
const POST_READS = new Set(["/v2/watch"]);

test("the public routes write nothing", () => {
  // The contract is read-only. A mutating verb appearing here would be a product
  // change, not a refactor. `/v2/watch` is a POST because fifty cursors do not fit
  // in a URL — it reads, and the allowlist is explicit so the next one has to be
  // argued for rather than assumed.
  for (const route of served()) {
    if (!route.path.startsWith("/v2/")) continue;
    if (POST_READS.has(route.path)) {
      assert.equal(route.method, "POST", `${route.path} is in the POST allowlist but served as ${route.method}`);
      continue;
    }
    assert.equal(route.method, "GET", `${route.path} is served as ${route.method}`);
  }
});

test("the advertising documents name at least the core routes", () => {
  // A guard that passes because every document is empty is the vacuous shape
  // this repository keeps producing. This asserts the documents still discuss
  // the surface at all.
  for (const file of ADVERTISING) {
    const mentions = read(file).match(routePattern) ?? [];
    assert.ok(mentions.length > 0, `${file} names no API routes at all`);
  }
});
