# Setup and pre-work (about 30 minutes)

You must pass the smoke test **before the first session**. Setup problems are the biggest time sink in live classes.

## 1. Open the project in its dev container

You need one of:

- **VS Code + Docker.** Install Docker Desktop (or an equivalent engine) and the "Dev Containers" extension, open this folder, and choose *Reopen in Container*.
- **GitHub Codespaces.** Create a codespace from the repository. No local install needed.

The first build takes a few minutes. When it finishes, the container has Node.js 24.22.1, project dependencies, a local database, and Claude Code.

## 2. Connect Claude Code to a model

Pick the route your organization uses (ask your instructor if unsure).

| Route | What to do inside the container terminal |
|---|---|
| **Claude subscription or Console account** | Run `claude`, choose the sign-in option, and complete the browser step. |
| **API key** | `export ANTHROPIC_API_KEY=<your key>` then run `claude`. |
| **Amazon Bedrock** | `export CLAUDE_CODE_USE_BEDROCK=1`, `export AWS_REGION=<region>`, and make AWS credentials available (for example `aws sso login`, standard `AWS_*` variables, or a Bedrock API key). Alternatively run `claude` and choose *3rd-party platform*, then *Amazon Bedrock*. |

Keep keys out of the repository. The local `.env` file is for this app's fake settings only.

## 3. Run the smoke test

```bash
bash .devcontainer/smoke-test.sh --auth
```

All lines must say `PASS`. The `--auth` flag makes one small request to confirm Claude Code can reach a model.

If a check fails, copy the output into the pre-work channel your instructor gave you.

## Commands you will use

| Command | Purpose |
|---|---|
| `npm run test` | Run all tests |
| `npm run lint` | Static analysis |
| `npm run typecheck` | Type check, no output files |
| `npm run build` | Production build |
| `npm run dev` | Run the API with reload on port 3000 |
| `npm run db:reset` | Recreate the local database |
| `bash scripts/demo-data.sh` | Add sample orders (start `npm run dev` first) |

## Corporate networks

If your network inspects traffic or requires a proxy, tell your instructor in advance. The container needs access to the npm registry, `claude.ai` (for the installer, at build time), and your model provider.
