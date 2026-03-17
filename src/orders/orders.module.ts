import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PricingAdapter } from '../legacy/pricing/pricing.adapter.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [CatalogModule, CustomersModule, InventoryModule, PaymentsModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, PricingAdapter],
  exports: [OrdersService],
})
export class OrdersModule {}
