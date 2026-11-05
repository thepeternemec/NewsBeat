# Local Git hooks

NewsBeat installs these hooks through the root `prepare` script during `npm ci` or `npm install`.

| Hook | Purpose |
| --- | --- |
| [pre-commit](pre-commit) | Builds the shared packages and API to catch compilation errors before a commit |
| [pre-push](pre-push) | Rejects non-fast-forward updates to `main` to protect published history |

Run commands from the repository root. The full build and tests remain separate checks:

```bash
npm run build
npm test
```

See [Contributing](../CONTRIBUTING.md) for the pull-request workflow and [Development](../docs/DEVELOPMENT.md) for local setup.
