import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository.js';

const KNOWN_EVENTS = ['order.placed', 'order.paid', 'refund.approved', 'refund.failed'];

/** Drains the outbox and logs one line per event (NTF-2). No real email in this course. */
@Injectable()
export class DispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Notifications');
  private timer?: NodeJS.Timeout;

  constructor(private readonly outbox: OutboxRepository) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.timer = setInterval(() => this.drain(), Number(process.env.OUTBOX_POLL_MS ?? 2000));
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** Returns how many events were processed. */
  drain(): number {
    const events = this.outbox.pending();
    for (const event of events) {
      try {
        this.deliver(event.type, event.payload);
      } catch (error) {
        this.logger.error(`Event ${event.id} (${event.type}) failed: ${String(error)}`);
      }
      this.outbox.mark(event.id, 'SENT');
    }
    return events.length;
  }

  private deliver(type: string, payload: string): void {
    if (!KNOWN_EVENTS.includes(type)) {
      throw new Error(`Unknown event type '${type}'`);
    }
    this.logger.log(`${type} ${payload}`);
  }
}
