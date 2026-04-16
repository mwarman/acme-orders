# orders-db-mcp

A small, **read-only** [MCP](https://modelcontextprotocol.io) server over the local `acme-orders` SQLite database. It is used in lab M7. It runs on your machine as a child process of Claude Code and talks over stdin/stdout. It makes no network calls.

## Tools

| Tool | What it does |
|---|---|
| `list_tables` | Table names with row counts |
| `describe_table` | Columns of one table |
| `query` | Runs one `SELECT` (or `WITH ... SELECT`), up to 200 rows |

## Try it by hand

```bash
npm run db:reset                 # from the project root, if the database does not exist
bash scripts/demo-data.sh        # optional: adds a few orders (needs `npm run dev` running)
claude mcp add --transport stdio orders-db -- node "$(pwd)/tools/orders-db-mcp/server.mjs"
claude mcp list
```

Inside a Claude Code session, `/mcp` shows server status. Remove it with `claude mcp remove orders-db`.

To share it with a team instead, put it in a `.mcp.json` at the project root (project scope):

```json
{
  "mcpServers": {
    "orders-db": {
      "type": "stdio",
      "command": "node",
      "args": ["${CLAUDE_PROJECT_DIR}/tools/orders-db-mcp/server.mjs"]
    }
  }
}
```

Project-scoped servers ask each person for approval before they run. That prompt is a trust decision, not a formality.

## What can it see, and what stops it changing things?

- **It can see everything in the database**, including the fake customer names and emails. Anything it returns goes into the model's context.
- **Read-only is enforced by the database connection** (opened `readonly`), not by the tool descriptions and not by the SQL checks in the code. The code checks (statement must start with `SELECT` or `WITH`, must return rows, single statement) are a convenience. A statement such as `WITH ... INSERT ... RETURNING *` starts with `WITH` and returns rows, so the checks alone let it through. Only the engine-level flag stops it.
- `npm test` (in this folder) proves that: it tries several writes and bypass attempts and confirms the data is unchanged.

## Dependencies

Three pinned packages: `@modelcontextprotocol/sdk` 1.32.1, `zod` 4.6.6, `better-sqlite3` 13.0.3. Install scripts are disabled (`.npmrc`). The SDK also ships web-server dependencies that this stdio server never uses. Worth noticing when you review what you are about to run.

The MCP SDK has a newer 2.x line (separate `@modelcontextprotocol/server` package). This server uses the 1.x maintenance line.
