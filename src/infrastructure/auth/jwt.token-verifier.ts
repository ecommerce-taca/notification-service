import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppConfigService } from '../../config/app-config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { AuthenticatedUser, TokenVerifierPort } from '../../domain/ports/token-verifier.port';

// Verify JWT RS256 qua JWKS của auth-user. Bọc sau TokenVerifierPort để đổi cơ chế
// (mTLS/service token) không đụng business code.
@Injectable()
export class JwtTokenVerifier implements TokenVerifierPort {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: AppConfigService) {
    this.jwks = createRemoteJWKSet(new URL(this.config.config.jwt.jwksUrl));
  }

  async verify(accessToken: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(accessToken, this.jwks, {
        issuer: this.config.config.jwt.issuer,
        audience: this.config.config.jwt.audience,
      });
      return {
        userId: typeof payload.sub === 'string' ? payload.sub : '',
        roles: Array.isArray(payload.roles) ? payload.roles.filter((r): r is string => typeof r === 'string') : [],
        permissions: Array.isArray(payload.permissions)
          ? payload.permissions.filter((p): p is string => typeof p === 'string')
          : [],
      };
    } catch {
      throw new AppException(ErrorCode.NOTIFICATION_UNAUTHENTICATED);
    }
  }
}
