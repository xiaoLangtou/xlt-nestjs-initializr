# ---- Build Stage ----
# 使用 daocloud 镜像加速，避免 docker.io 拉取超时
ARG NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine
ARG NGINX_IMAGE=docker.m.daocloud.io/library/nginx:alpine
FROM ${NODE_IMAGE} AS builder
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# 复制 workspace 配置
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/generator/package.json packages/generator/
COPY apps/web/package.json apps/web/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/generator/ packages/generator/
COPY apps/web/ apps/web/

# 构建 generator
RUN pnpm --filter @nestjs-initializr/generator build

# 构建前端
RUN pnpm --filter @nestjs-initializr/web build

# ---- Production Stage ----
FROM ${NGINX_IMAGE}
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
