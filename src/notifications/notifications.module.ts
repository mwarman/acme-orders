import { Module } from '@nestjs/common';
import { DispatcherService } from './dispatcher.service.js';
import { OutboxRepository } from './outbox.repository.js';

@Module({
  providers: [OutboxRepository, DispatcherService],
  exports: [OutboxRepository, DispatcherService],
})
export class NotificationsModule {}
