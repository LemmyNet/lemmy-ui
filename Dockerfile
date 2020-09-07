FROM node:14
WORKDIR /usr/src/app_name
COPY . .
RUN yarn
RUN yarn build:server
RUN yarn build:client
EXPOSE 1234
CMD yarn serve
