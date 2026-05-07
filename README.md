# acme-orders

A small order-management and refunds service. It is the shared codebase for the hands-on labs in **Agentic Coding with Claude Code**, a virtual instructor-led course. The app is intentionally ordinary: realistic structure, uneven quality, and a few rough edges, so there is something real to explore, change and verify.

**Stack:** Node.js 24.22.1, NestJS 12 (ESM, Express), TypeScript (strict), SQLite via `better-sqlite3`, Vitest, oxlint.

## Quick start

1. Complete [docs/setup.md](docs/setup.md) (open the dev container, connect Claude Code, run the smoke test).
2. Run the API:

   ```bash
   npm run dev
   curl localhost:3000/health
   curl localhost:3000/catalog/products
   ```

3. Identify yourself with headers (no passwords in this course):

   ```bash
   curl -H 'x-user-id: cus_alice' -H 'x-user-role: customer' localhost:3000/orders
   ```

Seeded customers are `cus_alice`, `cus_bob` and `cus_carol`. Staff identities are any id with role `support` or `admin`.

## Commands

| Command | Purpose |
|---|---|
| `npm run test` | Run all tests |
| `npm run lint` | Static analysis |
| `npm run typecheck` | Type check, no output files |
| `npm run build` | Production build |
| `npm run dev` | Run with reload on port 3000 |
| `npm run db:reset` | Recreate the local database |

## Where to look

| | |
|---|---|
| [docs/product-requirements.md](docs/product-requirements.md) | The business rules and lifecycles |
| [docs/architecture.md](docs/architecture.md) | Modules and conventions |
| [docs/labs/](docs/labs/README.md) | Lab handouts and how to start each lab |
| [docs/claude-md-template.md](docs/claude-md-template.md) | A starting point for your own `CLAUDE.md` |
| [tools/orders-db-mcp/](tools/orders-db-mcp/README.md) | A read-only MCP server used in lab M7 |

## Notes

- `.npmrc` sets `ignore-scripts=true`. Dependencies install without running their install scripts.
- The payment gateway is a deterministic fake. Nothing here talks to a real payment provider.
- Fake credentials in `.env.example` are not real and are not shaped like real provider keys.

## License

Copyright 2026 Matthew Warman. Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
