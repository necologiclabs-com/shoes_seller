# Scripts Directory

This directory contains scripts for deploying the application and seeding initial data.

## Scripts Overview

### E2E Verification Scripts

#### verify-e2e.ts

TypeScript script that performs comprehensive end-to-end verification of the deployed application.

**Usage:**

```bash
npm run verify:e2e
```

**What it does:**

1. Verifies CloudFormation stack deployment
2. Checks backend infrastructure (API Gateway, DynamoDB)
3. Checks frontend infrastructure (CloudFront, S3)
4. Validates product data in DynamoDB
5. Validates price data in DynamoDB
6. Tests all API endpoints (GET /products, GET /products/{id}, GET /products/{id}/prices)
7. Tests error scenarios (404, invalid requests)
8. Provides detailed test summary with pass/fail counts

**Output:**

- ✅ Green checkmarks for passed tests
- ❌ Red X marks for failed tests
- Detailed test summary with success rate
- Next steps for manual testing

#### verify-e2e.ps1 (Windows PowerShell)

PowerShell version of the E2E verification script.

**Usage:**

```powershell
.\scripts\verify-e2e.ps1
# Or with custom settings
.\scripts\verify-e2e.ps1 -StackName MyStack -Region us-west-2
```

#### verify-e2e.sh (Linux/Mac Bash)

Bash version of the E2E verification script.

**Usage:**

```bash
chmod +x scripts/verify-e2e.sh
./scripts/verify-e2e.sh
# Or with custom settings
./scripts/verify-e2e.sh MyStack us-west-2
```

**See [E2E_TESTING_README.md](../.kiro/specs/trail-running-price-comparison/E2E_TESTING_README.md) for detailed testing guide.**

### Product Seeding Scripts

#### seed-products.ts

TypeScript script that seeds initial Salomon trail running shoes data into DynamoDB.

**Usage:**

```bash
# Set environment variables
export AWS_REGION=us-east-1
export TABLE_NAME=PriceComparisonTable

# Run via npm
npm run seed:products
```

**What it does:**

1. Connects to DynamoDB using AWS SDK
2. Inserts 10 Salomon trail running shoes with complete product data
3. Generates unique UUIDs for each product
4. Sets timestamps (createdAt, updatedAt)
5. Reports success/failure for each product

#### seed-products.ps1 (Windows PowerShell)

PowerShell wrapper for the seed script with validation checks.

**Usage:**

```powershell
.\scripts\seed-products.ps1
# Or with custom settings
.\scripts\seed-products.ps1 -Region us-west-2 -TableName MyTable
```

#### seed-products.sh (Linux/Mac Bash)

Bash wrapper for the seed script with validation checks.

**Usage:**

```bash
chmod +x scripts/seed-products.sh
./scripts/seed-products.sh
# Or with custom settings
./scripts/seed-products.sh --region us-west-2 --table-name MyTable
```

#### verify-seed.ts

Verification script that checks if products were successfully seeded.

**Usage:**

```bash
npm run verify:seed
```

**What it does:**

1. Scans DynamoDB for product entities
2. Lists all found products with details
3. Verifies expected count (10 products)
4. Checks brand and category consistency
5. Provides summary report

**See [SEED_INSTRUCTIONS.md](./SEED_INSTRUCTIONS.md) for detailed seeding guide.**

### Deployment Scripts

### deploy-frontend.ps1 (Windows PowerShell)

Deploys the frontend to S3 and invalidates CloudFront cache.

**Usage:**

```powershell
.\scripts\deploy-frontend.ps1
```

Or via npm:

```bash
npm run deploy:frontend
```

**What it does:**

1. Fetches S3 bucket name and CloudFront distribution ID from CloudFormation stack
2. Configures frontend with API URL from stack outputs
3. Builds the frontend (`npm run build` in frontend directory)
4. Uploads built files to S3 with appropriate cache headers
5. Creates CloudFront cache invalidation
6. Waits for invalidation to complete
7. Displays the frontend URL

### deploy-frontend.sh (Linux/Mac Bash)

Same functionality as PowerShell version, but for Unix-based systems.

**Usage:**

```bash
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

### configure-frontend.ps1 (Windows PowerShell)

Configures the frontend environment variables by fetching the API URL from the deployed stack.

**Usage:**

```powershell
.\scripts\configure-frontend.ps1
```

Or via npm:

```bash
npm run configure:frontend
```

**What it does:**

1. Fetches API URL from CloudFormation stack outputs
2. Creates `frontend/.env.production` file with the API URL

### configure-frontend.sh (Linux/Mac Bash)

Same functionality as PowerShell version, but for Unix-based systems.

**Usage:**

```bash
chmod +x scripts/configure-frontend.sh
./scripts/configure-frontend.sh
```

## Prerequisites

All scripts require:

- AWS CLI installed and configured
- Node.js and npm installed
- Backend stack deployed (`npm run deploy`)

## Cache Control Headers

The deployment scripts apply different cache headers:

- **Static assets** (JS, CSS, images): `public, max-age=31536000, immutable`
  - Cached for 1 year (immutable)
  - Safe because Vite uses content hashes in filenames

- **index.html**: `public, max-age=0, must-revalidate`
  - Always revalidated
  - Ensures users get the latest version

## CloudFront Invalidation

After uploading files, the scripts create a CloudFront invalidation for `/*` (all paths).

This ensures:

- Users see the latest version immediately
- No stale content is served from edge locations

**Note:** CloudFront invalidations can take 5-15 minutes to complete. The script waits for completion.

## Troubleshooting

### "AWS CLI is not installed"

Install AWS CLI:

- Windows: Download from [AWS CLI installer](https://aws.amazon.com/cli/)
- Mac: `brew install awscli`
- Linux: `sudo apt-get install awscli` or `sudo yum install awscli`

### "Failed to fetch stack outputs"

Ensure the backend stack is deployed:

```bash
npm run deploy
```

### "Access Denied" errors

Check your AWS credentials:

```bash
aws sts get-caller-identity
```

Ensure you have permissions for:

- CloudFormation (read stack outputs)
- S3 (upload files)
- CloudFront (create invalidations)

### PowerShell execution policy errors

Run PowerShell as Administrator and set execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or use the bypass flag (already included in npm scripts):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-frontend.ps1
```

## Manual Deployment

If scripts fail, you can deploy manually:

1. **Get stack outputs:**

   ```bash
   aws cloudformation describe-stacks --stack-name PriceComparisonStack
   ```

2. **Build frontend:**

   ```bash
   cd frontend
   npm run build
   cd ..
   ```

3. **Upload to S3:**

   ```bash
   aws s3 sync frontend/dist/ s3://YOUR_BUCKET_NAME/ --delete
   ```

4. **Invalidate CloudFront:**
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

**GitHub Actions example:**

```yaml
- name: Deploy Frontend
  run: |
    chmod +x scripts/deploy-frontend.sh
    ./scripts/deploy-frontend.sh
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_DEFAULT_REGION: ap-east-1
```

**GitLab CI example:**

```yaml
deploy:
  script:
    - chmod +x scripts/deploy-frontend.sh
    - ./scripts/deploy-frontend.sh
  only:
    - main
```
