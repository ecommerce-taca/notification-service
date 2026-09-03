// Sinh cặp khóa RSA + JWKS + test-JWT cho local (mock auth-user).
// Lần đầu chạy tạo scripts/mock-auth/.well-known/jwks.json (public) + private.jwk.json (bí mật).
// Mỗi lần chạy in ra 1 test-JWT (hết hạn 2h) để dùng với header Authorization.
// Usage: node scripts/mock-auth/generate.mjs
import { generateKeyPair, exportJWK, importJWK, SignJWT } from 'jose';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'scripts/mock-auth';
const PRIVATE_PATH = `${DIR}/private.jwk.json`;
const JWKS_PATH = `${DIR}/.well-known/jwks.json`;

const ISSUER = 'https://auth.taca.vn';
const AUDIENCE = 'taca-api';
const KID = 'mock-auth-key';

async function main() {
  let privateKey;
  if (existsSync(PRIVATE_PATH)) {
    privateKey = await importJWK(JSON.parse(readFileSync(PRIVATE_PATH, 'utf8')), 'RS256');
  } else {
    const { publicKey, privateKey: priv } = await generateKeyPair('RS256');
    mkdirSync(`${DIR}/.well-known`, { recursive: true });
    const jwk = await exportJWK(publicKey);
    jwk.kid = KID;
    jwk.use = 'sig';
    jwk.alg = 'RS256';
    writeFileSync(JWKS_PATH, JSON.stringify({ keys: [jwk] }, null, 2));
    writeFileSync(PRIVATE_PATH, JSON.stringify(await exportJWK(priv), null, 2));
    privateKey = priv;
  }

  const token = await new SignJWT({ roles: ['BUYER'] })
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject('user-1')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);

  console.log('TEST_JWT (user-1, role BUYER, hết hạn 2h):');
  console.log(token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
