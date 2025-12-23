// import { Logger, ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import { ConfigService } from '@nestjs/config';

// import { AppModule } from './app.module';
// import { setupSwagger } from './config/swagger.config';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule, {
//     // bufferLogs: true, // enable if you later add a custom logger
//   });

//   const config = app.get(ConfigService);
//   const logger = new Logger('Bootstrap');

//   // Global prefix (nice for versioning later)
//   app.setGlobalPrefix('api');

//   // CORS (allow your Flutter apps)
//   const corsOrigins = (config.get<string>('cors.origins') ?? '*')
//     .split(',')
//     .map((x) => x.trim())
//     .filter(Boolean);

//   app.enableCors({
//     origin: corsOrigins.includes('*') ? true : corsOrigins,
//     credentials: true,
//   });

//   // Global validation (real production safety)
//   app.useGlobalPipes(
//     new ValidationPipe({
//       transform: true,
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transformOptions: { enableImplicitConversion: true },
//     }),
//   );

//   // Swagger (only if enabled)
//   const swaggerEnabled = String(config.get('swagger.enabled') ?? 'true').toLowerCase() === 'true';
//   if (swaggerEnabled) {
//     setupSwagger(app);
//     logger.log('Swagger enabled');
//   }

//   // Graceful shutdown
//   app.enableShutdownHooks();

//   const port = Number(config.get('port') ?? 3000);
//   const host = String(config.get('host') ?? '0.0.0.0');

//   await app.listen(port, host);
//   logger.log(`API running on http://${host}:${port}/api`);
// }

// bootstrap().catch((err) => {
//   // eslint-disable-next-line no-console
//   console.error('Bootstrap failed', err);
//   process.exit(1);
// });








// Newly Added

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.use(compression());

  const corsOrigins = (config.get<string>('cors.origins') ?? '*')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerEnabled = String(config.get('swagger.enabled') ?? 'true').toLowerCase() === 'true';
  if (swaggerEnabled) {
    setupSwagger(app);
    logger.log('Swagger enabled');
  }

  app.enableShutdownHooks();

  const port = Number(config.get('port') ?? 3000);
  const host = String(config.get('host') ?? '0.0.0.0');

  await app.listen(port, host);
  logger.log(`API running on http://${host}:${port}/api`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Bootstrap failed', err);
  process.exit(1);
});
