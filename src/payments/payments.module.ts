import { Module } from '@nestjs/common';
import { FakeGateway } from './fake-gateway.js';
import { GATEWAY_ADAPTER } from './gateway.adapter.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';

@Module({
  providers: [PaymentsService, PaymentsRepository, { provide: GATEWAY_ADAPTER, useClass: FakeGateway }],
  exports: [PaymentsService, GATEWAY_ADAPTER],
})
export class PaymentsModule {}
