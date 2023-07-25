FROM node:lts-bullseye-slim as builder
RUN apt-get update && apt-get install -y build-essential ca-certificates apt-utils nodejs npm curl wget git yarn python3 dumb-init --no-install-recommends
RUN curl -k -sf https://gobinaries.com/tj/node-prune | sh

WORKDIR /usr/src/app

ENV npm_config_target_arch=x64
ENV npm_config_target_platform=linux
ENV npm_config_target_libc=glibc
ENV NODE_ENV=production

# Cache deps
COPY package.json yarn.lock ./
RUN yarn --production --prefer-offline --pure-lockfile

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
RUN echo "export const VERSION = \"$(git describe --tag | awk -F'-' '{print $1"-"$2}')\";" > "src/shared/version.ts"

RUN yarn --production --prefer-offline
RUN NODE_OPTIONS="--max-old-space-size=8192" yarn build:prod

# Prune the image
RUN node-prune /usr/src/app/node_modules

RUN rm -rf ./node_modules/import-sort-parser-typescript
RUN rm -rf ./node_modules/typescript
RUN rm -rf ./node_modules/npm

FROM node:lts-bullseye-slim as runner
RUN apt-get update && apt-get install -y curl wget vim dumb-init --no-install-recommends
COPY --from=builder --chown=node:node /usr/src/app/dist /app/dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules /app/node_modules

USER node
EXPOSE 1234
WORKDIR /app
ENTRYPOINT [ "/usr/bin/dumb-init", "--" ]
CMD [ "node", "dist/js/server.js" ]
