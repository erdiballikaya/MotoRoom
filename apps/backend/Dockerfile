FROM node:22-bookworm-slim AS node-runtime

FROM mongo:7

COPY --from=node-runtime /usr/local/ /usr/local/

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts/start-container.sh ./scripts/start-container.sh

RUN chmod +x ./scripts/start-container.sh \
  && mkdir -p /data/db

ENV PORT=4000

EXPOSE 4000

CMD ["./scripts/start-container.sh"]
