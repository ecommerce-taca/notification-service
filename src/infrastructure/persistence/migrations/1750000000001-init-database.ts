import { MigrationInterface, QueryRunner } from 'typeorm';

// 001 — Tạo database `notificationdb` + charset/collation.
// Việc CREATE DATABASE nằm ở bước deploy (docker/env) vì migration đã connect vào database đó;
// migration này chỉ là marker giữ đúng thứ tự 001 và khóa charset utf8mb4 cho session.
export class InitDatabase1750000000001 implements MigrationInterface {
  name = 'InitDatabase1750000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT 1');
  }
}
