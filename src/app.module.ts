import { type MiddlewareConsumer, Module, type NestModule, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { CommonModule } from './common/common.module.js';
import { HttpErrorFilter } from './common/http-error.filter.js';
import { IdentityMiddleware } from './common/identity.middleware.js';
import { CustomersModule } from './customers/customers.module.js';
import { DatabaseModule } from './db/database.module.js';

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: HttpErrorFilter },
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(IdentityMiddleware).forRoutes('*path');
  }
}
