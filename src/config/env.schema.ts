import { z } from 'zod';

// Chỉ đọc biến môi trường ở đúng một nơi (module config) và validate fail-fast khi boot.
// Mọi biến bắt buộc không có giá trị mặc định sẽ làm app chết ngay lúc khởi động.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  SERVICE_NAME: z.string().min(1).default('notification-service'),
  SERVICE_VERSION: z.string().min(1).default('0.1.0'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  KAFKA_BROKERS: z.string().min(1).transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  KAFKA_CLIENT_ID: z.string().min(1).default('notification-service'),
  KAFKA_CONSUMER_GROUP_ID: z.string().min(1).default('notification-service'),
  KAFKA_TOPIC_COMMANDS: z.string().min(1).default('notification.commands.v1'),
  KAFKA_TOPIC_DOMAIN_EVENTS: z.string().default('').transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  KAFKA_TOPIC_DELIVERED: z.string().min(1).default('notification.delivered.v1'),
  KAFKA_TOPIC_FAILED: z.string().min(1).default('notification.failed.v1'),
  KAFKA_TOPIC_DLQ: z.string().min(1).default('notification.events.dlq.v1'),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  EMAIL_FROM_NAME: z.string().min(1).default('Taca'),
  EMAIL_FROM_ADDRESS: z.string().min(1),

  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  JWT_JWKS_URL: z.string().url(),

  RECIPIENT_HASH_SECRET: z.string().min(32),
  RECIPIENT_ENCRYPTION_SECRET: z.string().min(32),

  DELIVERY_RETRY_COUNT: z.coerce.number().int().min(0).max(10).default(3),
  DELIVERY_RETRY_BACKOFF_MS: z.coerce.number().int().min(0).max(60000).default(2000),
  DELIVERY_SWEEP_INTERVAL_MS: z.coerce.number().int().min(1000).max(3600000).default(30000),
  DELIVERY_STALE_AFTER_MS: z.coerce.number().int().min(1000).max(3600000).default(60000),
});

export type Env = z.infer<typeof envSchema>;
