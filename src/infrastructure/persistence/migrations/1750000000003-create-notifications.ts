import { MigrationInterface, QueryRunner } from 'typeorm';

// 003 — Bảng notifications (index bổ sung ở 008).
export class CreateNotifications1750000000003 implements MigrationInterface {
  name = 'CreateNotifications1750000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`recipient_user_id\` VARCHAR(36) NOT NULL,
        \`recipient_encrypted\` TEXT NULL,
        \`recipient_hash\` CHAR(64) NULL,
        \`channel\` ENUM('EMAIL','IN_APP') NOT NULL,
        \`template_key\` VARCHAR(100) NOT NULL,
        \`template_version\` INT NOT NULL,
        \`dedupe_key\` VARCHAR(255) NOT NULL,
        \`source_event_id\` VARCHAR(64) NULL,
        \`category\` ENUM('ORDER','SHIPMENT','PAYMENT','REVIEW','CONVERSATION','SHOP','SECURITY','MARKETING') NOT NULL,
        \`reference_type\` ENUM('ORDER','SHIPMENT','PAYMENT','REVIEW','CONVERSATION','SHOP') NULL,
        \`reference_id\` VARCHAR(64) NULL,
        \`data\` JSON NULL,
        \`status\` ENUM('QUEUED','PROCESSING','SENT','FAILED','SKIPPED','EXPIRED') NOT NULL,
        \`read_status\` ENUM('UNREAD','READ') NULL,
        \`scheduled_at\` DATETIME(6) NULL,
        \`sent_at\` DATETIME(6) NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `notifications`');
  }
}
