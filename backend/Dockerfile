# Backend container for Streakling.
# Multi-arch base — works on Raspberry Pi (arm64/armv7) and x86.

FROM node:20-alpine

# Run as non-root.
RUN addgroup -S streak && adduser -S streak -G streak

WORKDIR /app

COPY package*.json ./

# better-sqlite3 is a native addon — needs build tools on musl/alpine.
# We install them, compile, then remove them so they don't bloat the final image.
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm install --omit=dev && \
    apk del .build-deps

COPY . .

# Persistent data lives in /data (mounted as a volume).
RUN mkdir -p /data && chown -R streak:streak /data /app

ENV DATA_DB=/data/data.db
ENV DATA_FILE=/data/data.json
ENV PORT=3333
ENV NODE_ENV=production

USER streak

EXPOSE 3333

CMD ["node", "server.js"]
