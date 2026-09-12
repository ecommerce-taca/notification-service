import { AppLogger } from './app.logger';
import { AppConfigService } from '../../config/app-config';
import { RequestContext } from '../http/request-context';

function makeConfig(): AppConfigService {
  return {
    config: { serviceName: 'notification-service', env: 'test', serviceVersion: '0.1.0' },
  } as unknown as AppConfigService;
}

describe('AppLogger', () => {
  let logger: AppLogger;
  let writeSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLogger(makeConfig());
    writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  function lastLoggedEntry(): Record<string, unknown> {
    const line = writeSpy.mock.calls[0]?.[0] as string;
    return JSON.parse(line);
  }

  it('should log the spanId from context when present', () => {
    RequestContext.run({ requestId: 'req-1', traceId: 'trace-1', spanId: 'span-1' }, () => {
      logger.info('hello');
    });

    expect(lastLoggedEntry().span_id).toBe('span-1');
  });

  it('should log span_id as null when context has no spanId', () => {
    RequestContext.run({ requestId: 'req-1' }, () => {
      logger.info('hello');
    });

    expect(lastLoggedEntry().span_id).toBeNull();
  });
});
