import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  commandTopic: string;
  domainEventTopics: string[];
  deliveredTopic: string;
  failedTopic: string;
  dlqTopic: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromAddress: string;
}

export interface JwtConfig {
  issuer: string;
  audience: string;
  jwksUrl: string;
}

export interface DeliveryConfig {
  retryCount: number;
  backoffMs: number;
  sweepIntervalMs: number;
  staleAfterMs: number;
}

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  serviceName: string;
  serviceVersion: string;
  database: DatabaseConfig;
  kafka: KafkaConfig;
  smtp: SmtpConfig;
  jwt: JwtConfig;
  delivery: DeliveryConfig;
  recipientHashSecret: string;
  recipientEncryptionSecret: string;
}

// Config đã được validate bởi envSchema ở ConfigModule.forRoot; đây chỉ gom lại thành object có type.
@Injectable()
export class AppConfigService {
  readonly config: AppConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      env: this.configService.get<'development' | 'test' | 'production'>('NODE_ENV', 'development'),
      port: this.configService.get<number>('PORT', 8080),
      serviceName: this.configService.get<string>('SERVICE_NAME', 'notification-service'),
      serviceVersion: this.configService.get<string>('SERVICE_VERSION', '0.1.0'),
      database: {
        host: this.requireString('DB_HOST'),
        port: this.configService.get<number>('DB_PORT', 3306),
        username: this.requireString('DB_USERNAME'),
        password: this.requireString('DB_PASSWORD'),
        name: this.requireString('DB_NAME'),
      },
      kafka: {
        brokers: this.configService.get<string[]>('KAFKA_BROKERS', []),
        clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'notification-service'),
        groupId: this.configService.get<string>('KAFKA_CONSUMER_GROUP_ID', 'notification-service'),
        commandTopic: this.configService.get<string>('KAFKA_TOPIC_COMMANDS', 'notification.commands.v1'),
        domainEventTopics: this.configService.get<string[]>('KAFKA_TOPIC_DOMAIN_EVENTS', []),
        deliveredTopic: this.configService.get<string>('KAFKA_TOPIC_DELIVERED', 'notification.delivered.v1'),
        failedTopic: this.configService.get<string>('KAFKA_TOPIC_FAILED', 'notification.failed.v1'),
        dlqTopic: this.configService.get<string>('KAFKA_TOPIC_DLQ', 'notification.events.dlq.v1'),
      },
      smtp: {
        host: this.requireString('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT', 1025),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        user: this.configService.get<string>('SMTP_USER', ''),
        password: this.configService.get<string>('SMTP_PASSWORD', ''),
        fromName: this.configService.get<string>('EMAIL_FROM_NAME', 'Taca'),
        fromAddress: this.requireString('EMAIL_FROM_ADDRESS'),
      },
      jwt: {
        issuer: this.requireString('JWT_ISSUER'),
        audience: this.requireString('JWT_AUDIENCE'),
        jwksUrl: this.requireString('JWT_JWKS_URL'),
      },
      delivery: {
        retryCount: this.configService.get<number>('DELIVERY_RETRY_COUNT', 3),
        backoffMs: this.configService.get<number>('DELIVERY_RETRY_BACKOFF_MS', 2000),
        sweepIntervalMs: this.configService.get<number>('DELIVERY_SWEEP_INTERVAL_MS', 30000),
        staleAfterMs: this.configService.get<number>('DELIVERY_STALE_AFTER_MS', 60000),
      },
      recipientHashSecret: this.requireString('RECIPIENT_HASH_SECRET'),
      recipientEncryptionSecret: this.requireString('RECIPIENT_ENCRYPTION_SECRET'),
    };
  }

  private requireString(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
    }
    return value;
  }
}
