# Contributing to NewsBeat

Thanks for helping build NewsBeat. We are developing an open-source intelligence layer for AI agents, and contributions of every size are welcome.

You can help with code, documentation, accessibility, asset matching, source quality or research evaluation. You do not need to be a market expert to improve someone's first experience.

## Find a starting point

- **Trying NewsBeat?** Tell us where setup, a response or a signal was confusing.
- **New to the codebase?** Start with a documentation fix, a small UI improvement or a reproducible bug.
- **Working on intelligence?** Read the [product direction](docs/INTELLIGENCE.md) and [quantitative methodology](docs/QUANTITATIVE.md).
- **Proposing a larger change?** [Open an issue](https://github.com/thepeternemec/NewsBeat/issues/new/choose) or [discussion](https://github.com/thepeternemec/NewsBeat/discussions) so we can agree on the approach.

## Set up your workspace

Use Node.js 22 or 24 and npm:

```bash
git clone https://github.com/thepeternemec/NewsBeat.git
cd NewsBeat
npm ci
npm run build
npm test
npm run dev
```

The website and API share one Next.js process at http://localhost:3000. The standard build and tests do not require a database or provider credentials.

For local news data, PostgreSQL, environment setup and ingestion, follow [DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Make a pull request

1. Create a branch from current `main` and keep the change focused.
2. Explain the problem and the behavior your change produces.
3. Run the checks relevant to the change. Add a regression test for behavior that needs protecting.
4. Update affected documentation, tool descriptions or shared contracts.
5. Open a pull request with validation results. Include screenshots for visible interface changes.

Use a clear, descriptive title, such as **“Explain pending market confirmation”** or **“Add an API quickstart example.”**

Documentation-only changes usually need a link and rendering check. Code changes should pass:

```bash
npm run build
npm test
```

CI also runs intelligence and ingestion integration tests against disposable PostgreSQL. Follow the workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) when changing persistence behavior. Main-branch CI additionally verifies the deployed public read path.

## Project conventions

- **Keep claims grounded.** Match documentation and UI copy to the implemented behavior. Distinguish available features, research pilots and planned work.
- **Keep evidence visible.** Preserve source links, publication times, collection freshness and uncertainty.
- **Use shared contracts.** Public response and tool schemas belong in `packages/contracts`. Keep schemas, handlers and [AGENTS.md](AGENTS.md) aligned.
- **Preserve identifiers.** Existing `beat_id` values and cursor behavior are part of the integration contract.
- **Respect the evidence boundary.** News items contain headline metadata. Briefs preserve original headlines; generated summaries and interpretations must be labeled and source-grounded.
- **Treat timing as research.** A review alert needs its applicable evidence and market checks. Do not lower gates to force alerts or imply proven returns.
- **Use the NewsBeat brand.** The public palette is black, white and grey. See the [brand guide](brand/README.md).
- **Keep secrets local.** Use development credentials and ignored environment files.

## Where to make changes

| Area | Start here |
| --- | --- |
| Website and accessibility | `apps/web` |
| REST, MCP and intelligence | `apps/api` |
| Collection and filtering | `apps/worker` |
| Schemas, tool definitions and catalog | `packages/contracts` |
| Database access and metering | `packages/db` and `db` |
| Examples and documentation | `examples` and `docs` |

Local [Git hooks](.githooks/README.md) check compilation and help protect published history. GitHub CI is the shared verification record.

## Report a bug

Include what you expected, what happened, steps to reproduce and the relevant asset, URL or tool. For a news or signal issue, include the source and timestamp. Redact credentials and private account details.

Report exploitable security issues privately using [SECURITY.md](SECURITY.md).

## Community and license

Be constructive and kind. Follow the [code of conduct](CODE_OF_CONDUCT.md).

Contributions are accepted under the repository's [MIT license](LICENSE). No contributor license agreement is required.
