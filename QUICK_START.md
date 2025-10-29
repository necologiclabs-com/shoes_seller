# Quick Start Guide

Get the Trail Running Price Comparison application up and running in minutes.

## 🚀 5-Minute Setup

### Step 1: Prerequisites Check

```bash
# Check Node.js (need v20+)
node --version

# Check AWS CLI
aws --version

# Check AWS credentials
aws sts get-caller-identity
```

If any command fails, see [Prerequisites](#prerequisites) below.

### Step 2: Install Dependencies

```bash
# Clone and enter directory
git clone <repository-url>
cd trail-running-price-comparison

# Install all dependencies
npm install
cd frontend && npm install && cd ..
cd lambda/layers/shared/nodejs && npm install && cd ../../../..
```

### Step 3: Build and Deploy

```bash
# Build TypeScript
npm run build

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy everything
npm run deploy:all
```

⏱️ **Deployment takes 5-10 minutes**

### Step 4: Seed Data

```bash
# Add initial products
npm run seed:products

# Verify
npm run verify:seed
```

### Step 5: Access Application

The CloudFront URL is displayed in deployment output. Open it in your browser!

```
✅ Deployment complete!
🌐 Frontend URL: https://d1234567890.cloudfront.net
```

## 📚 Next Steps

### Configure Affiliate Links (Optional)

```bash
# Set up affiliate IDs for commission tracking
aws ssm put-parameter \
  --name "/price-comparison/affiliate/amazon/id" \
  --value "your-amazon-tag" \
  --type "String"

# Repeat for rakuten, yodobashi, mercari
```

See [AFFILIATE_CONFIGURATION.md](./AFFILIATE_CONFIGURATION.md) for detailed instructions.

### Trigger Price Updates

```bash
# Manually fetch prices from all platforms
aws lambda invoke \
  --function-name PriceComparisonStack-UpdatePricesFunction* \
  response.json

# Prices update automatically every 6 hours
```

### Verify Everything Works

```bash
# Run end-to-end verification
npm run verify:e2e
```

## 📖 Documentation Index

### Getting Started

- **[README.md](./README.md)** - Project overview and main documentation
- **[QUICK_START.md](./QUICK_START.md)** - This file
- **[SETUP.md](./SETUP.md)** - Initial setup instructions

### Development

- **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** - Complete development guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment procedures

### Configuration

- **[AFFILIATE_CONFIGURATION.md](./AFFILIATE_CONFIGURATION.md)** - Affiliate setup guide
- **[scripts/SEED_INSTRUCTIONS.md](./scripts/SEED_INSTRUCTIONS.md)** - Product seeding guide

### Testing

- **[.kiro/specs/.../E2E_TESTING_README.md](./.kiro/specs/trail-running-price-comparison/E2E_TESTING_README.md)** - E2E testing guide
- **[.kiro/specs/.../MONITORING_QUICK_REFERENCE.md](./.kiro/specs/trail-running-price-comparison/MONITORING_QUICK_REFERENCE.md)** - Monitoring guide

### Architecture

- **[.kiro/specs/.../requirements.md](./.kiro/specs/trail-running-price-comparison/requirements.md)** - Requirements document
- **[.kiro/specs/.../design.md](./.kiro/specs/trail-running-price-comparison/design.md)** - Design document
- **[.kiro/specs/.../tasks.md](./.kiro/specs/trail-running-price-comparison/tasks.md)** - Implementation tasks

## Prerequisites

### Required Software

| Software | Version | Download                    |
| -------- | ------- | --------------------------- |
| Node.js  | 20.x+   | https://nodejs.org/         |
| npm      | 10.x+   | (included with Node.js)     |
| AWS CLI  | 2.x+    | https://aws.amazon.com/cli/ |
| Git      | Any     | https://git-scm.com/        |

### AWS Account Setup

1. **Create AWS Account**: https://aws.amazon.com/
2. **Create IAM User** with programmatic access
3. **Attach Policies**: `AdministratorAccess` (for development)
4. **Configure Credentials**:
   ```bash
   aws configure
   ```

## Common Commands

### Development

```bash
# Start frontend dev server
cd frontend && npm run dev

# Watch TypeScript compilation
npm run watch

# Format code
npm run format

# Lint code
npm run lint
```

### Deployment

```bash
# Deploy backend only
npm run deploy

# Deploy frontend only
npm run deploy:frontend

# Deploy everything
npm run deploy:all

# Configure frontend env
npm run configure:frontend
```

### Data Management

```bash
# Seed products
npm run seed:products

# Verify seed
npm run verify:seed

# Run E2E tests
npm run verify:e2e
```

### Monitoring

```bash
# View Lambda logs
aws logs tail /aws/lambda/GetProductsFunction --follow

# Check API
curl https://<api-url>/prod/products

# List DynamoDB items
aws dynamodb scan --table-name PriceComparisonTable
```

## Troubleshooting

### "AWS credentials not configured"

```bash
aws configure
# Enter your Access Key ID, Secret Access Key, and region
```

### "CDK bootstrap required"

```bash
npx cdk bootstrap
```

### "Table not found"

```bash
# Deploy the stack first
npm run deploy
```

### "Frontend shows network error"

```bash
# Configure frontend with API URL
npm run configure:frontend
```

### "Prices not showing"

```bash
# Trigger price update
aws lambda invoke \
  --function-name <UpdatePricesFunctionName> \
  response.json
```

## Architecture Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ CloudFront  │ ← Frontend (React SPA)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Lambda    │ ← Business Logic
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  DynamoDB   │ ← Data Storage
└─────────────┘
```

## Project Structure

```
trail-running-price-comparison/
├── bin/                    # CDK entry point
├── lib/                    # CDK stack
├── lambda/                 # Lambda functions
│   ├── get-products/
│   ├── get-product-detail/
│   ├── get-prices/
│   ├── update-prices/
│   └── layers/shared/      # Shared code
├── frontend/               # React app
│   └── src/
│       ├── components/
│       ├── pages/
│       └── api/
├── scripts/                # Utility scripts
├── .kiro/specs/           # Design docs
└── Documentation files
```

## Key Features

✅ **Multi-Platform Price Comparison**

- Amazon, Rakuten, Yodobashi, Mercari

✅ **Automated Price Updates**

- Every 6 hours via EventBridge

✅ **Affiliate Link Integration**

- Earn commissions on purchases

✅ **Responsive Design**

- Mobile, tablet, desktop support

✅ **Serverless Architecture**

- Scalable, cost-effective

✅ **Real-time Availability**

- Stock status for each platform

## Support

### Documentation

- Check relevant .md files in project root
- Review CloudWatch logs for errors
- See AWS documentation for service-specific issues

### Common Resources

- **AWS CDK Docs**: https://docs.aws.amazon.com/cdk/
- **React Docs**: https://react.dev/
- **DynamoDB Docs**: https://docs.aws.amazon.com/dynamodb/

### Getting Help

1. Check [Troubleshooting](#troubleshooting) section
2. Review CloudWatch logs
3. Check AWS service health dashboard
4. Review error messages carefully

## What's Next?

After completing the quick start:

1. **Configure Affiliate Links** - Start earning commissions
   - See [AFFILIATE_CONFIGURATION.md](./AFFILIATE_CONFIGURATION.md)

2. **Customize Products** - Add your own products
   - Modify `scripts/seed-products.ts`
   - Run `npm run seed:products`

3. **Customize Frontend** - Brand the application
   - Edit `frontend/src/components/Header.tsx`
   - Modify TailwindCSS theme in `frontend/tailwind.config.js`

4. **Set Up Monitoring** - Track performance
   - Configure CloudWatch alarms
   - Set up SNS notifications
   - See [MONITORING_QUICK_REFERENCE.md](./.kiro/specs/trail-running-price-comparison/MONITORING_QUICK_REFERENCE.md)

5. **Enable CI/CD** - Automate deployments
   - Set up GitHub Actions
   - Configure automated testing
   - See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Cost Estimate

### AWS Free Tier (First 12 Months)

- **Lambda**: 1M requests/month free
- **API Gateway**: 1M requests/month free
- **DynamoDB**: 25GB storage free
- **CloudFront**: 1TB data transfer free
- **S3**: 5GB storage free

### Beyond Free Tier (Estimated)

- **Lambda**: ~$0.20/month (low traffic)
- **API Gateway**: ~$3.50/month (1M requests)
- **DynamoDB**: ~$1.25/month (on-demand)
- **CloudFront**: ~$0.085/GB
- **S3**: ~$0.023/GB

**Total**: ~$5-10/month for low-medium traffic

## Security Checklist

- ✅ AWS credentials configured securely
- ✅ IAM least privilege policies
- ✅ HTTPS only (CloudFront + API Gateway)
- ✅ Secrets in Parameter Store/Secrets Manager
- ✅ No credentials in source code
- ✅ CORS properly configured
- ✅ Input validation in Lambda functions

## Performance Tips

1. **CloudFront Caching**: Static assets cached at edge
2. **DynamoDB On-Demand**: Auto-scales with traffic
3. **Lambda Layers**: Shared code reduces cold starts
4. **React Query**: Client-side caching
5. **Price Caching**: 6-hour update cycle

---

**Ready to start? Run the 5-minute setup above! 🚀**
