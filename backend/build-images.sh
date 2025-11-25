#!/bin/bash
set -e

TAG="v3.47.1"
REMOTE_REPO="crpi-40v6m35jg47mwsej.cn-hangzhou.personal.cr.aliyuncs.com/jingyun-model-yungu"

# 启用 buildx
docker buildx create --use || true

# API 镜像
API_IMAGE="jcloud-wiki-api"
API_FULL_IMAGE="${REMOTE_REPO}/${API_IMAGE}:${TAG}"

# Consumer 镜像
CONSUMER_IMAGE="jcloud-wiki-consumer"
CONSUMER_FULL_IMAGE="${REMOTE_REPO}/${CONSUMER_IMAGE}:${TAG}"

echo "🔨 构建并推送 API 镜像（multi-arch）..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.api \
  --build-arg VERSION=${TAG} \
  -t ${API_FULL_IMAGE} \
  --push .

echo "🔨 构建并推送 Consumer 镜像（multi-arch）..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.consumer \
  -t ${CONSUMER_FULL_IMAGE} \
  --push .

echo "📥 拉取验证（x86_64）："
docker pull --platform linux/amd64 ${API_FULL_IMAGE}
docker pull --platform linux/amd64 ${CONSUMER_FULL_IMAGE}

echo "✅ 镜像推送完成："
echo "   ${API_FULL_IMAGE}"
echo "   ${CONSUMER_FULL_IMAGE}"
