# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# ADA Encurta — imagem de produção (Next.js standalone)
#   docker compose --profile app up --build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL só é lida em runtime; um valor fictício satisfaz o prisma generate.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm prisma generate && pnpm next build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Prisma CLI + migrations para `prisma migrate deploy` no boot
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=build --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
