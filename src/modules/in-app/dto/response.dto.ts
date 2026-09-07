// Response DTO riêng — chỉ chứa field được phép lộ, không trả entity thô.
// Tên field snake_case khớp contract API (System_Overview §10).

export interface NotificationReferenceResponse {
  type: string;
  id: string | null;
}

export interface NotificationResponse {
  notification_id: string;
  category: string;
  template: string;
  title: string;
  body: string;
  reference: NotificationReferenceResponse | null;
  read: boolean;
  created_at: string;
}

export interface PreferenceResponse {
  category: string;
  channel: string;
  status: string;
  locked: boolean;
}

export interface AdminDeliveryResponse {
  notification_id: string;
  channel: string;
  template: string;
  status: string;
  attempt_count: number;
  recipient_masked: string | null;
  provider_status: string | null;
  error_code: string | null;
  queued_at: string;
  sent_at: string | null;
}
