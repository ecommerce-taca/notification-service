import { ErrorCode, ERROR_SPECS } from './error-code';

export interface AppExceptionOptions {
  message?: string;
  details?: unknown;
  context?: Record<string, unknown>;
  cause?: unknown;
}

// Exception theo domain. Không dùng HttpException của Nest trong business code
// (service không được biết về HTTP). Filter toàn cục dịch code -> HTTP status.
export class AppException extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;
  readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, options: AppExceptionOptions = {}) {
    const spec = ERROR_SPECS[code];
    super(options.message ?? spec.message, options.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = spec.httpStatus;
    this.details = options.details;
    this.context = options.context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
