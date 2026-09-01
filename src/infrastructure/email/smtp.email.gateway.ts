import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config';
import { AppLogger } from '../../common/logging/app.logger';
import { EmailGatewayPort, SendEmailInput, SendEmailResult } from '../../domain/ports/email.gateway.port';

interface NodemailerError {
  responseCode?: number;
  code?: string;
  message?: string;
}

@Injectable()
export class SmtpEmailGateway implements EmailGatewayPort {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    const smtp = this.config.config.smtp;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const smtp = this.config.config.smtp;
    try {
      const info = await this.transporter.sendMail({
        from: `"${smtp.fromName}" <${smtp.fromAddress}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      return {
        success: true,
        providerMessageId: info.messageId ?? null,
        providerStatus: 'delivered',
        errorCode: null,
        retryable: false,
      };
    } catch (err) {
      const { errorCode, retryable } = this.classifyError(err as NodemailerError);
      this.logger.warn('smtp send failed', { event: 'email.send_failed', errorCode });
      return {
        success: false,
        providerMessageId: null,
        providerStatus: retryable ? 'temporary_failure' : 'bounced',
        errorCode,
        retryable,
      };
    }
  }

  // Dịch lỗi SMTP -> mã lỗi + có retry được không. 5xx = từ chối vĩnh viễn, 4xx/timeout = tạm thời.
  private classifyError(err: NodemailerError): { errorCode: string; retryable: boolean } {
    if (err.responseCode && err.responseCode >= 500) {
      return { errorCode: 'SMTP_REJECTED', retryable: false };
    }
    if (err.responseCode && err.responseCode >= 400) {
      return { errorCode: 'SMTP_TRANSIENT', retryable: true };
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ECONNECTION') {
      return { errorCode: 'SMTP_TIMEOUT', retryable: true };
    }
    return { errorCode: 'SMTP_UNKNOWN', retryable: true };
  }
}
