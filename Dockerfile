# Stage 1: Build application
FROM node:20-slim AS builder
WORKDIR /app

# Dùng trực tiếp npm chuẩn của Node.js (loại bỏ hoàn toàn các lỗi bảo mật/symlink/kẹt build của pnpm)
COPY package.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx next build

# Stage 2: Production runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cài đặt quyền hạn và thư mục lưu trữ SQLite
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 -g nodejs nextjs && \
    mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data

# Sao chép các tệp đã build từ builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Sao chép native bindings của better-sqlite3
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Đảm bảo thư mục public tồn tại
RUN mkdir -p /app/public && chown -R nextjs:nodejs /app/public

USER nextjs

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "server.js"]
