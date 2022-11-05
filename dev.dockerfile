FROM node:alpine as builder
RUN apk update && apk add curl yarn python3 build-base gcc wget git --no-cache

WORKDIR /usr/src/app

# Cache deps
COPY package.json yarn.lock ./
RUN yarn install --ignore-scripts --prefer-offline --pure-lockfile

# Build
COPY generate_translations.js \
  tsconfig.json \
  webpack.config.js \
  .babelrc \
  ./

COPY lemmy-translations lemmy-translations
COPY src src

# Set UI version 
RUN echo "export const VERSION = 'dev';" > "src/shared/version.ts"

RUN yarn install --ignore-scripts --prefer-offline
RUN yarn build:dev

FROM node:alpine as runner
COPY --from=builder /usr/src/app/dist /app/dist
COPY --from=builder /usr/src/app/node_modules /app/node_modules

EXPOSE 1234
WORKDIR /app
CMD node dist/js/server.js
