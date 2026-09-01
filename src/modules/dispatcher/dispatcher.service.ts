import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { decryptRecipient } from '../../common/security/recipient-crypto';
import { Notification } from '../../domain/entities/notification.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationCategory } from '../../domain/enums/category.enum';
import { EmailGatewayPort } from '../../domain/ports/email.gateway.port';
import { PreferenceService } from '../preference/preference.service';
import { RenderedMessage, TemplateService } from '../template/template.service';

const LOCALE = 'vi-VN';

export type DispatchOutcome = 'sent' | 'skipped';

// Lỗi gửi email — mang retryable để delivery service quyết định retry.
export class DeliverySendError extends Error {
  constructor(
    readonly errorCode: string,
    readonly retryable: boolean,
  ) {
    super(`delivery send failed: ${errorCode}`);
    this.name = 'DeliverySendError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

@Injectable()
export class DispatcherService {
  constructor(
    private readonly templateService: TemplateService,
    private readonly preferenceService: PreferenceService,
    private readonly emailGateway: EmailGatewayPort,
    private readonly config: AppConfigService,
  ) {}

  async dispatch(notification: Notification): Promise<DispatchOutcome> {
    if (notification.channel === Channel.IN_APP) {
      // In-app đã được persist sẵn; "gửi" chỉ là đánh dấu sẵn sàng.
      return 'sent';
    }

    if (await this.shouldSkip(notification)) {
      return 'skipped';
    }

    if (!notification.recipientEncrypted) {
      throw new AppException(ErrorCode.NOTIFICATION_INVALID_INPUT, {
        context: { notificationId: notification.id },
      });
    }

    const recipient = decryptRecipient(notification.recipientEncrypted, this.config.config.recipientEncryptionSecret);
    const rendered = await this.renderMessage(notification);
    const result = await this.emailGateway.send({ to: recipient, subject: rendered.title, html: rendered.body });
    if (!result.success) {
      throw new DeliverySendError(result.errorCode ?? 'SMTP_UNKNOWN', result.retryable);
    }
    return 'sent';
  }

  private async shouldSkip(notification: Notification): Promise<boolean> {
    // Security-critical (verification/reset/OTP) không bị tắt bởi preference.
    if (notification.category === NotificationCategory.SECURITY) return false;
    return this.preferenceService.isDisabled(notification.recipientUserId, notification.channel, notification.category);
  }

  private async renderMessage(notification: Notification): Promise<RenderedMessage> {
    const template = await this.templateService.resolve(
      notification.templateKey,
      notification.templateVersion,
      LOCALE,
    );
    // data đã được lọc theo allowlist ở consumer; render trực tiếp.
    return this.templateService.render(template, notification.data ?? {});
  }
}
