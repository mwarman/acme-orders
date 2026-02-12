import { rmSync } from 'node:fs';
import { DatabaseService } from './database.service.js';

/** `npm run db:reset`: delete the SQLite file and recreate it from schema + seed. */
try {
  process.loadEnvFile('.env');
} catch {
  // .env is optional
}
const path = process.env.DB_PATH ?? 'data/acme-orders.db';
if (path !== ':memory:') {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${path}${suffix}`, { force: true });
  }
}
const service = new DatabaseService();
service.onModuleDestroy();
console.log(`Database reset: ${path}`);
