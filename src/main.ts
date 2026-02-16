import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

function loadEnv(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env is optional; real environment variables still apply
  }
}

async function bootstrap(): Promise<void> {
  loadEnv();
  const app = await NestFactory.create(AppModule);
  const config = {
    port: Number(process.env.PORT ?? 3000),
    dbPath: process.env.DB_PATH ?? 'data/acme-orders.db',
    gatewayMode: process.env.FAKE_GATEWAY_MODE ?? 'normal',
    gatewayApiKey: process.env.GATEWAY_API_KEY,
  };
  new Logger('Bootstrap').log(`Resolved configuration: ${JSON.stringify(config)}`);
  await app.listen(config.port);
}

await bootstrap();
