import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationAudit } from '../../domain/entities/notification-audit.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { ProcessedEvent } from '../../domain/entities/processed-event.entity';
import { Template } from '../../domain/entities/template.entity';

// DataSource dùng riêng cho TypeORM CLI (migration/seed), đọc env trực tiếp.
// App runtime dùng PersistenceModule (TypeOrmModule.forRootAsync) đọc AppConfigService.
export const appDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'notification',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'notificationdb',
  charset: 'utf8mb4',
  timezone: 'Z',
  entities: [Notification, Template, NotificationPreference, DeliveryAttempt, ProcessedEvent, NotificationAudit],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
