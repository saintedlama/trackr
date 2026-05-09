FROM node:24-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build:assets
RUN pnpm prune --prod
EXPOSE 3000
CMD ["node", "server.js"]
