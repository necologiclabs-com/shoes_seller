# Frontend Deployment Script (PowerShell)
# This script builds the frontend and deploys it to S3 with CloudFront cache invalidation

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting frontend deployment..." -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Get the stack outputs
Write-Host "📋 Fetching stack outputs..." -ForegroundColor Cyan

$bucketName = aws cloudformation describe-stacks `
    --stack-name PriceComparisonStack `
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" `
    --output text

$distributionId = aws cloudformation describe-stacks `
    --stack-name PriceComparisonStack `
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" `
    --output text

if ([string]::IsNullOrEmpty($bucketName) -or [string]::IsNullOrEmpty($distributionId)) {
    Write-Host "❌ Failed to fetch stack outputs. Make sure the stack is deployed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Bucket: $bucketName" -ForegroundColor Green
Write-Host "✅ Distribution: $distributionId" -ForegroundColor Green

# Configure frontend with API URL
Write-Host "⚙️  Configuring frontend..." -ForegroundColor Cyan
$apiUrl = aws cloudformation describe-stacks `
    --stack-name PriceComparisonStack `
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
    --output text

$envContent = "# Production Environment Variables`nVITE_API_BASE_URL=$apiUrl"
Set-Content -Path "frontend\.env.production" -Value $envContent
Write-Host "✅ Frontend configured with API URL" -ForegroundColor Green

# Build the frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build
Set-Location ..

# Deploy to S3
Write-Host "📦 Uploading to S3..." -ForegroundColor Cyan
aws s3 sync frontend/dist/ "s3://$bucketName/" `
    --delete `
    --cache-control "public, max-age=31536000, immutable" `
    --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp frontend/dist/index.html "s3://$bucketName/index.html" `
    --cache-control "public, max-age=0, must-revalidate"

Write-Host "✅ Files uploaded to S3" -ForegroundColor Green

# Invalidate CloudFront cache
Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Cyan
$invalidationId = aws cloudfront create-invalidation `
    --distribution-id $distributionId `
    --paths "/*" `
    --query "Invalidation.Id" `
    --output text

Write-Host "✅ Invalidation created: $invalidationId" -ForegroundColor Green
Write-Host "⏳ Waiting for invalidation to complete..." -ForegroundColor Yellow

aws cloudfront wait invalidation-completed `
    --distribution-id $distributionId `
    --id $invalidationId

Write-Host "✅ CloudFront cache invalidated" -ForegroundColor Green
Write-Host "🎉 Deployment complete!" -ForegroundColor Green

# Get the frontend URL
$frontendUrl = aws cloudformation describe-stacks `
    --stack-name PriceComparisonStack `
    --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" `
    --output text

Write-Host ""
Write-Host "🌐 Frontend URL: $frontendUrl" -ForegroundColor Cyan
