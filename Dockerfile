FROM node:20-bookworm-slim AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV INFOMIND_PORT=3456
ENV INFOMIND_DB_PATH=/app/data/infomind.db
ENV INFOMIND_STT_MODEL_PATH=/app/data/models/ggml-base.bin
ENV INFOMIND_STT_LANGUAGE=auto
ENV INFOMIND_STT_MAX_DURATION=7200

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    ffmpeg \
    g++ \
    git \
    make \
    python3 \
    python3-pip \
  && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp \
  && git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git /tmp/whisper.cpp \
  && cmake -S /tmp/whisper.cpp -B /tmp/whisper.cpp/build -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
  && cmake --build /tmp/whisper.cpp/build --config Release -j 2 \
  && cp /tmp/whisper.cpp/build/bin/whisper-cli /usr/local/bin/whisper-cli \
  && rm -rf /tmp/whisper.cpp /var/lib/apt/lists/*

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
