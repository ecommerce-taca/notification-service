# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app
# Copy manifest trước để tận dụng cache layer khi source đổi mà dependency không đổi
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Non-root user để giảm bề mặt tấn công
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder --chown=app:app /app/dist ./dist
USER app
EXPOSE 8080
# exec form để SIGTERM tới đúng process, graceful shutdown hoạt động
CMD ["node", "dist/main.js"]
