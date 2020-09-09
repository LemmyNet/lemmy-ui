FROM node:14-alpine as builder
RUN apk update && apk add yarn curl bash && rm -rf /var/cache/apk/*

RUN curl -sfL https://install.goreleaser.com/github.com/tj/node-prune.sh | bash -s -- -b /usr/local/bin

WORKDIR /usr/src/app

# Cache deps
COPY package.json yarn.lock ./
RUN yarn install --pure-lockfile

# Build 
COPY generate_translations.js \
  tsconfig.json \
  webpack.config.js \
  .babelrc \
  .
COPY translations translations
COPY src src

RUN yarn
RUN yarn build

# Pruning
# RUN npm prune --production
RUN /usr/local/bin/node-prune

FROM node:14-alpine as runner
COPY --from=builder /usr/src/app/dist /app/dist
COPY --from=builder /usr/src/app/node_modules /app/node_modules

EXPOSE 1234
CMD node /app/dist/js/server.js
