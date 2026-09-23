# Taca — Notification Service

[![CI](https://github.com/ecommerce-taca/notification-service/actions/workflows/ci.yml/badge.svg)](https://github.com/ecommerce-taca/notification-service/actions/workflows/ci.yml)

Service gửi thông báo của nền tảng thương mại điện tử **Taca**. Service nhận command/event từ **Kafka**, render template rồi gửi **Email** (SMTP) và **In-app**. Mỗi lần gửi được lưu log và retry khi lỗi. Service cũng cung cấp REST API cho notification center (danh sách, số chưa đọc, đánh dấu đã đọc, preference).

**Stack:** Node.js 20 · NestJS 10 · MySQL 8 (TypeORM) · Kafka · Nodemailer

## Biến môi trường quan trọng

Xem đầy đủ trong [`.env.example`](.env.example). Thiếu biến bắt buộc thì app dừng ngay khi khởi động.

| Biến | Mô tả |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Kết nối MySQL |
| `KAFKA_BROKERS` | Danh sách broker, ngăn cách bằng dấu phẩy |
| `KAFKA_TOPIC_COMMANDS` | Topic nhận command, mặc định `notification.commands.v1` |
| `KAFKA_TOPIC_DOMAIN_EVENTS` | Các topic domain event cần nghe (order, invoice, shipment, payment, wallet) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP server |
| `EMAIL_FROM_ADDRESS` | Địa chỉ người gửi |
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_JWKS_URL` | Xác thực JWT qua JWKS của auth-user |
| `RECIPIENT_HASH_SECRET`, `RECIPIENT_ENCRYPTION_SECRET` | Tối thiểu 32 ký tự, dùng để hash và mã hoá email người nhận |

## Cách chạy

**Docker Compose (khuyên dùng).** Lệnh này dựng sẵn MySQL, Kafka, Mailhog, mock JWKS, chạy migration + seed và khởi động app.

```bash
cp .env.example .env                  # đặt DB_PASSWORD=notification, sửa các secret
node scripts/mock-auth/generate.mjs   # sinh JWKS + in ra test-JWT
docker compose up -d --build
```

- API: http://localhost:8080 (health check: `/health/ready`)
- Mailhog, để xem email đã gửi: http://localhost:8025
- Gửi thử một email: `./scripts/send-test-notification.sh you@example.com`

**Chạy trực tiếp.** Cần có sẵn MySQL, Kafka và SMTP.

```bash
npm ci
npm run migration:run && npm run seed
npm run start:dev
```

**Test:** `npm run typecheck && npm test`

## Lưu ý

- **Không có API public để gửi thông báo.** Các service khác phải publish event/command lên Kafka. Command chỉ nhận 5 loại: `AUTH_VERIFICATION_REQUESTED`, `PASSWORD_RESET_REQUESTED`, `PHONE_OTP_REQUESTED`, `MESSAGE_RECEIVED`, `REVIEW_REQUESTED`.
- **Topic Kafka phải được tạo trước** khi app khởi động, vì consumer subscribe không tự tạo topic. Docker Compose đã có service `kafka-init` làm việc này.
- **Channel v1 chỉ có `EMAIL` và `IN_APP`.** Command có channel `SMS` (vd. `PHONE_OTP_REQUESTED`) sẽ bị từ chối.
- **Có thể gửi trùng email.** Service chỉ bảo đảm at-least-once, kèm dedupe theo `event_id` / `dedupe_key`. Mỗi thông báo được gửi tối đa 3 lần, cách nhau 2 giây.
- **Category `SECURITY` không tắt được qua preference** (xác thực, reset mật khẩu, OTP).
- **Dùng Gmail:** đặt `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` và dùng **App Password**, không dùng mật khẩu thường.
- **CI/CD:** mỗi lần push lên `main`, CI build và push image lên Docker Hub với tag `latest` và `<commit-sha>`. Cần 2 secret `DOCKERHUB_USERNAME` và `DOCKERHUB_TOKEN`.

Spec chi tiết (LLD, API, DB) nằm ở repo tài liệu, thư mục `docs/notification-docs/`.
