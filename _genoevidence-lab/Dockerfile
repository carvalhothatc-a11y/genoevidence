# GenoLab — imagem de produção (Next.js standalone). Dados persistentes em /data (volume).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 LAB_DATA_DIR=/data TZ=America/Sao_Paulo
# usuário sem privilégios; só /data é gravável
RUN addgroup -S genolab && adduser -S genolab -G genolab && mkdir -p /data && chown genolab:genolab /data
COPY --from=build --chown=genolab:genolab /app/.next/standalone ./
COPY --from=build --chown=genolab:genolab /app/.next/static ./.next/static
COPY --from=build --chown=genolab:genolab /app/public ./public
USER genolab
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/saude || exit 1
CMD ["node", "server.js"]
