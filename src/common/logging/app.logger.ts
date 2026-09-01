import { Injectable, LoggerService } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { RequestContext } from '../http/request-context';
import { redact } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

// JSON stdout, field chuẩn theo System_Overview §10; requestId/traceId tự lấy từ context.
@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly config: AppConfigService) {}

  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.emit('error', message, context, error);
  }

  log(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }

  private emit(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    const ctx = RequestContext.current();
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.config.serviceName,
      env: this.config.config.env,
      version: this.config.config.serviceVersion,
      event: context?.event ?? 'log',
      trace_id: ctx?.traceId ?? null,
      span_id: null,
      request_id: ctx?.requestId ?? null,
      message,
    };
    if (context) entry.context = redact(context);
    if (error !== undefined) entry.error = redact(error);

    const line = JSON.stringify(entry);
    if (level === 'error') process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
  }
}
