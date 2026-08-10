# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Prisma necesita OpenSSL en build y runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# URL ficticia y no enrutable: Prisma generate necesita una URL sintácticamente
# válida, pero el build jamás debe recibir la credencial productiva.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm ci

FROM base AS builder

ARG NEXT_PUBLIC_SITE_URL=https://soloweed.store
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# generateStaticParams tolera que la URL ficticia no tenga PostgreSQL detrás.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build SKIP_DATABASE_STATIC_PARAMS=1 npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/validate-runtime-env.mjs ./scripts/validate-runtime-env.mjs

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
