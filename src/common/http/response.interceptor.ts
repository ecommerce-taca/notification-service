import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isEnveloped, ApiResponse } from './api-response';
import { RequestContext } from './request-context';

// Bọc mọi response vào envelope {data, meta:{request_id,...}}.
// Controller trả data thuần hoặc dùng respond(data, meta) khi cần thêm meta (page/size/total...).
// Health endpoint nằm ngoài envelope -> bỏ qua.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path.startsWith('/health')) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    const requestId = RequestContext.getRequestId() ?? '';
    return next.handle().pipe(
      map((payload) => {
        if (isEnveloped(payload)) {
          return { data: payload.data as T, meta: { ...payload.meta, request_id: requestId } };
        }
        return { data: payload ?? (null as unknown as T), meta: { request_id: requestId } };
      }),
    );
  }
}
