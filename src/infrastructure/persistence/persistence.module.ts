import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationAudit } from '../../domain/entities/notification-audit.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { ProcessedEvent } from '../../domain/entities/processed-event.entity';
import { Template } from '../../domain/entities/template.entity';
import { DeliveryAttemptRepositoryPort } from '../../domain/ports/delivery-attempt.repository.port';
import { NotificationAuditRepositoryPort } from '../../domain/ports/notification-audit.repository.port';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { PreferenceRepositoryPort } from '../../domain/ports/preference.repository.port';
import { ProcessedEventRepositoryPort } from '../../domain/ports/processed-event.repository.port';
import { TemplateRepositoryPort } from '../../domain/ports/template.repository.port';
import { AppConfigService } from '../../config/app-config';
import { DeliveryAttemptTypeOrmRepository } from './repositories/delivery-attempt.typeorm.repository';
import { NotificationAuditTypeOrmRepository } from './repositories/notification-audit.typeorm.repository';
import { NotificationTypeOrmRepository } from './repositories/notification.typeorm.repository';
import { PreferenceTypeOrmRepository } from './repositories/preference.typeorm.repository';
import { ProcessedEventTypeOrmRepository } from './repositories/processed-event.typeorm.repository';
import { TemplateTypeOrmRepository } from './repositories/template.typeorm.repository';

const entities = [Notification, Template, NotificationPreference, DeliveryAttempt, ProcessedEvent, NotificationAudit];

// Persistence là hạ tầng; business code chỉ inject port, không thấy Repository<T>/DataSource.
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'mysql' as const,
        host: config.config.database.host,
        port: config.config.database.port,
        username: config.config.database.username,
        password: config.config.database.password,
        database: config.config.database.name,
        charset: 'utf8mb4',
        timezone: 'Z',
        entities,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  providers: [
    { provide: NotificationRepositoryPort, useClass: NotificationTypeOrmRepository },
    { provide: TemplateRepositoryPort, useClass: TemplateTypeOrmRepository },
    { provide: PreferenceRepositoryPort, useClass: PreferenceTypeOrmRepository },
    { provide: DeliveryAttemptRepositoryPort, useClass: DeliveryAttemptTypeOrmRepository },
    { provide: ProcessedEventRepositoryPort, useClass: ProcessedEventTypeOrmRepository },
    { provide: NotificationAuditRepositoryPort, useClass: NotificationAuditTypeOrmRepository },
  ],
  exports: [
    NotificationRepositoryPort,
    TemplateRepositoryPort,
    PreferenceRepositoryPort,
    DeliveryAttemptRepositoryPort,
    ProcessedEventRepositoryPort,
    NotificationAuditRepositoryPort,
  ],
})
export class PersistenceModule {}
