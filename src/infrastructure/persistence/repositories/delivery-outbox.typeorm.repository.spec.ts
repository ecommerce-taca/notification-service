import { DataSource } from 'typeorm';
import { DeliveryOutboxTypeOrmRepository } from './delivery-outbox.typeorm.repository';
import { DeliveryOutbox } from '../../../domain/entities/delivery-outbox.entity';

function setup() {
  const repo = { increment: jest.fn().mockResolvedValue(undefined) };
  const dataSource = {
    getRepository: jest.fn().mockReturnValue(repo),
  } as unknown as jest.Mocked<DataSource>;
  const adapter = new DeliveryOutboxTypeOrmRepository(dataSource);
  return { adapter, dataSource, repo };
}

describe('DeliveryOutboxTypeOrmRepository.incrementRetryCount', () => {
  it('should increment retry_count by 1 via atomic TypeORM increment, không đọc-ghi lại cả record', async () => {
    const { adapter, dataSource, repo } = setup();

    await adapter.incrementRetryCount('outbox-1');

    expect(dataSource.getRepository).toHaveBeenCalledWith(DeliveryOutbox);
    expect(repo.increment).toHaveBeenCalledTimes(1);
    expect(repo.increment).toHaveBeenCalledWith({ id: 'outbox-1' }, 'retryCount', 1);
  });

  it('should tăng đúng 1 mỗi lần gọi, không cộng dồn phía client (mỗi lần là 1 UPDATE +1 độc lập)', async () => {
    const { adapter, repo } = setup();

    await adapter.incrementRetryCount('outbox-1');
    await adapter.incrementRetryCount('outbox-1');
    await adapter.incrementRetryCount('outbox-1');

    expect(repo.increment).toHaveBeenCalledTimes(3);
    for (let i = 1; i <= 3; i++) {
      expect(repo.increment).toHaveBeenNthCalledWith(i, { id: 'outbox-1' }, 'retryCount', 1);
    }
  });
});
