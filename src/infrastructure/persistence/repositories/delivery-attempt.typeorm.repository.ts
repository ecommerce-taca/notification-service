import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DeliveryAttempt } from '../../../domain/entities/delivery-attempt.entity';
import { DeliveryAttemptRepositoryPort } from '../../../domain/ports/delivery-attempt.repository.port';

@Injectable()
export class DeliveryAttemptTypeOrmRepository implements DeliveryAttemptRepositoryPort {
  constructor(
    @InjectRepository(DeliveryAttempt)
    private readonly repo: Repository<DeliveryAttempt>,
  ) {}

  async save(attempt: DeliveryAttempt): Promise<DeliveryAttempt> {
    return this.repo.save(attempt);
  }

  async findByNotification(notificationId: string): Promise<DeliveryAttempt[]> {
    return this.repo.find({
      where: { notificationId },
      order: { attemptNo: 'ASC' },
    });
  }

  async findByNotificationIds(notificationIds: string[]): Promise<DeliveryAttempt[]> {
    if (notificationIds.length === 0) return [];
    return this.repo.find({
      where: { notificationId: In(notificationIds) },
      order: { attemptNo: 'ASC' },
    });
  }

  async countByNotification(notificationId: string): Promise<number> {
    return this.repo.count({ where: { notificationId } });
  }
}
