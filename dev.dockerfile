FROM node:20-alpine as builder
RUN apk update && apk add curl python3 build-base gcc wget git --no-cache
RUN npm install -g pnpm

WORKDIR /usr/src/app

ENV npm_config_target_arch=x64
ENV npm_config_target_platform=linux
ENV npm_config_target_libc=musl

# Cache deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm i --prefer-offline

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
RUN echo "export const VERSION = 'dev';" > "src/shared/version.ts"

RUN pnpm i --prefer-offline
RUN pnpm build:dev

FROM node:20-alpine as runner
COPY --from=builder /usr/src/app/dist /app/dist
COPY --from=builder /usr/src/app/node_modules /app/node_modules

EXPOSE 1234
WORKDIR /app
CMD node dist/js/server.js
