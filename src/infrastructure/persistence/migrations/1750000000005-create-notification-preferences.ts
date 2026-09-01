import { MigrationInterface, QueryRunner } from 'typeorm';

// 005 — Bảng notification_preferences, unique (user_id, channel, category).
export class CreateNotificationPreferences1750000000005 implements MigrationInterface {
  name = 'CreateNotificationPreferences1750000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notification_preferences\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`user_id\` VARCHAR(36) NOT NULL,
        \`channel\` ENUM('EMAIL','IN_APP') NOT NULL,
        \`category\` ENUM('ORDER','SHIPMENT','PAYMENT','REVIEW','CONVERSATION','SHOP','SECURITY','MARKETING') NOT NULL,
        \`status\` ENUM('ENABLED','DISABLED') NOT NULL,
        \`locked\` TINYINT(1) NOT NULL DEFAULT 0,
        \`version\` INT NOT NULL DEFAULT 1,
        \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`_id\`),
        UNIQUE KEY \`uq_preferences_user_channel_category\` (\`user_id\`,\`channel\`,\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `notification_preferences`');
  }
}
