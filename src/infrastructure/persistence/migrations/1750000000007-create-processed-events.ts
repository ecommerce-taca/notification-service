import { MigrationInterface, QueryRunner } from 'typeorm';

// 007 — Bảng processed_events, unique event_id + unique dedupe_key.
export class CreateProcessedEvents1750000000007 implements MigrationInterface {
  name = 'CreateProcessedEvents1750000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`processed_events\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`event_id\` VARCHAR(64) NOT NULL,
        \`dedupe_key\` VARCHAR(255) NOT NULL,
        \`processed_at\` DATETIME(6) NOT NULL,
        \`status\` ENUM('PROCESSED','FAILED') NOT NULL,
        \`error\` VARCHAR(255) NULL,
        PRIMARY KEY (\`_id\`),
        UNIQUE KEY \`uq_processed_events_event_id\` (\`event_id\`),
        UNIQUE KEY \`uq_processed_events_dedupe_key\` (\`dedupe_key\`),
        KEY \`idx_processed_events_processed_at\` (\`processed_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `processed_events`');
  }
}
