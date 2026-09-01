import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config';
import { AppLogger } from './common/logging/app.logger';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { ResponseInterceptor } from './common/http/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLogger);

  app.useLogger(logger);
  app.use(helmet());

  // whitelist: loại field lạ; forbidNonWhitelisted: báo lỗi nếu client gửi field thừa.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  app.enableShutdownHooks();
  await app.listen(config.config.port);
}

void bootstrap();
