#!/bin/bash
set -e

TAG="v3.48.0"
REMOTE_REPO="crpi-40v6m35jg47mwsej.cn-hangzhou.personal.cr.aliyuncs.com/jingyun-model-yungu"

# App 镜像名称
IMAGE_NAME="jcloud-wiki-app"
FULL_IMAGE="${REMOTE_REPO}/${IMAGE_NAME}:${TAG}"

echo "🔨 构建前端代码..."
pnpm run build

echo "🔨 使用 buildx 构建多架构镜像 (目标平台: linux/amd64)..."
# 确保 buildx builder 存在
if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then
  docker buildx create --name multiarch-builder --use
fi

docker buildx use multiarch-builder

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ${FULL_IMAGE} \
  --push \
  .

echo "📥 拉取验证..."
docker pull ${FULL_IMAGE}

echo "✅ 镜像构建并推送完成：${FULL_IMAGE}"
