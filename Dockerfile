# syntax=docker/dockerfile:1.7

# La aplicación se construye en el host con deploy.sh. Esta imagen solo empaqueta
# el .next ya generado y prepara un runtime reproducible para Docker.
FROM node:22-alpine

ARG SOLOWEED_RELEASE_SHA=unknown
ARG SOLOWEED_BUILD_TIME=unknown

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    SOLOWEED_RELEASE_SHA=$SOLOWEED_RELEASE_SHA \
    SOLOWEED_BUILD_TIME=$SOLOWEED_BUILD_TIME

WORKDIR /app

# Prisma y los binarios nativos de Next necesitan estas librerias en Alpine.
RUN apk add --no-cache ca-certificates openssl libc6-compat

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# El build no debe recibir ni necesitar la credencial productiva.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    npm ci --omit=dev --ignore-scripts \
  && DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    npx prisma generate \
  && npm cache clean --force

RUN addgroup -S -g 1001 nodejs \
  && adduser -S -D -H -u 1001 -G nodejs nextjs \
  && mkdir -p /app/reports/catalog-audit \
  && chown -R nextjs:nodejs /app

# .next debe existir porque deploy.sh ejecuta el build en el host antes de
# docker compose build. Copiar solo los artefactos necesarios reduce superficie.
COPY --chown=nextjs:nodejs .next ./.next
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs next.config.ts ./next.config.ts
COPY --chown=nextjs:nodejs scripts/validate-runtime-env.mjs ./scripts/validate-runtime-env.mjs

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
