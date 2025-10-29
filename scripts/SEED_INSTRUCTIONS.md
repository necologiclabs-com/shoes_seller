# Product Seeding Instructions

This guide walks you through seeding initial Salomon trail running shoes data into your DynamoDB table.

## Step 1: Prerequisites Check

Before running the seed script, ensure:

### 1.1 AWS CDK Stack is Deployed

```bash
# Deploy the infrastructure
npm run deploy

# Wait for deployment to complete
# Note the outputs, especially the TableName
```

### 1.2 AWS Credentials are Configured

```bash
# Check if credentials are configured
aws sts get-caller-identity

# If not configured, run:
aws configure
```

You'll need:

- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)

### 1.3 Dependencies are Installed

```bash
# Install all dependencies
npm install
```

## Step 2: Run the Seed Script

### Method 1: Using npm script (Cross-platform)

```bash
# Set environment variables (optional, defaults to us-east-1 and PriceComparisonTable)
export AWS_REGION=us-east-1
export TABLE_NAME=PriceComparisonTable

# Run the seed
npm run seed:products
```

### Method 2: Using PowerShell script (Windows)

```powershell
# Navigate to project root
cd path\to\trail-running-price-comparison

# Run with default settings
.\scripts\seed-products.ps1

# Or with custom settings
.\scripts\seed-products.ps1 -Region us-west-2 -TableName MyCustomTable
```

### Method 3: Using Bash script (Linux/Mac)

```bash
# Navigate to project root
cd path/to/trail-running-price-comparison

# Make script executable (first time only)
chmod +x scripts/seed-products.sh

# Run with default settings
./scripts/seed-products.sh

# Or with custom settings
./scripts/seed-products.sh --region us-west-2 --table-name MyCustomTable
```

## Step 3: Verify the Seed

### Method 1: Using verification script

```bash
# Run the verification script
npm run verify:seed
```

Expected output:

```
Verifying seeded products...
Table: PriceComparisonTable
Region: us-east-1

✓ Found 10 products

=== Product List ===

1. Salomon S/Lab Pulsar Trail 2
   ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Model: L47454000
   Brand: Salomon
   Category: trail-running
   Created: 2024-01-15T10:30:00.000Z

2. Salomon Sense Pro 5
   ...

✓ All 10 expected products are present
✓ 10 Salomon products found
✓ 10 trail-running products found

=== Verification Summary ===
Total products: 10
Salomon products: 10
Trail running products: 10

✓ Verification completed successfully!
```

### Method 2: Using AWS CLI

```bash
# Count products
aws dynamodb scan \
  --table-name PriceComparisonTable \
  --filter-expression "entityType = :type" \
  --expression-attribute-values '{":type":{"S":"product"}}' \
  --select COUNT \
  --region us-east-1

# List all products
aws dynamodb scan \
  --table-name PriceComparisonTable \
  --filter-expression "entityType = :type" \
  --expression-attribute-values '{":type":{"S":"product"}}' \
  --region us-east-1
```

### Method 3: Using AWS Console

1. Open AWS Console
2. Navigate to DynamoDB
3. Select `PriceComparisonTable`
4. Click "Explore table items"
5. Add filter: `entityType = product`
6. You should see 10 items

## Step 4: Test the API

After seeding, test that the API can retrieve products:

```bash
# Get the API URL from CDK outputs
aws cloudformation describe-stacks \
  --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# Test the products endpoint
curl https://<api-gateway-url>/prod/products

# Test a specific product (use an ID from the verification output)
curl https://<api-gateway-url>/prod/products/<product-id>
```

Expected response:

```json
{
  "products": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "name": "Salomon Speedcross 6",
      "modelNumber": "L47452800",
      "brand": "Salomon",
      "imageUrl": "https://www.salomon.com/...",
      "officialUrl": "https://www.salomon.com/...",
      "category": "trail-running",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    ...
  ]
}
```

## Seeded Products

The script seeds 10 Salomon trail running shoes:

| #   | Product Name         | Model Number | Description                             |
| --- | -------------------- | ------------ | --------------------------------------- |
| 1   | Speedcross 6         | L47452800    | Aggressive grip for soft, muddy terrain |
| 2   | Speedcross 5         | L41109200    | Previous generation Speedcross          |
| 3   | Sense Ride 5         | L47163000    | Balanced cushioning for long distances  |
| 4   | Ultra Glide 2        | L47453900    | Maximum cushioning for ultra distances  |
| 5   | S/Lab Pulsar Trail 2 | L47454000    | Lightweight racing shoe                 |
| 6   | XA Pro 3D V9         | L47454100    | All-terrain stability and protection    |
| 7   | Thundercross         | L47268900    | Dynamic grip for varied terrain         |
| 8   | Sense Pro 5          | L47163100    | Precise fit for technical trails        |
| 9   | Wildcross 2          | L47268800    | Versatile grip for mixed conditions     |
| 10  | Supercross 4         | L47268700    | Entry-level trail running               |

## Troubleshooting

### Error: "AWS credentials not configured"

**Solution:**

```bash
aws configure
```

Provide your AWS Access Key ID, Secret Access Key, and default region.

### Error: "Table 'PriceComparisonTable' not found"

**Solution:**

```bash
# Deploy the CDK stack first
npm run deploy
```

### Error: "Access Denied"

**Solution:** Ensure your IAM user/role has these permissions:

- `dynamodb:PutItem`
- `dynamodb:Scan`
- `dynamodb:DescribeTable`

### Error: "Cannot find module 'uuid'"

**Solution:**

```bash
# Reinstall dependencies
npm install
```

### Products appear duplicated

**Cause:** Running the seed script multiple times creates new entries with new UUIDs.

**Solution:**

- The seed script doesn't check for duplicates
- To avoid duplicates, only run the seed once
- To clean up, manually delete duplicate entries via AWS Console or CLI

## Next Steps

After successfully seeding products:

1. **Fetch Prices**: Trigger the UpdatePrices Lambda to fetch current prices

   ```bash
   aws lambda invoke \
     --function-name <UpdatePricesFunctionName> \
     --region us-east-1 \
     response.json
   ```

2. **Configure Frontend**: Set up the frontend with the API URL

   ```bash
   npm run configure:frontend
   ```

3. **Deploy Frontend**: Deploy the React application

   ```bash
   npm run deploy:frontend
   ```

4. **Test End-to-End**: Open the CloudFront URL and verify:
   - Products are displayed on the home page
   - Clicking a product shows details
   - Price comparison is visible (after prices are fetched)

## Re-seeding

To re-seed the database:

1. **Option A: Delete and re-seed** (recommended for development)
   - Manually delete products via AWS Console
   - Run seed script again

2. **Option B: Destroy and recreate stack**
   ```bash
   cdk destroy
   npm run deploy
   npm run seed:products
   ```

Note: In production, consider implementing an upsert mechanism to avoid duplicates.

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review AWS CloudWatch logs for Lambda functions
3. Verify IAM permissions
4. Check the main README.md for project setup
