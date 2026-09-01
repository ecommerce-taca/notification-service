// Catalog mã lỗi duy nhất của notification service — không viết string literal rải rác.
// Mỗi code gắn cứng một HTTP status; message tiếng Việt cho người dùng cuối.
export enum ErrorCode {
  NOTIFICATION_INVALID_INPUT = 'NOTIFICATION_INVALID_INPUT',
  NOTIFICATION_UNAUTHENTICATED = 'NOTIFICATION_UNAUTHENTICATED',
  NOTIFICATION_FORBIDDEN = 'NOTIFICATION_FORBIDDEN',
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',
  NOTIFICATION_TEMPLATE_NOT_FOUND = 'NOTIFICATION_TEMPLATE_NOT_FOUND',
  NOTIFICATION_CHANNEL_DISABLED = 'NOTIFICATION_CHANNEL_DISABLED',
  NOTIFICATION_PREFERENCE_LOCKED = 'NOTIFICATION_PREFERENCE_LOCKED',
  NOTIFICATION_PROVIDER_UNAVAILABLE = 'NOTIFICATION_PROVIDER_UNAVAILABLE',
  NOTIFICATION_DELIVERY_FAILED = 'NOTIFICATION_DELIVERY_FAILED',
  NOTIFICATION_IDEMPOTENCY_CONFLICT = 'NOTIFICATION_IDEMPOTENCY_CONFLICT',
  NOTIFICATION_INTERNAL_ERROR = 'NOTIFICATION_INTERNAL_ERROR',
}

export interface ErrorSpec {
  httpStatus: number;
  message: string;
}

export const ERROR_SPECS: Record<ErrorCode, ErrorSpec> = {
  [ErrorCode.NOTIFICATION_INVALID_INPUT]: { httpStatus: 400, message: 'Thông tin gửi lên chưa đúng.' },
  [ErrorCode.NOTIFICATION_UNAUTHENTICATED]: { httpStatus: 401, message: 'Vui lòng đăng nhập để tiếp tục.' },
  [ErrorCode.NOTIFICATION_FORBIDDEN]: { httpStatus: 403, message: 'Bạn không có quyền thực hiện thao tác này.' },
  [ErrorCode.NOTIFICATION_NOT_FOUND]: { httpStatus: 404, message: 'Không tìm thấy thông báo.' },
  [ErrorCode.NOTIFICATION_TEMPLATE_NOT_FOUND]: { httpStatus: 409, message: 'Mẫu thông báo không tồn tại.' },
  [ErrorCode.NOTIFICATION_CHANNEL_DISABLED]: { httpStatus: 409, message: 'Kênh thông báo này đã bị tắt.' },
  [ErrorCode.NOTIFICATION_PREFERENCE_LOCKED]: { httpStatus: 403, message: 'Không thể tắt thông báo bảo mật.' },
  [ErrorCode.NOTIFICATION_PROVIDER_UNAVAILABLE]: { httpStatus: 503, message: 'Nhà cung cấp thông báo đang tạm thời không khả dụng.' },
  [ErrorCode.NOTIFICATION_DELIVERY_FAILED]: { httpStatus: 503, message: 'Gửi thông báo thất bại.' },
  [ErrorCode.NOTIFICATION_IDEMPOTENCY_CONFLICT]: { httpStatus: 409, message: 'Yêu cầu trùng lặp nhưng dữ liệu không khớp.' },
  [ErrorCode.NOTIFICATION_INTERNAL_ERROR]: { httpStatus: 500, message: 'Hệ thống đang bận. Vui lòng thử lại.' },
};
