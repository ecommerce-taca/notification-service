import { MigrationInterface, QueryRunner } from 'typeorm';

// 004 — Bảng delivery_attempts, FK -> notifications.
export class CreateDeliveryAttempts1750000000004 implements MigrationInterface {
  name = 'CreateDeliveryAttempts1750000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`delivery_attempts\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`notification_id\` VARCHAR(36) NOT NULL,
        \`attempt_no\` INT NOT NULL,
        \`provider\` VARCHAR(32) NOT NULL,
        \`status\` ENUM('STARTED','SENT','RETRYABLE_FAILED','PERMANENT_FAILED') NOT NULL,
        \`provider_message_id\` VARCHAR(255) NULL,
        \`error_code\` VARCHAR(64) NULL,
        \`started_at\` DATETIME(6) NULL,
        \`finished_at\` DATETIME(6) NULL,
        \`trace_id\` VARCHAR(64) NULL,
        \`request_id\` VARCHAR(64) NULL,
        PRIMARY KEY (\`_id\`),
        KEY \`idx_attempts_notification_no\` (\`notification_id\`,\`attempt_no\`),
        KEY \`idx_attempts_status_started\` (\`status\`,\`started_at\`),
        CONSTRAINT \`fk_attempts_notification\` FOREIGN KEY (\`notification_id\`) REFERENCES \`notifications\` (\`_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `delivery_attempts`');
  }
}
