FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates ripgrep \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
CMD ["node", "src/worker.js"]
