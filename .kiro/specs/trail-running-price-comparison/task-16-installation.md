# Task 16: Installation and Setup Guide

## Prerequisites

Before running the E2E tests, ensure you have:

1. ✅ AWS CLI installed and configured
2. ✅ Node.js 20.x or higher installed
3. ✅ Backend deployed (Tasks 1-7 completed)
4. ✅ Frontend deployed (Tasks 8-14 completed)
5. ✅ Product data seeded (Task 15 completed)

## Installation Steps

### Step 1: Install Dependencies

The E2E verification scripts require additional AWS SDK packages. Install them by running:

```bash
npm install
```

This will install:

- `@aws-sdk/client-cloudformation` - For reading CloudFormation stack outputs
- `@aws-sdk/client-lambda` - For invoking Lambda functions
- `@aws-sdk/client-dynamodb` - For querying DynamoDB (already installed)

### Step 2: Verify AWS Configuration

Ensure your AWS credentials are configured:

```bash
aws sts get-caller-identity
```

Expected output:

```json
{
  "UserId": "AIDAXXXXXXXXXXXXXXXXX",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/your-user"
}
```

### Step 3: Verify Stack Deployment

Check that the CloudFormation stack is deployed:

```bash
aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].StackStatus"
```

Expected output: `"CREATE_COMPLETE"` or `"UPDATE_COMPLETE"`

### Step 4: Run E2E Verification

Now you can run the E2E verification:

```bash
npm run verify:e2e
```

## Platform-Specific Instructions

### Windows (PowerShell)

```powershell
# Install dependencies
npm install

# Run verification
npm run verify:e2e

# Or run PowerShell script directly
.\scripts\verify-e2e.ps1
```

### macOS/Linux (Bash)

```bash
# Install dependencies
npm install

# Make script executable
chmod +x scripts/verify-e2e.sh

# Run verification
npm run verify:e2e

# Or run bash script directly
./scripts/verify-e2e.sh
```

## Troubleshooting

### Error: Module '@aws-sdk/client-cloudformation' not found

**Solution:**

```bash
npm install @aws-sdk/client-cloudformation @aws-sdk/client-lambda
```

### Error: AWS credentials not configured

**Solution:**

```bash
aws configure
```

Enter your:

- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., ap-northeast-1)
- Default output format (json)

### Error: Stack not found

**Solution:**

Deploy the backend first:

```bash
npm run deploy
```

### Error: No products found

**Solution:**

Seed the product data:

```bash
npm run seed:products
```

### Error: No price data found

**Solution:**

Trigger the price update function:

```bash
aws lambda invoke --function-name PriceComparisonStack-UpdatePricesFunction --payload '{}' response.json
```

## Expected Output

When everything is set up correctly, you should see:

```
🚀 Starting E2E Verification Tests...

Stack Name: PriceComparisonStack
Region: ap-northeast-1

📋 Testing Backend Deployment...

✅ Backend - API Gateway Endpoint: Endpoint found: https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
✅ Backend - DynamoDB Table: Table name: PriceComparisonTable

🌐 Testing Frontend Deployment...

✅ Frontend - CloudFront URL: URL: https://xxxxx.cloudfront.net
✅ Frontend - S3 Bucket: Bucket: pricecomparisonstack-xxxxx

📦 Testing Product Data...

✅ Data - Products Seeded: Found 10 products
✅ Data - Product Structure: Product has all required fields

💰 Testing Price Data...

✅ Data - Price Data Exists: Found 40 price records
✅ Data - Multiple Platforms: Found platforms: amazon, rakuten, yodobashi, mercari

🔌 Testing API Endpoints...

✅ API - GET /products: Success: 10 products returned
✅ API - GET /products/{productId}: Success: Product salomon-speedcross-6 retrieved
✅ API - GET /products/{productId}/prices: Success: 4 prices returned

🚨 Testing Error Scenarios...

✅ Error - 404 Not Found: Correctly returns 404 for non-existent product

============================================================
📊 TEST SUMMARY
============================================================

Total Tests: 13
✅ Passed: 13
❌ Failed: 0
Success Rate: 100.0%

============================================================

✨ E2E Verification Complete!

Next Steps:
1. Open the frontend URL in your browser:
   https://xxxxx.cloudfront.net
2. Follow the manual testing guide:
   .kiro/specs/trail-running-price-comparison/task-16-e2e-testing-guide.md
3. Test the complete user flow
4. Verify affiliate links
```

## Next Steps

After successful installation and verification:

1. ✅ Review the automated test results
2. 📋 Follow the manual testing guide: [task-16-e2e-testing-guide.md](./task-16-e2e-testing-guide.md)
3. 🌐 Open the frontend URL in your browser
4. ✅ Complete all manual test scenarios
5. 📝 Record test results in the testing guide

## Additional Resources

- **Quick Reference**: [TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md)
- **Detailed Testing Guide**: [task-16-e2e-testing-guide.md](./task-16-e2e-testing-guide.md)
- **E2E Testing README**: [E2E_TESTING_README.md](./E2E_TESTING_README.md)
- **Task Summary**: [task-16-summary.md](./task-16-summary.md)

## Support

If you encounter issues not covered in this guide:

1. Check CloudWatch Logs for Lambda functions
2. Check browser console for frontend errors
3. Review CloudFormation stack events
4. Verify DynamoDB table data
5. Consult the troubleshooting section in [E2E_TESTING_README.md](./E2E_TESTING_README.md)
