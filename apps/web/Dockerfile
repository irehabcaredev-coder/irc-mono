# Build context is the repo root: docker build -f apps/web/Dockerfile .
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG NEXT_PUBLIC_BASE_ENDPOINT=http://localhost:8000
ARG NEXT_PUBLIC_MAIN_URL=http://localhost:3000
ARG NEXT_PUBLIC_DOCTORS_URL=http://localhost:3000
ENV NEXT_PUBLIC_BASE_ENDPOINT=$NEXT_PUBLIC_BASE_ENDPOINT
ENV NEXT_PUBLIC_MAIN_URL=$NEXT_PUBLIC_MAIN_URL
ENV NEXT_PUBLIC_DOCTORS_URL=$NEXT_PUBLIC_DOCTORS_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter ./apps/web...
COPY apps/web apps/web
WORKDIR /repo/apps/web
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --prod --filter ./apps/web...
COPY --from=build /repo/apps/web/.next /repo/apps/web/.next
COPY --from=build /repo/apps/web/public /repo/apps/web/public
COPY apps/web/next.config.js apps/web/next.config.js
WORKDIR /repo/apps/web
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
