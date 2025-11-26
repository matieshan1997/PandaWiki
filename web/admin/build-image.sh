#!/bin/bash
set -e

TAG="v3.47.1"
REMOTE_REPO="crpi-40v6m35jg47mwsej.cn-hangzhou.personal.cr.aliyuncs.com/jingyun-model-yungu"

# 启用 buildx
docker buildx create --use || true

# Nginx (Admin) 镜像
IMAGE_NAME="jcloud-wiki-nginx"
FULL_IMAGE="${REMOTE_REPO}/${IMAGE_NAME}:${TAG}"

echo "🔨 构建前端代码..."
pnpm run build

echo "🔨 构建并推送 Nginx (Admin) 镜像（multi-arch）..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ${FULL_IMAGE} \
  --push .

echo "📥 拉取验证（x86_64）："
docker pull --platform linux/amd64 ${FULL_IMAGE}

echo "✅ 镜像推送完成：${FULL_IMAGE}"
