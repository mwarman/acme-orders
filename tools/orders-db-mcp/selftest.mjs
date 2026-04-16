#!/usr/bin/env node
// Self-test: starts the server over stdio and checks tools, results, and the read-only guarantee.
// Uses its own throwaway database, so it needs no setup. Run: npm test
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Database from 'better-sqlite3';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(path.join(tmpdir(), 'orders-db-mcp-'));
const dbPath = path.join(dir, 'test.db');

const setup = new Database(dbPath);
setup.exec("CREATE TABLE t (a INTEGER, b TEXT); INSERT INTO t VALUES (1,'x'),(2,'y'),(3,'z');");
setup.close();

const client = new Client({ name: 'selftest', version: '1.0.0' });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.join(here, 'server.mjs')],
    env: { ...process.env, DB_PATH: dbPath },
    stderr: 'ignore',
  }),
);

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures++;
};
const call = (name, args = {}) => client.callTool({ name, arguments: args });
const textOf = (result) => result.content.map((c) => c.text).join('\n');

const { tools } = await client.listTools();
check('exposes exactly list_tables, describe_table, query', tools.map((t) => t.name).sort().join() === 'describe_table,list_tables,query', tools.map((t) => t.name).join());

const tables = await call('list_tables');
check('list_tables reports the table and its row count', !tables.isError && JSON.parse(textOf(tables))[0]?.rows === 3, textOf(tables));

const described = await call('describe_table', { table: 't' });
check('describe_table returns columns', !described.isError && JSON.parse(textOf(described)).length === 2, textOf(described));
check('describe_table rejects an unknown table', (await call('describe_table', { table: 'nope"; DROP TABLE t; --' })).isError === true);

const rows = await call('query', { sql: 'SELECT * FROM t ORDER BY a' });
check('query returns rows', !rows.isError && JSON.parse(textOf(rows)).rowCount === 3, textOf(rows));
const capped = JSON.parse(textOf(await call('query', { sql: 'SELECT * FROM t', max_rows: 2 })));
check('query honours max_rows and reports truncation', capped.rowCount === 2 && capped.truncated === true);

const attacks = {
  'INSERT is refused': "INSERT INTO t VALUES (9,'evil')",
  'DELETE is refused': 'DELETE FROM t',
  'DROP is refused': 'DROP TABLE t',
  'PRAGMA is refused': 'PRAGMA journal_mode = DELETE',
  'WITH ... INSERT is refused': 'WITH x AS (SELECT 9, 1) INSERT INTO t SELECT * FROM x',
  // These start with WITH and return rows, so the statement-type checks let them through.
  // Only the engine-level read-only connection stops them.
  'WITH ... INSERT ... RETURNING is refused': 'WITH x AS (SELECT 9 AS a, 1 AS b) INSERT INTO t SELECT a, b FROM x RETURNING *',
  'WITH ... UPDATE ... RETURNING is refused': "WITH x AS (SELECT 1) UPDATE t SET b = 'evil' RETURNING *",
  'WITH ... DELETE ... RETURNING is refused': 'WITH x AS (SELECT 1) DELETE FROM t RETURNING *',
  'a second statement is refused': 'SELECT 1; DROP TABLE t',
  'a comment-prefixed write is refused': '/* hi */ -- hello\nDELETE FROM t',
};
for (const [label, sql] of Object.entries(attacks)) {
  check(label, (await call('query', { sql })).isError === true);
}

await client.close();
const verify = new Database(dbPath, { readonly: true });
const count = verify.prepare('SELECT COUNT(*) AS n FROM t').get().n;
verify.close();
check('the data is unchanged after all attacks', count === 3, `rows=${count}`);

rmSync(dir, { recursive: true, force: true });
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
