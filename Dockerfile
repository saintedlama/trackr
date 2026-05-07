FROM node:25-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
