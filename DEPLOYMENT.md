# Deployment Guide

This guide explains how to deploy the Trail Running Price Comparison application to AWS.

## Prerequisites

1. **AWS CLI** installed and configured with appropriate credentials

   ```bash
   aws configure
   ```

2. **Node.js** (v20 or later) and npm installed

3. **AWS CDK** installed globally (optional, but recommended)

   ```bash
   npm install -g aws-cdk
   ```

4. **AWS Account** with appropriate permissions to create:
   - DynamoDB tables
   - Lambda functions
   - API Gateway
   - S3 buckets
   - CloudFront distributions
   - IAM roles and policies
   - EventBridge rules

## Initial Setup

### 1. Bootstrap CDK (First Time Only)

If you haven't used CDK in your AWS account/region before:

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

Example:

```bash
cdk bootstrap aws://123456789012/ap-east-1
```

### 2. Install Dependencies

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

Install Lambda dependencies:

```bash
cd lambda/layers/shared
npm install
cd ../../..
```

## Deployment Steps

### Option 1: Deploy Everything at Once

```bash
npm run deploy:all
```

This will:

1. Deploy the CDK stack (backend infrastructure)
2. Build and deploy the frontend to S3
3. Invalidate CloudFront cache

### Option 2: Deploy Backend and Frontend Separately

#### Deploy Backend Infrastructure

```bash
npm run deploy
```

This deploys:

- DynamoDB table
- Lambda functions
- API Gateway
- EventBridge scheduler
- S3 bucket for frontend
- CloudFront distribution

#### Deploy Frontend Only

After the backend is deployed, you can deploy just the frontend:

**Windows (PowerShell):**

```powershell
npm run deploy:frontend
```

**Linux/Mac (Bash):**

```bash
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

## Build Frontend Locally

To build the frontend without deploying:

```bash
npm run build:frontend
```

The built files will be in `frontend/dist/`.

## Environment Configuration

### Frontend Environment Variables

Create a `.env.production` file in the `frontend/` directory:

```env
VITE_API_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

The API URL will be output after deploying the backend stack.

### Backend Configuration

#### Affiliate IDs

Store affiliate IDs in AWS Systems Manager Parameter Store:

```bash
# Amazon Affiliate ID
aws ssm put-parameter \
    --name /price-comparison/affiliate/amazon/id \
    --value "your-amazon-affiliate-id" \
    --type String

# Rakuten Affiliate ID
aws ssm put-parameter \
    --name /price-comparison/affiliate/rakuten/id \
    --value "your-rakuten-affiliate-id" \
    --type String

# Yodobashi Affiliate ID
aws ssm put-parameter \
    --name /price-comparison/affiliate/yodobashi/id \
    --value "your-yodobashi-affiliate-id" \
    --type String

# Mercari Affiliate ID
aws ssm put-parameter \
    --name /price-comparison/affiliate/mercari/id \
    --value "your-mercari-affiliate-id" \
    --type String
```

#### API Keys (if needed)

Store sensitive API keys in AWS Secrets Manager:

```bash
# Amazon PA-API credentials
aws secretsmanager create-secret \
    --name price-comparison/amazon-api \
    --secret-string '{"accessKey":"YOUR_ACCESS_KEY","secretKey":"YOUR_SECRET_KEY","partnerTag":"YOUR_PARTNER_TAG"}'

# Rakuten API key
aws secretsmanager create-secret \
    --name price-comparison/rakuten-api \
    --secret-string '{"applicationId":"YOUR_APP_ID"}'
```

## Deployment Outputs

After deployment, you'll see outputs including:

- **ApiUrl**: Backend API endpoint
- **FrontendUrl**: CloudFront distribution URL for the frontend
- **FrontendBucketName**: S3 bucket name
- **CloudFrontDistributionId**: CloudFront distribution ID
- **TableName**: DynamoDB table name

## Updating the Application

### Update Backend

1. Make changes to Lambda functions or CDK stack
2. Build TypeScript:
   ```bash
   npm run build
   ```
3. Deploy:
   ```bash
   npm run deploy
   ```

### Update Frontend

1. Make changes to React components
2. Deploy:
   ```bash
   npm run deploy:frontend
   ```

## Manual Deployment Steps

If you prefer manual control:

### 1. Deploy CDK Stack

```bash
npm run build
cdk deploy
```

### 2. Build Frontend

```bash
cd frontend
npm run build
cd ..
```

### 3. Upload to S3

```bash
# Get bucket name from stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
    --output text)

# Sync files (with cache headers)
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp frontend/dist/index.html s3://$BUCKET_NAME/index.html \
    --cache-control "public, max-age=0, must-revalidate"
```

### 4. Invalidate CloudFront Cache

```bash
# Get distribution ID from stack outputs
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text)

# Create invalidation
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*"
```

## Troubleshooting

### CDK Bootstrap Issues

If you get bootstrap errors:

```bash
cdk bootstrap --force
```

### Permission Errors

Ensure your AWS credentials have the necessary permissions. You may need:

- `AdministratorAccess` (for initial setup)
- Or specific permissions for CloudFormation, Lambda, DynamoDB, S3, CloudFront, etc.

### Frontend Build Errors

Clear cache and rebuild:

```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
cd ..
```

### CloudFront Cache Issues

If you don't see updates, create a cache invalidation:

```bash
aws cloudfront create-invalidation \
    --distribution-id YOUR_DISTRIBUTION_ID \
    --paths "/*"
```

## Monitoring

### View Logs

**Lambda Logs:**

```bash
aws logs tail /aws/lambda/FUNCTION_NAME --follow
```

**API Gateway Logs:**
Check in CloudWatch Logs console under `/aws/apigateway/PriceComparisonApi`

### CloudWatch Dashboard

Access CloudWatch in AWS Console to view:

- Lambda invocations and errors
- API Gateway requests and latency
- DynamoDB read/write capacity

## Cleanup

To delete all resources:

```bash
# Delete CloudFront distribution (takes time)
# You may need to disable it first in the console

# Empty S3 bucket
aws s3 rm s3://BUCKET_NAME --recursive

# Delete stack
cdk destroy
```

**Note:** Some resources like DynamoDB tables have `RETAIN` policy and won't be automatically deleted.

## Cost Optimization

- **DynamoDB**: Uses on-demand billing (pay per request)
- **Lambda**: Free tier includes 1M requests/month
- **API Gateway**: Free tier includes 1M requests/month
- **CloudFront**: Free tier includes 1TB data transfer/month
- **S3**: Minimal cost for static hosting

For production, consider:

- Setting up CloudWatch alarms for cost monitoring
- Using DynamoDB provisioned capacity if traffic is predictable
- Implementing API Gateway caching
- Setting up S3 lifecycle policies

## Security Best Practices

1. **Enable CloudTrail** for audit logging
2. **Use AWS WAF** with CloudFront for DDoS protection
3. **Rotate API keys** regularly
4. **Enable MFA** on AWS account
5. **Use least privilege IAM policies**
6. **Enable S3 bucket versioning** for rollback capability
7. **Set up CloudWatch alarms** for suspicious activity

## CI/CD Integration

For automated deployments, integrate with:

- **GitHub Actions**
- **AWS CodePipeline**
- **GitLab CI/CD**
- **CircleCI**

Example GitHub Actions workflow:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run deploy:all
```
