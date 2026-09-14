export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId: string | null;
  providerStatus: string;
  errorCode: string | null;
  retryable: boolean;
}

export abstract class EmailGatewayPort {
  abstract send(input: SendEmailInput): Promise<SendEmailResult>;
}
