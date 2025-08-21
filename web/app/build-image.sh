#!/bin/bash
set -e

TAG="v3.2.3"
REMOTE_REPO="crpi-40v6m35jg47mwsej.cn-hangzhou.personal.cr.aliyuncs.com/jingyun-model-yungu"

# App 镜像
IMAGE_NAME="jcloud-wiki-app"
FULL_IMAGE="${REMOTE_REPO}/${IMAGE_NAME}:${TAG}"

echo "🔨 构建前端代码..."
pnpm run build

echo "🔨 构建 App 镜像..."
docker build -t ${IMAGE_NAME} .

echo "🏷️ 打标签：${FULL_IMAGE}"
docker tag ${IMAGE_NAME} ${FULL_IMAGE}

echo "📤 推送镜像..."
docker push ${FULL_IMAGE}

echo "📥 拉取验证..."
docker pull ${FULL_IMAGE}

echo "✅ 镜像推送完成：${FULL_IMAGE}"
