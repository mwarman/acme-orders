import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock.js';
import { DatabaseService } from '../db/database.service.js';

export type OutboxStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface OutboxEvent {
  id: number;
  type: string;
  payload: string;
  status: OutboxStatus;
  createdAt: string;
}

interface OutboxRow {
  id: number;
  type: string;
  payload: string;
  status: OutboxStatus;
  created_at: string;
}

@Injectable()
export class OutboxRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly clock: Clock,
  ) {}

  /** Call inside the same transaction as the business change (NTF-1). */
  add(type: string, payload: object): void {
    this.database.db
      .prepare('INSERT INTO outbox_events (type, payload, created_at) VALUES (?, ?, ?)')
      .run(type, JSON.stringify(payload), this.clock.now().toISOString());
  }

  pending(limit = 50): OutboxEvent[] {
    const rows = this.database.db
      .prepare("SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY id LIMIT ?")
      .all(limit) as OutboxRow[];
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  mark(id: number, status: OutboxStatus): void {
    this.database.db.prepare('UPDATE outbox_events SET status = ? WHERE id = ?').run(status, id);
  }

  all(): OutboxEvent[] {
    const rows = this.database.db.prepare('SELECT * FROM outbox_events ORDER BY id').all() as OutboxRow[];
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload,
      status: r.status,
      createdAt: r.created_at,
    }));
  }
}
