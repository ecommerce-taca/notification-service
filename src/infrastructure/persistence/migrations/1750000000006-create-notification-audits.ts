import { MigrationInterface, QueryRunner } from 'typeorm';

// 006 — Bảng notification_audits.
export class CreateNotificationAudits1750000000006 implements MigrationInterface {
  name = 'CreateNotificationAudits1750000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notification_audits\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`actor_user_id\` VARCHAR(36) NULL,
        \`action\` VARCHAR(64) NOT NULL,
        \`target_type\` VARCHAR(32) NOT NULL,
        \`target_id\` VARCHAR(64) NOT NULL,
        \`reason\` VARCHAR(1000) NULL,
        \`metadata\` JSON NULL,
        \`occurred_at\` DATETIME(6) NOT NULL,
        PRIMARY KEY (\`_id\`),
        KEY \`idx_audits_target_occurred\` (\`target_id\`,\`occurred_at\`),
        KEY \`idx_audits_actor_occurred\` (\`actor_user_id\`,\`occurred_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `notification_audits`');
  }
}
