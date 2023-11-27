FROM golang as go-builder

WORKDIR /app

# Gobinaries.com does not support ARM,
# we have to build node-prune from source

RUN cd /app && \
  git clone https://github.com/tj/node-prune && \
  cd /app/node-prune && \
  CGO_ENABLED=0 go build

FROM node:20-alpine as builder

# Upgrade to edge to fix sharp/libvips issues
RUN echo "https://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories

# Added vips-dev and pkgconfig so that local vips is used instead of prebuilt
# Done for two reasons:
# - libvips binaries are not available for ARM32
# - It can break depending on the CPU (https://github.com/LemmyNet/lemmy-ui/issues/1566)
RUN apk update && apk upgrade && apk add --no-cache curl yarn python3 build-base gcc wget git vips-dev pkgconfig

# Install node-gyp
RUN npm install -g node-gyp

WORKDIR /usr/src/app

ENV npm_config_target_platform=linux
ENV npm_config_target_libc=musl

# Cache deps
COPY package.json yarn.lock ./

RUN yarn --production --prefer-offline --pure-lockfile --network-timeout 100000

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

RUN yarn --production --prefer-offline --network-timeout 100000
RUN NODE_OPTIONS="--max-old-space-size=8192" yarn build:prod

# Copy the manually built node-prune here
RUN mkdir -p /usr/local/bin/
COPY --from=go-builder /app/node-prune/node-prune /usr/local/bin/node-prune
RUN chmod +x /usr/local/bin/node-prune
RUN node-prune /usr/src/app/node_modules

RUN rm -rf ./node_modules/import-sort-parser-typescript
RUN rm -rf ./node_modules/typescript
RUN rm -rf ./node_modules/npm

RUN du -sh ./node_modules/* | sort -nr | grep '\dM.*'

FROM node:20-alpine as runner

# Upgrade to edge to fix sharp/libvips issues
RUN echo "https://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories

RUN apk update && apk upgrade && apk add curl vips-cpp

COPY --from=builder /usr/src/app/dist /app/dist
COPY --from=builder /usr/src/app/node_modules /app/node_modules

RUN chown -R node:node /app

LABEL org.opencontainers.image.authors="The Lemmy Authors"
LABEL org.opencontainers.image.source="https://github.com/LemmyNet/lemmy-ui"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.description="The official web app for Lemmy."

USER node
EXPOSE 1234
WORKDIR /app
CMD exec node dist/js/server.js
