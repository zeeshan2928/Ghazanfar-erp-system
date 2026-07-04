import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logging/logger.service';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuditService } from './modules/audit/services/audit.service';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(AppLoggerService);
  const auditService = app.get(AuditService);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new AuditInterceptor(auditService),
  );
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
