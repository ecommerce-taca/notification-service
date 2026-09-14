import { NotificationAudit } from '../entities/notification-audit.entity';

export abstract class NotificationAuditRepositoryPort {
  abstract save(audit: NotificationAudit): Promise<NotificationAudit>;
}
