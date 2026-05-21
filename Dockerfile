FROM node:20-bookworm-slim AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV INFOMIND_PORT=3456
ENV INFOMIND_DB_PATH=/app/data/infomind.db

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY public ./public
COPY cli ./cli
COPY openclaw ./openclaw

RUN mkdir -p /app/data/covers

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3456/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
