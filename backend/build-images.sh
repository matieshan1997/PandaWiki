#!/bin/bash
set -e

TAG="v3.2.3"
REMOTE_REPO="crpi-40v6m35jg47mwsej.cn-hangzhou.personal.cr.aliyuncs.com/jingyun-model-yungu"

# API 镜像
API_IMAGE="jcloud-wiki-api"
API_FULL_IMAGE="${REMOTE_REPO}/${API_IMAGE}:${TAG}"

# Consumer 镜像
CONSUMER_IMAGE="jcloud-wiki-consumer"
CONSUMER_FULL_IMAGE="${REMOTE_REPO}/${CONSUMER_IMAGE}:${TAG}"

echo "🔨 构建 API 镜像..."
docker build -f Dockerfile.api --build-arg VERSION=${TAG} -t ${API_IMAGE} .

echo "🏷️ 打标签：${API_FULL_IMAGE}"
docker tag ${API_IMAGE} ${API_FULL_IMAGE}

echo "📤 推送 API 镜像..."
docker push ${API_FULL_IMAGE}

echo "🔨 构建 Consumer 镜像..."
docker build -f Dockerfile.consumer -t ${CONSUMER_IMAGE} .

echo "🏷️ 打标签：${CONSUMER_FULL_IMAGE}"
docker tag ${CONSUMER_IMAGE} ${CONSUMER_FULL_IMAGE}

echo "📤 推送 Consumer 镜像..."
docker push ${CONSUMER_FULL_IMAGE}

echo "📥 拉取验证..."
docker pull ${API_FULL_IMAGE}
docker pull ${CONSUMER_FULL_IMAGE}

echo "✅ 镜像推送完成："
echo "   ${API_FULL_IMAGE}"
echo "   ${CONSUMER_FULL_IMAGE}"
