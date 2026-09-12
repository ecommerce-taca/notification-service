import type { Request, Response } from 'express';
import { RequestIdMiddleware } from './request-id.middleware';
import { RequestContext } from './request-context';

function makeRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

function makeResponse(): Response {
  return { setHeader: jest.fn() } as unknown as Response;
}

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('should resolve traceId and spanId from a valid traceparent header', () => {
    const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const req = makeRequest({ traceparent });
    let captured: ReturnType<typeof RequestContext.current>;

    middleware.use(req, makeResponse(), () => {
      captured = RequestContext.current();
    });

    expect(captured?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(captured?.spanId).toBe('00f067aa0ba902b7');
  });

  it('should leave spanId undefined when traceparent header is missing', () => {
    const req = makeRequest({});
    let captured: ReturnType<typeof RequestContext.current>;

    middleware.use(req, makeResponse(), () => {
      captured = RequestContext.current();
    });

    expect(captured?.traceId).toBeUndefined();
    expect(captured?.spanId).toBeUndefined();
  });

  it('should leave spanId undefined when traceparent header is malformed', () => {
    const req = makeRequest({ traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736' });
    let captured: ReturnType<typeof RequestContext.current>;

    middleware.use(req, makeResponse(), () => {
      captured = RequestContext.current();
    });

    expect(captured?.spanId).toBeUndefined();
  });
});
