import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { AppLogger } from '../logging/app.logger';
import { RequestContext } from '../http/request-context';
import { AppException } from './app.exception';
import { ErrorCode } from './error-code';

interface MappedError {
  status: number;
  code: string;
  message: string;
  details: unknown;
}

interface ValidationItem {
  field?: string;
  constraints?: Record<string, string>;
}

// Global handler duy nhất — dịch mọi exception về envelope {error:{code,message,details,trace_id}}.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const traceId = RequestContext.getTraceId() ?? RequestContext.getRequestId() ?? '';
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      this.logger.error('unhandled exception', exception, {
        event: 'http.error',
        request_id: RequestContext.getRequestId(),
      });
    }

    res.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        details: mapped.details ?? [],
        trace_id: traceId,
      },
    });
  }

  private map(exception: unknown): MappedError {
    if (exception instanceof AppException) {
      return {
        status: exception.httpStatus,
        code: exception.code,
        message: exception.message,
        details: exception.details ?? [],
      };
    }

    // ValidationPipe ném BadRequestException với response.message là mảng lỗi từng field.
    if (exception instanceof BadRequestException) {
      return {
        status: 400,
        code: ErrorCode.NOTIFICATION_INVALID_INPUT,
        message: 'Thông tin gửi lên chưa đúng.',
        details: this.extractValidationDetails(exception.getResponse()),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        code: status >= 500 ? ErrorCode.NOTIFICATION_INTERNAL_ERROR : ErrorCode.NOTIFICATION_INVALID_INPUT,
        message: exception.message,
        details: [],
      };
    }

    return {
      status: 500,
      code: ErrorCode.NOTIFICATION_INTERNAL_ERROR,
      message: 'Hệ thống đang bận. Vui lòng thử lại.',
      details: [],
    };
  }

  private extractValidationDetails(response: string | object): unknown[] {
    if (typeof response !== 'object' || response === null) return [];
    const message = (response as Record<string, unknown>).message;
    if (!Array.isArray(message)) return [];

    return message.map((item) => {
      if (typeof item === 'string') return { field: null, message: item };
      if (typeof item === 'object' && item !== null) {
        const { field, constraints } = item as ValidationItem;
        return {
          field: field ?? null,
          message: constraints ? Object.values(constraints)[0] ?? 'invalid' : 'invalid',
        };
      }
      return { field: null, message: 'invalid' };
    });
  }
}
