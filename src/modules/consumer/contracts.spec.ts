import { extractRecipient } from './contracts';

describe('extractRecipient', () => {
  it('should read payload.buyer.user_id/email (field đã chốt) — usedFallback=false', () => {
    const result = extractRecipient({
      buyer: { user_id: 'user-1', email: 'buyer@example.com' },
      order_id: 'order-1',
    });

    expect(result).toEqual({ userId: 'user-1', email: 'buyer@example.com', usedFallback: false });
  });

  it('should treat buyer.email as optional (null khi thiếu) mà vẫn không fallback', () => {
    const result = extractRecipient({ buyer: { user_id: 'user-1' } });

    expect(result).toEqual({ userId: 'user-1', email: null, usedFallback: false });
  });

  it('should fallback sang payload.recipient.user_id khi thiếu field buyer, usedFallback=true', () => {
    const result = extractRecipient({ recipient: { user_id: 'user-1', email: 'buyer@example.com' } });

    expect(result).toEqual({ userId: 'user-1', email: 'buyer@example.com', usedFallback: true });
  });

  it('should fallback sang flat payload.user_id/email, usedFallback=true', () => {
    const result = extractRecipient({ user_id: 'user-1', email: 'buyer@example.com' });

    expect(result).toEqual({ userId: 'user-1', email: 'buyer@example.com', usedFallback: true });
  });

  it('should trả userId=null, usedFallback=true khi không có field nào khớp', () => {
    const result = extractRecipient({});

    expect(result).toEqual({ userId: null, email: null, usedFallback: true });
  });
});
