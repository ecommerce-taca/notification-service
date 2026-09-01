# Code Overview — Notification Service

> Bảng tóm tắt để đọc hiểu nhanh. Chi tiết spec: `docs/notification-docs/`.

## 1. Service làm gì (1 dòng)

Nhận notification command/event từ **Kafka** → resolve template + render → gửi **Email / In-app** → lưu delivery log + retry (3 lần, backoff 2s) → cung cấp **API** để đọc notification center.

## 2. Cấu trúc thư mục

```
src/
├── main.ts · app.module.ts        # bootstrap, wire module, middleware
├── config/                        # env validate (zod, fail-fast) + AppConfigService
├── common/
│   ├── http/                      # request-context (ALS), middleware, response.interceptor, filter
│   ├── errors/                    # ErrorCode catalog + AppException + AllExceptionsFilter
│   ├── logging/                   # JSON logger + redaction
│   ├── security/                  # recipient-masking (hash/mask), recipient-crypto (AES-256-GCM)
│   └── id/                        # uuidv7 (tự viết)
├── domain/
│   ├── enums/                     # Channel, NotificationStatus, AttemptStatus, ReadStatus, ...
│   ├── entities/                  # 6 entity TypeORM
│   └── ports/                     # 11 abstract class (repo + gateway) — business code chỉ biết port
├── modules/                       # business logic (không import SDK ngoài)
│   ├── consumer/                  # nhận command/event, dedupe, persist, dispatch
│   ├── template/                  # resolve + render (handlebars) + allowlist
│   ├── preference/                # user preference + locked SECURITY
│   ├── dispatcher/                # route EMAIL/IN_APP, preference policy, critical bypass
│   ├── delivery/                  # retry/backoff/attempt + sweeper hồi phục
│   ├── in-app/                    # notification center (list/unread/read/preferences)
│   ├── admin/                     # admin delivery diagnostics
│   └── health/                    # /health/live + /health/ready
└── infrastructure/
    ├── persistence/               # repo impl, migrations 001–008, seed, data-source
    ├── email/                     # SmtpEmailGateway (nodemailer)
    ├── messaging/                 # Kafka consumer + event publisher (kafkajs)
    ├── auth/                      # JWT verifier (jose/JWKS) + AuthGuard/AdminGuard
    └── common/                    # SystemClock, UuidV7IdGenerator
```

## 3. Luồng chính

```
Kafka command/event
  └─> NotificationConsumer (validate envelope, dedupe qua processed_events + findByDedupeKey)
        └─> persist Notification (QUEUED) + ProcessedEvent
              └─> DeliveryService.dispatch (retry 3 lần, backoff 2s)
                    └─> DispatcherService (route channel + preference + render)
                          ├─ EMAIL  -> SmtpEmailGateway (nodemailer)
                          └─ IN_APP -> chỉ đánh dấu SENT (đã persist sẵn)
                    └─> cập nhật SENT / SKIPPED / FAILED + ghi DeliveryAttempt
```

## 4. Endpoint

| Method | Path | Chức năng | Auth |
|---|---|---|---|
| GET | `/api/v1/notifications` | List in-app (page/size/read_status/category) | JWT |
| GET | `/api/v1/notifications/unread-count` | Số chưa đọc | JWT |
| PATCH | `/api/v1/notifications/{id}/read` | Đánh dấu đã đọc (idempotent) | JWT |
| PATCH | `/api/v1/notifications/read-all` | Đọc tất cả (có `before`) | JWT |
| GET | `/api/v1/notifications/preferences` | Xem preferences | JWT |
| PUT | `/api/v1/notifications/preferences` | Sửa preference (SECURITY khóa) | JWT |
| GET | `/api/v1/admin/notifications/deliveries` | Delivery diagnostics (masked) | JWT + admin |
| GET | `/health/live` · `/health/ready` | Liveness / readiness | Ops |

Envelope: thành công `{data, meta:{request_id,...}}`, lỗi `{error:{code,message,details,trace_id}}`.

## 5. Bảng (6 entity)

| Entity | Bảng MySQL | Vai trò |
|---|---|---|
| `Notification` | `notifications` | 1 thông báo (recipient mã hoá, category, reference) |
| `Template` | `templates` | template versioned (key/version/locale/subject/body) |
| `NotificationPreference` | `notification_preferences` | user preference (unique user+channel+category, `locked`) |
| `DeliveryAttempt` | `delivery_attempts` | 1 lần gửi (attempt_no, provider, status, error_code) |
| `ProcessedEvent` | `processed_events` | dedupe theo event_id/dedupe_key |
| `NotificationAudit` | `notification_audits` | audit actor/action/target |

## 6. Enums

| Enum | Giá trị |
|---|---|
| `Channel` | `EMAIL`, `IN_APP` |
| `NotificationStatus` | `QUEUED`, `PROCESSING`, `SENT`, `FAILED`, `SKIPPED`, `EXPIRED` |
| `AttemptStatus` | `STARTED`, `SENT`, `RETRYABLE_FAILED`, `PERMANENT_FAILED` |
| `ReadStatus` | `UNREAD`, `READ` |
| `PreferenceStatus` | `ENABLED`, `DISABLED` |
| `NotificationCategory` | `ORDER`, `SHIPMENT`, `PAYMENT`, `REVIEW`, `CONVERSATION`, `SHOP`, `SECURITY`, `MARKETING` |

## 7. Port (tầng trong) → Adapter (tầng ngoài)

| Port (`domain/ports/`) | Adapter (`infrastructure/`) |
|---|---|
| `EmailGatewayPort` | `SmtpEmailGateway` (nodemailer) |
| `TokenVerifierPort` | `JwtTokenVerifier` (jose + JWKS) |
| `EventPublisherPort` | `KafkaEventPublisher` (kafkajs) |
| `Clock` / `IdGenerator` | `SystemClock` / `UuidV7IdGenerator` |
| 6 × `*RepositoryPort` | 6 × `*TypeOrmRepository` |

## 8. Cấu hình (env)

- **Bắt buộc:** `DB_*`, `KAFKA_BROKERS`, `SMTP_HOST`, `EMAIL_FROM_ADDRESS`, `JWT_ISSUER/AUDIENCE/JWKS_URL`, `RECIPIENT_HASH_SECRET`, `RECIPIENT_ENCRYPTION_SECRET`.
- **Tuỳ chọn:** `SMTP_USER/PASSWORD` (Gmail), `DELIVERY_*`.
- Local dev: secret nằm ở `.env` (gitignored), nạp qua `env_file:` trong `docker-compose.yml`.

## 9. Chạy & test

```bash
docker compose up -d --build      # dựng cả stack
npm test                          # unit test (24 test)
node scripts/mock-auth/generate.mjs               # sinh test-JWT
./scripts/send-test-notification.sh <email>       # gửi email test
```
