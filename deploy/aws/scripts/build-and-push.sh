#!/usr/bin/env bash
# Build and push VoxaAI images to Amazon ECR.
# Usage: ./deploy/aws/scripts/build-and-push.sh us-east-1

set -euo pipefail

AWS_REGION="${1:-us-east-1}"
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "==> Region: ${AWS_REGION}"
echo "==> Account: ${AWS_ACCOUNT_ID}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_BASE}"

for repo in voxaai/backend voxaai/frontend; do
  aws ecr describe-repositories --repository-names "${repo}" --region "${AWS_REGION}" >/dev/null 2>&1 \
    || aws ecr create-repository --repository-name "${repo}" --region "${AWS_REGION}"
done

echo "==> Building backend..."
docker build -t voxaai/backend:latest ./backend
docker tag voxaai/backend:latest "${ECR_BASE}/voxaai/backend:latest"
docker push "${ECR_BASE}/voxaai/backend:latest"

echo "==> Building frontend (production)..."
docker build -f frontend/Dockerfile.prod \
  --build-arg BACKEND_INTERNAL_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_API_URL= \
  --build-arg NEXT_PUBLIC_APP_NAME=VoxaAI \
  --no-cache \
  -t voxaai/frontend:latest ./frontend
docker tag voxaai/frontend:latest "${ECR_BASE}/voxaai/frontend:latest"
docker push "${ECR_BASE}/voxaai/frontend:latest"

echo ""
echo "Done. Images pushed to:"
echo "  ${ECR_BASE}/voxaai/backend:latest"
echo "  ${ECR_BASE}/voxaai/frontend:latest"
