import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggingModule } from './common/logging/logging.module';
import { RequestIdMiddleware } from './common/http/request-id.middleware';
import { RequestLoggingMiddleware } from './common/http/request-logging.middleware';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { CommonInfraModule } from './infrastructure/common/common-infra.module';
import { EmailModule } from './infrastructure/email/email.module';
import { KafkaConsumerModule } from './infrastructure/messaging/kafka-consumer.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { InAppModule } from './modules/in-app/in-app.module';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    CommonInfraModule,
    PersistenceModule,
    EmailModule,
    AuthModule,
    MessagingModule,
    KafkaConsumerModule,
    InAppModule,
    AdminModule,
    HealthModule,
  ],
  providers: [RequestIdMiddleware, RequestLoggingMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // RequestIdMiddleware phải chạy trước để mọi tầng sau đọc được requestId từ ALS.
    consumer.apply(RequestIdMiddleware, RequestLoggingMiddleware).forRoutes('*');
  }
}
