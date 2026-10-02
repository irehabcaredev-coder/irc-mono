# Build context is the repo root:  docker build -f apps/api/Dockerfile .
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
# web's manifest is excluded from the context; install only the api workspace
RUN pnpm install --frozen-lockfile --filter ./apps/api...
COPY apps/api apps/api
RUN pnpm --filter ./apps/api exec prisma generate && pnpm --filter ./apps/api build

FROM base AS runtime
ENV NODE_ENV=production PORT=8000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --prod --filter ./apps/api...
COPY apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/dist apps/api/dist
WORKDIR /repo/apps/api
RUN pnpm exec prisma generate
USER node
EXPOSE 8000
CMD ["node", "dist/index.js"]
