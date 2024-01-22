FROM node:21-alpine as builder

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
RUN echo "export const BUILD_DATE_ISO8601 = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';" > "src/shared/build-date.ts"

RUN yarn --production --prefer-offline --network-timeout 100000
RUN yarn build:prod

RUN rm -rf ./node_modules/import-sort-parser-typescript
RUN rm -rf ./node_modules/typescript
RUN rm -rf ./node_modules/npm

RUN du -sh ./node_modules/* | sort -nr | grep '\dM.*'

FROM node:21-alpine as runner
ENV NODE_ENV=production

RUN apk update && apk add --no-cache curl vips-cpp && rm -rf /var/cache/apk/*

COPY --from=builder /usr/src/app/dist /app/dist
COPY --from=builder /usr/src/app/node_modules /app/node_modules

RUN chown -R node:node /app

LABEL org.opencontainers.image.authors="The Lemmy Authors"
LABEL org.opencontainers.image.source="https://github.com/LemmyNet/lemmy-ui"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.description="The official web app for Lemmy."

HEALTHCHECK --interval=60s --start-period=10s --retries=2 --timeout=10s CMD curl -ILfSs http://localhost:1234/ > /dev/null || exit 1

USER node
EXPOSE 1234
WORKDIR /app

CMD ["node", "dist/js/server.js"]
