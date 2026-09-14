export interface AuthenticatedUser {
  userId: string;
  roles: string[];
  permissions: string[];
}

// Xác thực access token (JWT RS256 qua JWKS của auth-user). Bọc lại để đổi cơ chế
// (mTLS, service token) không đụng business code.
export abstract class TokenVerifierPort {
  abstract verify(accessToken: string): Promise<AuthenticatedUser>;
}
