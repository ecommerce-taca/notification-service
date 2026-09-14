import { MigrationInterface, QueryRunner } from 'typeorm';

// 002 — Bảng templates, unique (key, version, locale).
export class CreateTemplates1750000000002 implements MigrationInterface {
  name = 'CreateTemplates1750000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`templates\` (
        \`_id\` VARCHAR(36) NOT NULL,
        \`key\` VARCHAR(100) NOT NULL,
        \`version\` INT NOT NULL,
        \`locale\` VARCHAR(16) NOT NULL,
        \`subject\` VARCHAR(255) NOT NULL,
        \`body\` TEXT NOT NULL,
        \`status\` ENUM('DRAFT','PUBLISHED') NOT NULL,
        \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`_id\`),
        UNIQUE KEY \`uq_templates_key_version_locale\` (\`key\`,\`version\`,\`locale\`),
        KEY \`idx_templates_key_status\` (\`key\`,\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `templates`');
  }
}
