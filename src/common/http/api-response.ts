// Envelope chuẩn toàn hệ (System_Overview §10): thành công {data, meta:{request_id}},
// lỗi {error:{code,message,details,trace_id}}. Interceptor chỉ bơm request_id vào meta;
// controller dùng respond() khi cần thêm meta (page/size/total/unread_count...).
export interface ApiMeta {
  request_id?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export function respond<T>(data: T, meta: ApiMeta = {}): { data: T; meta: ApiMeta } {
  return { data, meta };
}

export function isEnveloped(value: unknown): value is { data: unknown; meta: ApiMeta } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    typeof (value as Record<string, unknown>).meta === 'object'
  );
}
