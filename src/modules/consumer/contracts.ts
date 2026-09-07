import { z } from 'zod';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { ReferenceType } from '../../domain/enums/reference-type.enum';

// Hai loại input (notification LLD §6.2): command trên notification.commands.v1 và domain event
// trên topic của service chủ. Contract command là nguồn sự thật của notification.

export const COMMAND_TYPES = [
  'AUTH_VERIFICATION_REQUESTED',
  'PASSWORD_RESET_REQUESTED',
  'PHONE_OTP_REQUESTED',
  'MESSAGE_RECEIVED',
  'REVIEW_REQUESTED',
] as const;

export const CommandTypeSchema = z.enum(COMMAND_TYPES);

// Envelope command (align theo auth-user §4.1): user_id + channel đơn + recipient string.
export const NotificationCommandSchema = z.object({
  event_id: z.string().min(1).max(64),
  schema_version: z.number().int().positive(),
  command_type: CommandTypeSchema,
  occurred_at: z.string().datetime(),
  dedupe_key: z.string().min(1).max(255),
  user_id: z.string().min(1).max(36),
  channel: z.nativeEnum(Channel),
  recipient: z.string().max(254).default(''),
  template: z.string().min(1).max(100),
  data: z.record(z.unknown()).default({}),
});
export type NotificationCommand = z.infer<typeof NotificationCommandSchema>;

// Envelope domain event (chuẩn chung System_Overview §8): event_id/event_type/occurred_at/payload.
export const DomainEventSchema = z.object({
  event_id: z.string().min(1).max(64),
  schema_version: z.number().int().positive().optional().default(1),
  event_type: z.string().min(1).max(128),
  occurred_at: z.string().datetime(),
  aggregate_type: z.string().max(64).optional(),
  aggregate_id: z.string().max(64).optional(),
  payload: z.record(z.unknown()).default({}),
});
export type DomainEvent = z.infer<typeof DomainEventSchema>;

export interface EventMapping {
  template: string;
  category: NotificationCategory;
  channels: Channel[];
  referenceType: ReferenceType | null;
  referenceKey: string;
}

// Ánh xạ domain event -> template/kênh/category (notification LLD §6.2).
export const DOMAIN_EVENT_MAP: Record<string, EventMapping> = {
  'order.confirmed': {
    template: 'order-success-v1',
    category: NotificationCategory.ORDER,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.ORDER,
    referenceKey: 'order_id',
  },
  'order.paid': {
    template: 'payment-received-v1',
    category: NotificationCategory.ORDER,
    channels: [Channel.IN_APP],
    referenceType: ReferenceType.ORDER,
    referenceKey: 'order_id',
  },
  'order.cancelled': {
    template: 'order-cancelled-v1',
    category: NotificationCategory.ORDER,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.ORDER,
    referenceKey: 'order_id',
  },
  'invoice.issued': {
    template: 'invoice-issued-v1',
    category: NotificationCategory.ORDER,
    channels: [Channel.EMAIL],
    referenceType: ReferenceType.ORDER,
    referenceKey: 'invoice_id',
  },
  'shipment.delivered': {
    template: 'shipment-delivered-v1',
    category: NotificationCategory.SHIPMENT,
    channels: [Channel.IN_APP],
    referenceType: ReferenceType.SHIPMENT,
    referenceKey: 'shipment_id',
  },
  'shipment.failed': {
    template: 'shipment-failed-v1',
    category: NotificationCategory.SHIPMENT,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.SHIPMENT,
    referenceKey: 'shipment_id',
  },
  'payment.succeeded': {
    template: 'payment-result-v1',
    category: NotificationCategory.PAYMENT,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.PAYMENT,
    referenceKey: 'payment_id',
  },
  'payment.failed': {
    template: 'payment-result-v1',
    category: NotificationCategory.PAYMENT,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.PAYMENT,
    referenceKey: 'payment_id',
  },
  'payout.succeeded': {
    template: 'payout-result-v1',
    category: NotificationCategory.PAYMENT,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.PAYMENT,
    referenceKey: 'payout_id',
  },
  'payout.failed': {
    template: 'payout-result-v1',
    category: NotificationCategory.PAYMENT,
    channels: [Channel.EMAIL, Channel.IN_APP],
    referenceType: ReferenceType.PAYMENT,
    referenceKey: 'payout_id',
  },
};

export const COMMAND_CATEGORY: Record<(typeof COMMAND_TYPES)[number], NotificationCategory> = {
  AUTH_VERIFICATION_REQUESTED: NotificationCategory.SECURITY,
  PASSWORD_RESET_REQUESTED: NotificationCategory.SECURITY,
  PHONE_OTP_REQUESTED: NotificationCategory.SECURITY,
  MESSAGE_RECEIVED: NotificationCategory.CONVERSATION,
  REVIEW_REQUESTED: NotificationCategory.REVIEW,
};

export interface ExtractedRecipient {
  userId: string | null;
  email: string | null;
  // true nếu payload không dùng field đã chốt (buyer.user_id/buyer.email) và phải rơi vào
  // fallback — caller (NotificationConsumer) log warning khi cờ này bật.
  usedFallback: boolean;
}

// Rút recipient từ payload domain event. Field đã chốt (order-commerce.md §6.1):
// payload.buyer.user_id (bắt buộc) / payload.buyer.email (optional). Các dạng tên khác chỉ còn
// là fallback tạm thời cho tới khi producer thật align đúng field đã chốt.
export function extractRecipient(payload: Record<string, unknown>): ExtractedRecipient {
  const buyer = payload.buyer as { user_id?: unknown; email?: unknown } | undefined;
  if (buyer && typeof buyer.user_id === 'string') {
    return {
      userId: buyer.user_id,
      email: typeof buyer.email === 'string' ? buyer.email : null,
      usedFallback: false,
    };
  }

  // Fallback: giữ lại các dạng tên cũ để không reject toàn bộ event nếu producer thật chưa kịp
  // đổi, nhưng caller phải log warning rõ ràng — để lộ ra ngay thay vì âm thầm chấp nhận mãi mãi.
  const recipient = payload.recipient as { user_id?: unknown; email?: unknown } | undefined;
  if (recipient && typeof recipient.user_id === 'string') {
    return {
      userId: recipient.user_id,
      email: typeof recipient.email === 'string' ? recipient.email : null,
      usedFallback: true,
    };
  }
  const userId = payload.user_id ?? payload.buyer_id ?? payload.recipient_user_id;
  const email = payload.email ?? payload.buyer_email ?? payload.recipient_email;
  return {
    userId: typeof userId === 'string' ? userId : null,
    email: typeof email === 'string' ? email : null,
    usedFallback: true,
  };
}

export function extractReferenceId(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' ? value : null;
}
