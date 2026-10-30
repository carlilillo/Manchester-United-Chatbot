# syntax=docker/dockerfile:1

# Builds the API (apps/server) from the pnpm workspace root.
#   docker build -t united-server .
#   docker run --env-file .env -p 3000:3000 united-server

ARG NODE_IMAGE=node:22.23.4-alpine3.24

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

# ---- build: compile contracts and server ----
FROM deps AS build
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --offline --filter @united/server...
COPY packages/contracts packages/contracts
COPY apps/server apps/server
RUN pnpm --filter @united/contracts build && pnpm --filter @united/server build

# ---- prod-deps: runtime dependencies only ----
FROM deps AS prod-deps
COPY packages/contracts/package.json packages/contracts/
COPY apps/server/package.json apps/server/
# pnpm fetch leaves every package (dev included) in node_modules/.pnpm; start clean.
RUN rm -rf node_modules && \
    pnpm install --frozen-lockfile --offline --prod --filter @united/server...

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Keep the workspace layout so pnpm's symlinks and the server's relative paths resolve.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=prod-deps --chown=node:node /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build --chown=node:node /app/packages/contracts/package.json /app/packages/contracts/
COPY --from=build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /app/apps/server/package.json /app/apps/server/
COPY --from=build --chown=node:node /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=node:node /app/apps/server/skills ./apps/server/skills

# Ingestion writes scraped markdown here.
RUN mkdir -p apps/server/man_united_data_script && chown node:node apps/server/man_united_data_script

USER node
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["node", "dist/main.js"]
