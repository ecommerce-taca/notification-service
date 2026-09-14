import { MigrationInterface, QueryRunner } from 'typeorm';

// 010 — Index (status, processing_started_at) trên notifications: phục vụ tryClaimProcessing
// và findPendingDelivery (migration 009 thêm cột processing_started_at nhưng thiếu index đi kèm).
export class AddNotificationsProcessingIndex1750000000010 implements MigrationInterface {
  name = 'AddNotificationsProcessingIndex1750000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `idx_notifications_status_processing` ON `notifications` (`status`,`processing_started_at`)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `idx_notifications_status_processing` ON `notifications`');
  }
}
