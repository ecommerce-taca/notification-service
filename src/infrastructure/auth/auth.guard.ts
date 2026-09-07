import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { RequestContext } from '../../common/http/request-context';
import { TokenVerifierPort } from '../../domain/ports/token-verifier.port';

// Xác thực Bearer token, gắn danh tính vào RequestContext để service đọc (không truyền tay).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenVerifier: TokenVerifierPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw new AppException(ErrorCode.NOTIFICATION_UNAUTHENTICATED);
    }

    const accessToken = header.slice('Bearer '.length).trim();
    const user = await this.tokenVerifier.verify(accessToken);
    RequestContext.setUser(user.userId, user.roles);
    return true;
  }
}
