import { MigrationInterface, QueryRunner } from 'typeorm';

// 008 — Index trên notifications: unique (recipient_user_id, dedupe_key, channel) + 3 index đọc.
export class AddNotificationsIndexes1750000000008 implements MigrationInterface {
  name = 'AddNotificationsIndexes1750000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX `uq_notifications_recipient_dedupe_channel` ON `notifications` (`recipient_user_id`,`dedupe_key`,`channel`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_notifications_recipient_created` ON `notifications` (`recipient_user_id`,`created_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_notifications_recipient_read_created` ON `notifications` (`recipient_user_id`,`read_status`,`created_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_notifications_status_scheduled` ON `notifications` (`status`,`scheduled_at`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_notifications_recipient_hash` ON `notifications` (`recipient_hash`)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `uq_notifications_recipient_dedupe_channel` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_recipient_created` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_recipient_read_created` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_status_scheduled` ON `notifications`');
    await queryRunner.query('DROP INDEX `idx_notifications_recipient_hash` ON `notifications`');
  }
}
