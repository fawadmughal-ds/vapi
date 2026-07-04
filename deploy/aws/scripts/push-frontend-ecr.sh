#!/usr/bin/env bash
# Push pre-built frontend image to ECR. Requires ECR IAM permissions.
#
# Usage:
#   AWS_PROFILE=admin ./deploy/aws/scripts/push-frontend-ecr.sh ap-south-1
# Or after: aws configure --profile admin  (use root/admin access keys)

set -euo pipefail

AWS_REGION="${1:-ap-south-1}"
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/voxaai/frontend:latest"

echo "==> Identity: $(aws sts get-caller-identity --query Arn --output text)"
echo "==> Logging in to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "==> Pushing ${ECR}"
docker push "${ECR}"

echo ""
echo "==> Force ECS redeploy (run in CloudShell):"
echo "aws ecs update-service --cluster voxaai-prod --service voxaai-service --force-new-deployment --region ${AWS_REGION}"
