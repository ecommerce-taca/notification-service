import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { DeliveryOutbox } from '../../domain/entities/delivery-outbox.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationAudit } from '../../domain/entities/notification-audit.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { ProcessedEvent } from '../../domain/entities/processed-event.entity';
import { Template } from '../../domain/entities/template.entity';

// DataSource dùng riêng cho TypeORM CLI (migration/seed). App runtime đi qua PersistenceModule
// + AppConfigService (đã validate bằng envSchema). CLI không load Nest nên tự validate ở đây —
// fail-fast giống app, tránh migrate/seed nhầm DB khi .env thiếu hoặc gõ sai tên biến.
const dbEnv = z
  .object({
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().min(1),
    DB_NAME: z.string().min(1),
  })
  .parse(process.env);

export const appDataSource = new DataSource({
  type: 'mysql',
  host: dbEnv.DB_HOST,
  port: dbEnv.DB_PORT,
  username: dbEnv.DB_USERNAME,
  password: dbEnv.DB_PASSWORD,
  database: dbEnv.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z',
  entities: [
    Notification,
    Template,
    NotificationPreference,
    DeliveryAttempt,
    DeliveryOutbox,
    ProcessedEvent,
    NotificationAudit,
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
