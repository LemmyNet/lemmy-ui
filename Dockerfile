# syntax=docker/dockerfile:1

FROM node:current-slim AS builder

ARG TARGETARCH

# Added vips-dev and pkgconfig so that local vips is used instead of prebuilt
# Done for two reasons:
# - libvips binaries are not available for ARM32
# - It can break depending on the CPU (https://github.com/LemmyNet/lemmy-ui/issues/1566)
# Caching as per https://stackoverflow.com/a/72851168
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get -y --no-install-recommends install \
          curl python3 gcc wget git libvips-dev pkg-config python3-pip make g++

# Install node-gyp and corepack
RUN --mount=type=cache,target=/root/.npm \
    npm install -g -f node-gyp corepack

# Enable corepack to use pnpm
RUN corepack enable

WORKDIR /usr/src/app

ENV npm_config_target_platform=linux
ENV npm_config_target_libc=musl

# Cache deps
COPY package.json pnpm-lock.yaml ./
RUN \
  --mount=type=cache,target=/root/.local/share/pnpm/store \
  pnpm i
# Build
COPY generate_translations.js \
  tsconfig.json \
  webpack.config.js \
  .babelrc \
  ./

COPY lemmy-translations lemmy-translations
COPY src src
COPY .git .git

# Set UI version 
RUN echo "export const VERSION = '$(git describe --tag)';" > "src/shared/version.ts"
RUN echo "export const BUILD_DATE_ISO8601 = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';" > "src/shared/build-date.ts"

RUN \
  --mount=type=cache,target=/root/.local/share/pnpm/store \
  pnpm i
RUN \
  --mount=type=cache,target=/root/.local/share/pnpm/store \
  pnpm prebuild:prod
RUN \
  --mount=type=cache,target=/root/.local/share/pnpm/store \
  pnpm build:prod

RUN rm -rf ./node_modules/import-sort-parser-typescript
RUN rm -rf ./node_modules/typescript
RUN rm -rf ./node_modules/npm

FROM node:current-slim AS runner

ARG TARGETARCH

ENV NODE_ENV=production

RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean \
    && apt-get update \
    && apt-get -y --no-install-recommends install \
           curl

COPY --from=builder --chown=node:node /usr/src/app/dist /app/dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules /app/node_modules

RUN chown node:node /app

LABEL org.opencontainers.image.authors="The Lemmy Authors"
LABEL org.opencontainers.image.source="https://github.com/LemmyNet/lemmy-ui"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.description="The official web app for Lemmy."

HEALTHCHECK --interval=60s --start-period=10s --retries=2 --timeout=10s CMD curl -ILfSs http://localhost:1234/ > /dev/null || exit 1

USER node
EXPOSE 1234
WORKDIR /app

CMD ["node", "--enable-source-maps", "dist/js/server.js"]
