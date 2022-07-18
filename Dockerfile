FROM node:16-alpine AS base

# hadolint ignore=DL3018
RUN apk add --no-cache dumb-init

WORKDIR /app

FROM base AS dev

COPY *.json ./

RUN npm ci

FROM dev as build

COPY lib/ lib/

RUN npm run build

FROM base AS prod

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/build /app/build

RUN npm ci --omit=dev

CMD [ "dumb-init", "node", "/app/build/index.js" ]
