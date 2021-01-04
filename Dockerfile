FROM node:14-alpine as builder
RUN apk update && apk add yarn python3 --no-cache

WORKDIR /usr/src/app

# Cache deps
COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile

# Build
COPY generate_translations.js \
  tsconfig.json \
  webpack.config.js \
  .babelrc \
  ./

COPY lemmy-translations lemmy-translations
COPY src src

RUN yarn
RUN yarn build:prod

FROM node:14-alpine as runner
COPY --from=builder /usr/src/app/dist /app/dist
COPY --from=builder /usr/src/app/node_modules /app/node_modules

EXPOSE 1234
WORKDIR /app
CMD node dist/js/server.js
