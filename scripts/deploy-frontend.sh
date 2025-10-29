#!/bin/bash

# Frontend Deployment Script
# This script builds the frontend and deploys it to S3 with CloudFront cache invalidation

set -e

echo "🚀 Starting frontend deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Get the stack outputs
echo "📋 Fetching stack outputs..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
    --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text)

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo "❌ Failed to fetch stack outputs. Make sure the stack is deployed."
    exit 1
fi

echo "✅ Bucket: $BUCKET_NAME"
echo "✅ Distribution: $DISTRIBUTION_ID"

# Configure frontend with API URL
echo "⚙️  Configuring frontend..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

cat > frontend/.env.production << EOF
# Production Environment Variables
VITE_API_BASE_URL=$API_URL
EOF
echo "✅ Frontend configured with API URL"

# Build the frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Deploy to S3
echo "📦 Uploading to S3..."
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp frontend/dist/index.html s3://$BUCKET_NAME/index.html \
    --cache-control "public, max-age=0, must-revalidate"

echo "✅ Files uploaded to S3"

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

echo "✅ Invalidation created: $INVALIDATION_ID"
echo "⏳ Waiting for invalidation to complete..."

aws cloudfront wait invalidation-completed \
    --distribution-id $DISTRIBUTION_ID \
    --id $INVALIDATION_ID

echo "✅ CloudFront cache invalidated"
echo "🎉 Deployment complete!"

# Get the frontend URL
FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
    --output text)

echo ""
echo "🌐 Frontend URL: $FRONTEND_URL"
