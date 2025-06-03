FROM node:20 AS builder

RUN mkdir -p /usr/local/src/kippenstummel/api
WORKDIR /usr/local/src/kippenstummel/api

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20

RUN mkdir -p /usr/local/bin/kippenstummel/api
WORKDIR /usr/local/bin/kippenstummel/api

VOLUME ["/usr/local/etc/kippenstummel/api"]
VOLUME ["/usr/local/var/log/kippenstummel/api"]
VOLUME ["/tmp/kippenstummel/api"]

ENV CONFIG_DIR="/usr/local/etc/kippenstummel/api"
ENV LOG_DIR="/usr/local/var/log/kippenstummel/api"
ENV TMP_DIR="/tmp/kippenstummel/api"

COPY --from=builder /usr/local/src/kippenstummel/api/package.json ./package.json
COPY --from=builder /usr/local/src/kippenstummel/api/package-lock.json ./package-lock.json

RUN npm ci --only=production

COPY --from=builder /usr/local/src/kippenstummel/api/dist ./dist

EXPOSE 8080

ENTRYPOINT ["npm", "run", "start:prod"]
