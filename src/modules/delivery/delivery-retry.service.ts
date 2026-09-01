import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { DeliveryService } from './delivery.service';

// Quét lại thông báo QUEUED/PROCESSING bị kẹt (crash giữa persist và SENT).
// Ngưỡng stale đảm bảo không re-dispatch thông báo đang xử lý trong cửa sổ ngắn.
@Injectable()
export class DeliveryRetryService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly notificationRepository: NotificationRepositoryPort,
    private readonly deliveryService: DeliveryService,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.config.delivery.sweepIntervalMs;
    this.timer = setInterval(() => {
      void this.sweep();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep(): Promise<void> {
    const staleBefore = new Date(Date.now() - this.config.config.delivery.staleAfterMs);
    const stuck = await this.notificationRepository.findPendingDelivery(staleBefore, 100);
    for (const notification of stuck) {
      void this.deliveryService
        .dispatch(notification.id)
        .catch((err) => this.logger.error('sweep dispatch failed', err, { event: 'delivery.sweep_failed', notificationId: notification.id }));
    }
  }
}
