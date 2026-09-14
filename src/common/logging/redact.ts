const SENSITIVE_KEY_PATTERN = /email|phone|recipient|token|password|secret|authorization|otp|cookie|credential|card|bank|verification/i;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_PATTERN = /^\+?[0-9]{6,20}$/;

function maskEmail(value: string): string {
  const at = value.indexOf('@');
  if (at <= 0) return '***';
  return `${value.slice(0, Math.min(2, at))}***${value.slice(at)}`;
}

function maskPhone(value: string): string {
  return `****${value.slice(-3)}`;
}

function maskSensitive(value: unknown): unknown {
  if (typeof value !== 'string') return '[REDACTED]';
  if (value.includes('@')) return maskEmail(value);
  if (PHONE_PATTERN.test(value)) return maskPhone(value);
  return '[REDACTED]';
}

// Che dữ liệu nhạy cảm ở tầng logger — không dựa vào việc từng developer nhớ xoá.
// Lớp bảo vệ cuối cùng; email/phone lọt vào chuỗi tự do cũng bị mask.
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value)) return maskEmail(value);
    if (PHONE_PATTERN.test(value)) return maskPhone(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? maskSensitive(val) : redact(val);
    }
    return out;
  }
  return value;
}
