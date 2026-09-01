import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { uuidv7 } from '../id/uuidv7';
import { RequestContext } from './request-context';

const REQUEST_ID_MAX_LENGTH = 64;
// charset an toàn cho X-Request-ID, khớp quy ước gateway
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

function resolveRequestId(header: unknown): string {
  if (typeof header !== 'string' || header.length === 0 || header.length > REQUEST_ID_MAX_LENGTH) {
    return uuidv7();
  }
  if (!REQUEST_ID_PATTERN.test(header)) {
    return uuidv7();
  }
  return header;
}

// traceparent dạng "00-<trace_id 32 hex>-<span_id 16 hex>-<flags>"
function resolveTraceId(header: unknown): string | undefined {
  if (typeof header !== 'string') return undefined;
  const parts = header.split('-');
  if (parts.length !== 4) return undefined;
  return parts[1] || undefined;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = resolveRequestId(req.headers['x-request-id']);
    const traceId = resolveTraceId(req.headers['traceparent']);

    res.setHeader('X-Request-ID', requestId);

    RequestContext.run({ requestId, traceId }, () => next());
  }
}
