import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppLogger } from '../logging/app.logger';
import { RequestContext } from './request-context';

// Log một dòng mỗi request ở biên vào (method, path, status, latency) — không log tay trong controller.
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const route = req.originalUrl?.split('?')[0] ?? req.path;
    // Bắt context ngay khi còn trong ALS; callback finish chạy sau khi request xong (ngoài ALS).
    const context = RequestContext.current();

    res.on('finish', () => {
      const log = () =>
        this.logger.info('http request', {
          event: 'http.request',
          route,
          method: req.method,
          status_code: res.statusCode,
          duration_ms: Date.now() - startedAt,
        });
      if (context) RequestContext.run(context, log);
      else log();
    });

    next();
  }
}
