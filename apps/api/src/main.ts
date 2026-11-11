import 'dotenv/config'; // must be first: schemas read retention days at import time
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { loadConfig } from './config/configuration';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render / Railway sit behind a proxy: needed so rate limiting sees the real visitor IP.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // The widget runs inside an iframe on OUR web app, so only our web origin(s) call the API.
  // Which clinic websites may embed the widget is enforced in the web app (frame-ancestors).
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-key'],
  });

  // The API only serves JSON: stop browsers guessing content types, and never let a browser or proxy
  // cache responses (admin lists contain patient contact details).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.useBodyParser('json', { limit: '20kb' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  Logger.log(`API running on http://localhost:${config.port}`, 'Bootstrap');
}
bootstrap();
