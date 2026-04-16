#!/usr/bin/env node
// Read-only SQLite MCP server for the acme-orders course (lab M7).
//
// Safety design: read-only is enforced by the database engine (the connection is opened
// readonly) and by checks in code. It is NOT enforced by tool descriptions or prompts.
// Everything in the database is visible to whoever can call these tools, including the
// fake customer emails in the `customers` table.
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Database from 'better-sqlite3';
import { z } from 'zod';

const MAX_ROWS = 200;
const dbPath = process.env.DB_PATH ?? path.resolve(import.meta.dirname, '../../data/acme-orders.db');

let db;
try {
  db = new Database(dbPath, { readonly: true, fileMustExist: true });
} catch (error) {
  // stdout belongs to the MCP protocol. Diagnostics go to stderr.
  console.error(`orders-db: cannot open ${dbPath}: ${error.message}. Run "npm run db:reset" first.`);
  process.exit(1);
}

const asText = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});
const asError = (message) => ({ isError: true, content: [{ type: 'text', text: message }] });

const tableNames = () =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);

const server = new McpServer({ name: 'orders-db', version: '1.0.0' });

server.registerTool(
  'list_tables',
  { description: 'List the tables in the orders database, with row counts.' },
  async () => asText(tableNames().map((name) => ({ table: name, rows: db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n }))),
);

server.registerTool(
  'describe_table',
  {
    description: 'Show the columns of one table.',
    inputSchema: { table: z.string().describe('Table name, as returned by list_tables') },
  },
  async ({ table }) => {
    if (!tableNames().includes(table)) {
      return asError(`Unknown table '${table}'. Call list_tables first.`);
    }
    return asText(db.prepare(`PRAGMA table_info("${table}")`).all());
  },
);

server.registerTool(
  'query',
  {
    description: `Run one read-only SELECT (or WITH ... SELECT) statement. Returns at most ${MAX_ROWS} rows.`,
    inputSchema: {
      sql: z.string().describe('A single SELECT statement'),
      max_rows: z.number().int().min(1).max(MAX_ROWS).optional().describe(`Row limit, default ${MAX_ROWS}`),
    },
  },
  async ({ sql, max_rows }) => {
    const withoutComments = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!/^(select|with)\b/i.test(withoutComments)) {
      return asError('Only SELECT statements are allowed.');
    }
    const limit = max_rows ?? MAX_ROWS;
    try {
      const statement = db.prepare(sql); // throws if the text holds more than one statement
      if (!statement.reader) {
        return asError('That statement does not return rows, so it was not run.');
      }
      const rows = [];
      for (const row of statement.iterate()) {
        rows.push(row);
        if (rows.length > limit) break;
      }
      const truncated = rows.length > limit;
      return asText({ rowCount: Math.min(rows.length, limit), truncated, rows: rows.slice(0, limit) });
    } catch (error) {
      return asError(`SQL error: ${error.message}`);
    }
  },
);

await server.connect(new StdioServerTransport());
console.error(`orders-db: serving ${dbPath} (read-only)`);
