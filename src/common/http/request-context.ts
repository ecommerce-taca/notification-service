import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextData {
  requestId: string;
  traceId?: string;
  userId?: string;
  roles?: string[];
}

const storage = new AsyncLocalStorage<RequestContextData>();

// requestId/traceId đi ngầm qua context, không truyền tay qua tham số hàm.
// Biên vào (middleware) sinh context; mọi tầng khác chỉ đọc.
export const RequestContext = {
  run<T>(context: RequestContextData, fn: () => T): T {
    return storage.run(context, fn);
  },

  current(): RequestContextData | undefined {
    return storage.getStore();
  },

  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },

  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },

  getUserId(): string | undefined {
    return storage.getStore()?.userId;
  },

  getRoles(): string[] {
    return storage.getStore()?.roles ?? [];
  },

  setUser(userId: string, roles: string[]): void {
    const store = storage.getStore();
    if (!store) return;
    store.userId = userId;
    store.roles = roles;
  },
};
