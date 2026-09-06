import { MigrationInterface, QueryRunner } from 'typeorm';

// 009 — Hardening delivery flow:
//   - delivery_attempts.status thêm SKIPPED + RETRY_EXHAUSTED (phân biệt skip vs transient hết budget vs permanent).
//   - notifications thêm processing_started_at làm lease cho atomic claim / stale reclaim.
//   - bảng delivery_outbox cho transactional outbox (ghi event cùng transaction với đổi status).
export class DeliveryHardening1750000000009 implements MigrationInterface {
  name = 'DeliveryHardening1750000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`delivery_attempts\`
        MODIFY \`status\` ENUM('STARTED','SENT','SKIPPED','RETRYABLE_FAILED','RETRY_EXHAUSTED','PERMANENT_FAILED') NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        ADD COLUMN \`processing_started_at\` DATETIME(6) NULL AFTER \`scheduled_at\`
    `);

    await queryRunner.query(`
      CREATE TABLE \`delivery_outbox\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`aggregate_id\` VARCHAR(36) NOT NULL,
        \`event_type\` VARCHAR(64) NOT NULL,
        \`payload\` JSON NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`published_at\` DATETIME(6) NULL,
        \`retry_count\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`_id\`),
        KEY \`idx_delivery_outbox_pending\` (\`published_at\`,\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `delivery_outbox`');
    await queryRunner.query('ALTER TABLE `notifications` DROP COLUMN `processing_started_at`');
    await queryRunner.query(`
      ALTER TABLE \`delivery_attempts\`
        MODIFY \`status\` ENUM('STARTED','SENT','RETRYABLE_FAILED','PERMANENT_FAILED') NOT NULL
    `);
  }
}
