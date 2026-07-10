FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm install --omit=dev --no-audit --no-fund \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/* /root/.npm

COPY server.js ./
COPY server ./server
COPY scripts ./scripts
COPY public ./public

RUN mkdir -p /app/data \
    && chown -R node:node /app

ENV NODE_ENV=production
ENV FORGE_DATA_DIR=/app/data
ENV PORT=3000
ENV FORGE_JSON_LIMIT=25mb
ENV FORGE_API_RATE_LIMIT_PER_MINUTE=1200

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=5 \
    CMD node /app/scripts/healthcheck.js

CMD ["npm", "start"]
