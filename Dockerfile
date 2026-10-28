FROM caddy:2.11.7 AS caddy
FROM node:24.22.1-bookworm-slim

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb x11vnc novnc websockify x11-utils gosu tini util-linux \
    && rm -rf /var/lib/apt/lists/*
COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY deploy ./deploy
RUN npm run build && npm prune --omit=dev && chmod 755 deploy/start.sh
ENV PORT=8080 MARTIE_DATA_DIR=/data MARTIE_BROWSER_MODE=headless HOME=/home/node
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--", "/app/deploy/start.sh"]
