#!/bin/bash
set -e

# ============================================
# 构建并推送 web + api 双镜像到华为云 SWR
# 用法: ./build_and_push.sh [版本号]
#   例: ./build_and_push.sh 1.0.0
# ============================================

# 版本号：优先取参数，其次交互输入
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  read -p "请输入版本号 (如: 1.0.0): " VERSION
fi
if [ -z "$VERSION" ]; then
  echo "❌  版本号不能为空"
  exit 1
fi

REGISTRY="swr.cn-north-4.myhuaweicloud.com/weipengcheng"
API_IMAGE="xlt-initializr-api"
WEB_IMAGE="xlt-initializr-web"
PLATFORM="linux/amd64"

# 切换到脚本所在目录（保证构建上下文正确）
cd "$(dirname "$0")"

# 确保使用 buildx（跨平台构建必需）
if ! docker buildx inspect xlt-builder >/dev/null 2>&1; then
  echo "🔧  创建 buildx builder: xlt-builder"
  docker buildx create --name xlt-builder --use
else
  docker buildx use xlt-builder
fi

build_and_push() {
  local image_name="$1"
  local dockerfile="$2"
  local full_tag="${REGISTRY}/${image_name}:${VERSION}"
  local latest_tag="${REGISTRY}/${image_name}:latest"

  echo ""
  echo "📦 构建并推送 ${image_name}:${VERSION} ..."
  docker buildx build \
    --platform="${PLATFORM}" \
    --provenance=false \
    --sbom=false \
    -f "${dockerfile}" \
    -t "${full_tag}" \
    -t "${latest_tag}" \
    --push \
    .
  echo "✅ 推送完成: ${full_tag}"
}

build_and_push "${API_IMAGE}" "apps/api/Dockerfile"
build_and_push "${WEB_IMAGE}" "apps/web/Dockerfile"

echo ""
echo "🎉 全部完成！"
echo "   - ${REGISTRY}/${API_IMAGE}:${VERSION}"
echo "   - ${REGISTRY}/${WEB_IMAGE}:${VERSION}"
