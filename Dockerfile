# Stage 1: Build application
FROM node:20-slim AS builder
WORKDIR /app

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

# Sao chép toàn bộ standalone build và toàn bộ node_modules (chứa đầy đủ bindings, better-sqlite3, ssh2)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/data /app/public

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "server.js"]
