export enum AttemptStatus {
  STARTED = 'STARTED',
  SENT = 'SENT',
  SKIPPED = 'SKIPPED',
  RETRYABLE_FAILED = 'RETRYABLE_FAILED',
  // Transient nhưng đã hết budget retry — phân biệt với PERMANENT_FAILED (lỗi thật, không retry được).
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  PERMANENT_FAILED = 'PERMANENT_FAILED',
}
