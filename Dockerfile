# syntax=docker/dockerfile:1

# One workspace build, two images. Normally run through docker-compose.yml:
#   docker build --target server -t united-server .
#   docker build --target client -t united-client .

ARG NODE_IMAGE=node:22.23.4-alpine3.24
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30.6-alpine3.24

# ---- base: Node + pnpm (version pinned by the root packageManager field) ----
FROM ${NODE_IMAGE} AS base
# CI=true keeps pnpm non-interactive: without it, switching an install to --prod
# stops at a "reinstall node_modules? (Y/n)" prompt and links nothing.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack install && pnpm config set store-dir /pnpm/store

# ---- deps: fetch every package from the lockfile only ----
# The store lives in this layer (not a cache mount) so the offline installs below
# still work when CI restores this layer from a remote cache.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/

# ---- server-build: compile contracts and server ----
FROM deps AS server-build
RUN pnpm install --frozen-lockfile --offline --filter @united/server...
COPY packages/contracts packages/contracts
COPY apps/server apps/server
RUN pnpm --filter @united/contracts build && pnpm --filter @united/server build

# ---- server-deps: runtime dependencies only ----
FROM deps AS server-deps
# pnpm fetch leaves every package (dev included) in node_modules/.pnpm; start clean.
RUN rm -rf node_modules && \
    pnpm install --frozen-lockfile --offline --prod --filter @united/server...

# ---- client-build: compile contracts and the Vite bundle ----
FROM deps AS client-build
# Optional public origin for canonical and social-image URLs (see apps/client/build).
ARG SITE_URL=
ENV SITE_URL=${SITE_URL}
RUN pnpm install --frozen-lockfile --offline --filter @united/client...
COPY packages/contracts packages/contracts
COPY apps/client apps/client
RUN pnpm --filter @united/contracts build && pnpm --filter @united/client build

# ---- client: static files + /api reverse proxy (public entry point) ----
FROM ${NGINX_IMAGE} AS client
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/apps/client/dist /usr/share/nginx/html
EXPOSE 8080

# ---- server: NestJS API (reachable only from the client container) ----
FROM ${NODE_IMAGE} AS server
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Keep the workspace layout so pnpm's symlinks and the server's relative paths resolve.
COPY --from=server-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=server-deps --chown=node:node /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=server-deps --chown=node:node /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=server-build --chown=node:node /app/packages/contracts/package.json /app/packages/contracts/
COPY --from=server-build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=server-build --chown=node:node /app/apps/server/package.json /app/apps/server/
COPY --from=server-build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=server-build --chown=node:node /app/apps/server/skills ./apps/server/skills

# Ingestion writes scraped markdown here.
RUN mkdir -p apps/server/man_united_data_script && chown node:node apps/server/man_united_data_script

USER node
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["node", "dist/main.js"]
