# Backend container for Streakling.
# Multi-arch base — works on Raspberry Pi (arm64/armv7) and x86.

FROM node:20-alpine

# Run as non-root.
RUN addgroup -S streak && adduser -S streak -G streak

WORKDIR /app

# Copy package files first so npm install layer is cached.
COPY package*.json ./

# Production install.
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

COPY . .

# Persistent data lives in /data (mounted as a volume).
RUN mkdir -p /data && chown -R streak:streak /data /app
ENV DATA_FILE=/data/data.json
ENV PORT=3333
ENV NODE_ENV=production

USER streak

EXPOSE 3333

CMD ["node", "server.js"]
