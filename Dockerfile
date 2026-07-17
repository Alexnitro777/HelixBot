FROM node:24-slim AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml* tsconfig.json ./
RUN pnpm install
COPY src ./src
RUN pnpm build
RUN mkdir -p src/db/migrations && mkdir -p dist/db && cp -r src/db/migrations dist/db/

FROM node:24-slim AS runner
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./
COPY --from=builder /app/dist ./dist
RUN pnpm install --prod
RUN mkdir -p dist/modules
CMD ["node", "dist/index.js"]
