# ---- Build Stage ----
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# 复制 workspace 配置
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/generator/package.json packages/generator/
COPY apps/api/package.json apps/api/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/generator/ packages/generator/
COPY apps/api/ apps/api/

# 构建 generator
RUN pnpm --filter @nestjs-initializr/generator build

# 构建 API
RUN pnpm --filter @nestjs-initializr/api build

# ---- Production Stage ----
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/generator/package.json packages/generator/
COPY apps/api/package.json apps/api/

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/packages/generator/dist packages/generator/dist
COPY --from=builder /app/packages/generator/templates packages/generator/templates
COPY --from=builder /app/apps/api/dist apps/api/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
