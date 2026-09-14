import 'dotenv/config';
import { appDataSource } from './data-source';
import { Template } from '../../domain/entities/template.entity';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import { DeliveryAttempt } from '../../domain/entities/delivery-attempt.entity';
import { ProcessedEvent, ProcessedEventStatus } from '../../domain/entities/processed-event.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { NotificationStatus } from '../../domain/enums/notification-status.enum';
import { ReadStatus } from '../../domain/enums/read-status.enum';
import { AttemptStatus } from '../../domain/enums/attempt-status.enum';
import { PreferenceStatus } from '../../domain/enums/preference-status.enum';
import { ReferenceType } from '../../domain/enums/reference-type.enum';
import { TemplateStatus } from '../../domain/enums/template-status.enum';

// Seed tối thiểu theo db doc §6.2 (tương đương migration 009).
// Không seed secret/OTP/password/payment hay email/phone thật — dùng placeholder.
const LOCALE = 'vi-VN';

interface TemplateSeed {
  key: string;
  subject: string;
  body: string;
}

const TEMPLATE_SEEDS: TemplateSeed[] = [
  {
    key: 'order-success-v1',
    subject: 'Đặt hàng thành công',
    body: 'Cảm ơn {{display_name}}, đơn hàng {{order_code}} của bạn đã được xác nhận. Chúng tôi sẽ sớm xử lý và giao hàng.',
  },
  {
    key: 'payment-received-v1',
    subject: 'Đã nhận thanh toán',
    body: 'Thanh toán {{amount}} VND cho đơn {{order_code}} đã được ghi nhận.',
  },
  {
    key: 'order-cancelled-v1',
    subject: 'Đơn hàng đã hủy',
    body: 'Đơn hàng {{order_code}} của bạn đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ chúng tôi.',
  },
  {
    key: 'invoice-issued-v1',
    subject: 'Hóa đơn đơn hàng {{order_code}}',
    body: 'Hóa đơn cho đơn hàng {{order_code}} đã được phát hành. Xem chi tiết tại {{invoice_url}}.',
  },
  {
    key: 'shipment-delivered-v1',
    subject: 'Đơn hàng đã giao',
    body: 'Đơn hàng {{order_code}} của bạn đã được giao thành công. Hãy cho chúng tôi biết trải nghiệm của bạn.',
  },
  {
    key: 'shipment-failed-v1',
    subject: 'Giao hàng thất bại',
    body: 'Đơn hàng {{order_code}} giao hàng không thành công: {{reason}}.',
  },
  {
    key: 'payment-result-v1',
    subject: 'Kết quả thanh toán',
    body: 'Giao dịch {{amount}} VND cho đơn {{order_code}} {{result}}.',
  },
  {
    key: 'payout-result-v1',
    subject: 'Kết quả payout',
    body: 'Payout {{amount}} VND {{result}}.',
  },
  {
    key: 'auth-verification-v1',
    subject: 'Xác thực tài khoản',
    body: 'Xin chào {{display_name}}, mã xác thực của bạn: {{verification_code}}. Mã hết hạn sau {{expires_in_minutes}} phút.',
  },
  {
    key: 'auth-email-verification-v1',
    subject: 'Xác thực email',
    body: 'Xin chào {{display_name}}, hãy xác thực email bằng cách truy cập {{verification_url}}. Liên kết hết hạn sau {{expires_in_minutes}} phút.',
  },
  {
    key: 'auth-password-reset-v1',
    subject: 'Đặt lại mật khẩu',
    body: 'Xin chào {{display_name}}, hãy đặt lại mật khẩu tại {{reset_url}}. Liên kết hết hạn sau {{expires_in_minutes}} phút.',
  },
  {
    key: 'review-request-v1',
    subject: 'Mời đánh giá sản phẩm',
    body: 'Bạn vừa nhận đơn hàng {{order_code}}. Hãy đánh giá sản phẩm để chia sẻ trải nghiệm.',
  },
];

async function seedTemplates(): Promise<void> {
  const repo = appDataSource.getRepository(Template);
  const rows = TEMPLATE_SEEDS.map((t) =>
    repo.create({
      id: `tpl-${t.key}`,
      key: t.key,
      version: 1,
      locale: LOCALE,
      subject: t.subject,
      body: t.body,
      status: TemplateStatus.PUBLISHED,
    }),
  );
  await repo.save(rows);
}

async function seedPreferences(): Promise<void> {
  const repo = appDataSource.getRepository(NotificationPreference);
  await repo.save([
    repo.create({
      id: 'pref-security-1',
      userId: 'user-1',
      channel: Channel.EMAIL,
      category: NotificationCategory.SECURITY,
      status: PreferenceStatus.ENABLED,
      locked: true,
      version: 1,
    }),
    repo.create({
      id: 'pref-marketing-2',
      userId: 'user-2',
      channel: Channel.EMAIL,
      category: NotificationCategory.MARKETING,
      status: PreferenceStatus.DISABLED,
      locked: false,
      version: 1,
    }),
  ]);
}

async function seedNotifications(): Promise<void> {
  const repo = appDataSource.getRepository(Notification);
  const now = new Date();
  await repo.save([
    repo.create({
      id: 'ntf-sent-unread',
      recipientUserId: 'user-1',
      channel: Channel.IN_APP,
      templateKey: 'order-success-v1',
      templateVersion: 1,
      dedupeKey: 'order:order-001:confirm',
      sourceEventId: 'evt-001',
      category: NotificationCategory.ORDER,
      referenceType: ReferenceType.ORDER,
      referenceId: 'order-001',
      data: { order_code: 'TC-20260830-0001', display_name: 'Nguyễn Minh Anh' },
      status: NotificationStatus.SENT,
      readStatus: ReadStatus.UNREAD,
      scheduledAt: now,
      sentAt: now,
    }),
    repo.create({
      id: 'ntf-sent-read',
      recipientUserId: 'user-1',
      channel: Channel.IN_APP,
      templateKey: 'shipment-delivered-v1',
      templateVersion: 1,
      dedupeKey: 'shipment:ship-001:delivered',
      sourceEventId: 'evt-002',
      category: NotificationCategory.SHIPMENT,
      referenceType: ReferenceType.SHIPMENT,
      referenceId: 'ship-001',
      data: { order_code: 'TC-20260830-0002' },
      status: NotificationStatus.SENT,
      readStatus: ReadStatus.READ,
      scheduledAt: now,
      sentAt: now,
    }),
    repo.create({
      id: 'ntf-failed',
      recipientUserId: 'user-1',
      channel: Channel.EMAIL,
      templateKey: 'payout-result-v1',
      templateVersion: 1,
      dedupeKey: 'payout:payout-001:failed',
      sourceEventId: 'evt-003',
      category: NotificationCategory.PAYMENT,
      referenceType: ReferenceType.PAYMENT,
      referenceId: 'payout-001',
      data: { amount: 500000, result: 'thất bại' },
      status: NotificationStatus.FAILED,
      readStatus: null,
      scheduledAt: now,
      sentAt: null,
    }),
    repo.create({
      id: 'ntf-skipped',
      recipientUserId: 'user-2',
      channel: Channel.EMAIL,
      templateKey: 'review-request-v1',
      templateVersion: 1,
      dedupeKey: 'review:order-002:request',
      sourceEventId: 'evt-004',
      category: NotificationCategory.MARKETING,
      referenceType: ReferenceType.ORDER,
      referenceId: 'order-002',
      data: { order_code: 'TC-20260830-0003' },
      status: NotificationStatus.SKIPPED,
      readStatus: null,
      scheduledAt: now,
      sentAt: null,
    }),
  ]);
}

async function seedDeliveryAttempts(): Promise<void> {
  const repo = appDataSource.getRepository(DeliveryAttempt);
  const base = { notificationId: 'ntf-failed', provider: 'smtp' };
  // id cố định để save() upsert — seed chạy lại không tạo bản ghi trùng.
  await repo.save([
    repo.create({ id: 'att-failed-1', ...base, attemptNo: 1, status: AttemptStatus.RETRYABLE_FAILED, errorCode: 'SMTP_TIMEOUT' }),
    repo.create({ id: 'att-failed-2', ...base, attemptNo: 2, status: AttemptStatus.RETRYABLE_FAILED, errorCode: 'SMTP_TIMEOUT' }),
    repo.create({ id: 'att-failed-3', ...base, attemptNo: 3, status: AttemptStatus.PERMANENT_FAILED, errorCode: 'SMTP_MAILBOX_UNAVAILABLE' }),
  ]);
}

async function seedProcessedEvents(): Promise<void> {
  const repo = appDataSource.getRepository(ProcessedEvent);
  await repo.save(
    repo.create({
      id: 'pe-ev1-001',
      eventId: 'evt-001',
      dedupeKey: 'order:order-001:confirm',
      processedAt: new Date(),
      status: ProcessedEventStatus.PROCESSED,
      error: null,
    }),
  );
}

async function run(): Promise<void> {
  await appDataSource.initialize();
  await seedTemplates();
  await seedPreferences();
  await seedNotifications();
  await seedDeliveryAttempts();
  await seedProcessedEvents();
  await appDataSource.destroy();
  // eslint-disable-next-line no-console
  console.log('Seed hoàn tất: 10 templates + preferences + notifications + attempts + processed_event.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed thất bại:', err);
  process.exitCode = 1;
});
