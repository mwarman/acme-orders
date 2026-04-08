import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { RefundsController } from './refunds.controller.js';
import { RefundsRepository } from './refunds.repository.js';
import { RefundsService } from './refunds.service.js';

@Module({
  imports: [OrdersModule, PaymentsModule, InventoryModule, NotificationsModule],
  controllers: [RefundsController],
  providers: [RefundsService, RefundsRepository],
})
export class RefundsModule {}
