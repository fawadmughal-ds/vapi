#!/usr/bin/env bash
# Update voxaai/production in Secrets Manager (ap-south-1).
# Run from CloudShell or laptop with root/admin AWS credentials.
#
# Usage:
#   export RDS_PASSWORD='your-rds-password'
#   export SECRET_KEY="$(openssl rand -hex 32)"
#   export VAPI_API_KEY='...'
#   ./deploy/aws/scripts/update-production-secret.sh

set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
SECRET_ID="voxaai/production"

RDS_HOST="voxaai-prod.czygqmagouxs.ap-south-1.rds.amazonaws.com"
DATABASE_URL="postgresql+psycopg://voxa:${RDS_PASSWORD:?Set RDS_PASSWORD}@${RDS_HOST}:5432/postgres"

SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}"
VAPI_API_KEY="${VAPI_API_KEY:-}"
VAPI_WEBHOOK_SECRET="${VAPI_WEBHOOK_SECRET:-$(openssl rand -hex 32)}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_change_me}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-whsec_change_me}"
SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:-admin@voxaai.com}"
SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:?Set SUPERADMIN_PASSWORD}"

PAYLOAD=$(cat <<EOF
{
  "SECRET_KEY": "${SECRET_KEY}",
  "DATABASE_URL": "${DATABASE_URL}",
  "VAPI_API_KEY": "${VAPI_API_KEY}",
  "VAPI_WEBHOOK_SECRET": "${VAPI_WEBHOOK_SECRET}",
  "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}",
  "STRIPE_WEBHOOK_SECRET": "${STRIPE_WEBHOOK_SECRET}",
  "SUPERADMIN_EMAIL": "${SUPERADMIN_EMAIL}",
  "SUPERADMIN_PASSWORD": "${SUPERADMIN_PASSWORD}"
}
EOF
)

if aws secretsmanager describe-secret --secret-id "$SECRET_ID" --region "$REGION" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value \
    --secret-id "$SECRET_ID" \
    --region "$REGION" \
    --secret-string "$PAYLOAD"
  echo "Updated secret: $SECRET_ID"
else
  aws secretsmanager create-secret \
    --name "$SECRET_ID" \
    --region "$REGION" \
    --secret-string "$PAYLOAD"
  echo "Created secret: $SECRET_ID"
fi

aws secretsmanager describe-secret --secret-id "$SECRET_ID" --region "$REGION" --query 'ARN' --output text
