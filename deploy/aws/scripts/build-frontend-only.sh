#!/usr/bin/env bash
# Build the ECS frontend image locally (no ECR push).
# Fixes API proxy: rewrites target http://localhost:8000 baked at build time.
#
# Usage: ./deploy/aws/scripts/build-frontend-only.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

echo "==> Building frontend with BACKEND_INTERNAL_URL=http://localhost:8000"
docker build -f frontend/Dockerfile.prod \
  --build-arg BACKEND_INTERNAL_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_API_URL= \
  --build-arg NEXT_PUBLIC_APP_NAME=VoxaAI \
  --no-cache \
  -t voxaai/frontend:latest \
  -t 817047731837.dkr.ecr.ap-south-1.amazonaws.com/voxaai/frontend:latest \
  ./frontend

echo ""
echo "Build OK. To push to ECR you need ecr:GetAuthorizationToken on your IAM user."
echo "Option A — root/admin profile:"
echo "  AWS_PROFILE=admin aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 817047731837.dkr.ecr.ap-south-1.amazonaws.com"
echo "  docker push 817047731837.dkr.ecr.ap-south-1.amazonaws.com/voxaai/frontend:latest"
echo ""
echo "Option B — ask account admin to attach AmazonEC2ContainerRegistryPowerUser to Fawad-Vapi (or lift permissions boundary for ECR)."
