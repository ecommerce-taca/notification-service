import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationAudit } from '../../../domain/entities/notification-audit.entity';
import { NotificationAuditRepositoryPort } from '../../../domain/ports/notification-audit.repository.port';

@Injectable()
export class NotificationAuditTypeOrmRepository implements NotificationAuditRepositoryPort {
  constructor(
    @InjectRepository(NotificationAudit)
    private readonly repo: Repository<NotificationAudit>,
  ) {}

  async save(audit: NotificationAudit): Promise<NotificationAudit> {
    return this.repo.save(audit);
  }
}
