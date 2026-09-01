import { Module } from '@nestjs/common';
import { TokenVerifierPort } from '../../domain/ports/token-verifier.port';
import { AdminGuard } from './admin.guard';
import { AuthGuard } from './auth.guard';
import { JwtTokenVerifier } from './jwt.token-verifier';

@Module({
  providers: [
    { provide: TokenVerifierPort, useClass: JwtTokenVerifier },
    AuthGuard,
    AdminGuard,
  ],
  exports: [TokenVerifierPort, AuthGuard, AdminGuard],
})
export class AuthModule {}
