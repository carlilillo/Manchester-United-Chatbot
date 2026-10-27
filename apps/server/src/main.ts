import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { env } from './config/env';
import { PersistenceService } from './services/persistence.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: env().CLIENT_ORIGIN, credentials: true });
  app.use(cookieParser(env().COOKIE_SECRET));
  app.enableShutdownHooks();
  await app.get(PersistenceService).setup();
  await app.listen(env().PORT);
}
bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
