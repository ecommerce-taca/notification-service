import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { RequestContext } from '../../common/http/request-context';

// Các role admin (System_Overview §6.3 + auth-user §5.3). Chạy sau AuthGuard.
const ADMIN_ROLES = ['SUPER_ADMIN', 'RISK_MANAGER', 'CATALOG_ADMIN', 'FINANCE_OPS', 'SUPPORT_VIEWER'];

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const roles = RequestContext.getRoles();
    const isAdmin = roles.some((role) => ADMIN_ROLES.includes(role));
    if (!isAdmin) {
      throw new AppException(ErrorCode.NOTIFICATION_FORBIDDEN);
    }
    return true;
  }
}
