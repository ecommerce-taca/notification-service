import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../../domain/entities/notification.entity';
import { Channel } from '../../../domain/enums/channel.enum';
import { NotificationStatus } from '../../../domain/enums/notification-status.enum';
import { ReadStatus } from '../../../domain/enums/read-status.enum';
import {
  DeliveryQuery,
  NotificationListQuery,
  NotificationPagedResult,
  NotificationRepositoryPort,
  NotificationStatusPatch,
} from '../../../domain/ports/notification.repository.port';

@Injectable()
export class NotificationTypeOrmRepository implements NotificationRepositoryPort {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async save(notification: Notification): Promise<Notification> {
    return this.repo.save(notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdAndRecipient(id: string, recipientUserId: string): Promise<Notification | null> {
    return this.repo.findOne({ where: { id, recipientUserId } });
  }

  async findByDedupeKey(recipientUserId: string, dedupeKey: string, channel: Channel): Promise<Notification | null> {
    return this.repo.findOne({ where: { recipientUserId, dedupeKey, channel } });
  }

  async findPaged(query: NotificationListQuery): Promise<NotificationPagedResult> {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.recipient_user_id = :recipientUserId', { recipientUserId: query.recipientUserId })
      // notification center chỉ hiển thị in-app; email không nằm trong danh sách này.
      .andWhere('n.channel = :channel', { channel: Channel.IN_APP });

    if (query.readStatus && query.readStatus !== 'ALL') {
      qb.andWhere('n.read_status = :readStatus', { readStatus: query.readStatus });
    }
    if (query.category) {
      qb.andWhere('n.category = :category', { category: query.category });
    }

    // Tiebreak theo _id: created_at là DATETIME(6) nên các row tạo cùng batch có thể trùng khít,
    // thiếu khoá phụ thì thứ tự giữa chúng không ổn định → phân trang lặp/sót row.
    qb.orderBy('n.created_at', 'DESC')
      .addOrderBy('n._id', 'DESC')
      .skip((query.page - 1) * query.size)
      .take(query.size);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async countUnread(recipientUserId: string): Promise<number> {
    return this.repo.count({
      where: { recipientUserId, channel: Channel.IN_APP, readStatus: ReadStatus.UNREAD },
    });
  }

  async markRead(id: string, recipientUserId: string): Promise<void> {
    await this.repo.update(
      { id, recipientUserId, channel: Channel.IN_APP },
      { readStatus: ReadStatus.READ },
    );
  }

  async markAllRead(recipientUserId: string, before: Date | null): Promise<number> {
    const qb = this.repo
      .createQueryBuilder()
      .update()
      .set({ readStatus: ReadStatus.READ })
      .where('recipient_user_id = :recipientUserId', { recipientUserId })
      .andWhere('channel = :channel', { channel: Channel.IN_APP })
      .andWhere('read_status = :readStatus', { readStatus: ReadStatus.UNREAD });

    if (before) {
      qb.andWhere('created_at <= :before', { before });
    }

    const result = await qb.execute();
    return result.affected ?? 0;
  }

  async updateStatus(id: string, status: NotificationStatus, patch: NotificationStatusPatch = {}): Promise<void> {
    await this.repo.update({ id }, { status, ...patch });
  }

  async tryClaimProcessing(id: string, staleBefore: Date): Promise<boolean> {
    // Atomic claim chống race: nhiều worker cùng claim chỉ 1 thắng. QUEUED luôn claim được;
    // PROCESSING chỉ claim được khi lease đã hết hạn (processing_started_at cũ hơn staleBefore).
    const result = await this.repo
      .createQueryBuilder()
      .update()
      .set({ status: NotificationStatus.PROCESSING, processingStartedAt: new Date() })
      .where('_id = :id', { id })
      .andWhere('(status = :queued OR (status = :processing AND processing_started_at < :staleBefore))', {
        queued: NotificationStatus.QUEUED,
        processing: NotificationStatus.PROCESSING,
        staleBefore,
      })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async findPendingDelivery(staleBefore: Date, limit: number): Promise<Notification[]> {
    // Ứng viên cần re-dispatch: QUEUED bị kẹt (crash sau persist) hoặc PROCESSING có lease hết hạn.
    // Claim thật vẫn do tryClaimProcessing gate — ở đây chỉ lọc ứng viên.
    return this.repo
      .createQueryBuilder('n')
      .where(
        '(n.status = :queued AND n.updated_at < :staleBefore) OR ' +
          '(n.status = :processing AND (n.processing_started_at < :staleBefore OR n.processing_started_at IS NULL))',
        { queued: NotificationStatus.QUEUED, processing: NotificationStatus.PROCESSING, staleBefore },
      )
      .orderBy('n.created_at', 'ASC')
      .take(limit)
      .getMany();
  }

  async findDeliveries(query: DeliveryQuery): Promise<NotificationPagedResult> {
    const qb = this.repo.createQueryBuilder('n');

    if (query.status) qb.andWhere('n.status = :status', { status: query.status });
    if (query.channel) qb.andWhere('n.channel = :channel', { channel: query.channel });
    if (query.template) qb.andWhere('n.template_key = :template', { template: query.template });
    if (query.recipientHash) qb.andWhere('n.recipient_hash = :hash', { hash: query.recipientHash });
    if (query.from) qb.andWhere('n.created_at >= :from', { from: query.from });
    if (query.to) qb.andWhere('n.created_at <= :to', { to: query.to });

    // Cùng lý do tiebreak như findPaged.
    qb.orderBy('n.created_at', 'DESC')
      .addOrderBy('n._id', 'DESC')
      .skip((query.page - 1) * query.size)
      .take(query.size);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
