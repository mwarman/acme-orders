import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { seedIfEmpty } from './seed.js';

/**
 * Owns the SQLite connection. Creates the schema and seeds reference data on
 * first start. DB_PATH=':memory:' gives every Nest app instance a fresh database.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Database.Database;

  constructor() {
    const path = process.env.DB_PATH ?? 'data/acme-orders.db';
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.db = new Database(path);
    this.db.pragma('foreign_keys = ON');
    this.db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    seedIfEmpty(this.db);
  }

  /** Run fn atomically. Throwing rolls back. Nested calls become savepoints. */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  onModuleDestroy(): void {
    this.db.close();
  }
}
