FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY docs ./docs
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 4100

CMD ["npm", "start"]
