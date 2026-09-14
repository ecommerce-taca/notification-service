import { Module } from '@nestjs/common';
import { EmailGatewayPort } from '../../domain/ports/email.gateway.port';
import { SmtpEmailGateway } from './smtp.email.gateway';

@Module({
  providers: [{ provide: EmailGatewayPort, useClass: SmtpEmailGateway }],
  exports: [EmailGatewayPort],
})
export class EmailModule {}
