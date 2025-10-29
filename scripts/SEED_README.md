# Product Seed Script

This directory contains scripts to seed initial Salomon trail running shoes data into the DynamoDB table.

## Prerequisites

1. AWS CDK stack must be deployed (`npm run deploy`)
2. AWS credentials must be configured
3. Node.js dependencies must be installed (`npm install`)

## Usage

### Option 1: Using npm script (Recommended)

```bash
# Set environment variables
export AWS_REGION=us-east-1
export TABLE_NAME=PriceComparisonTable

# Run the seed script
npm run seed:products
```

### Option 2: Using PowerShell script (Windows)

```powershell
# Run with default settings (us-east-1, PriceComparisonTable)
.\scripts\seed-products.ps1

# Run with custom settings
.\scripts\seed-products.ps1 -Region us-west-2 -TableName MyTable
```

### Option 3: Using Bash script (Linux/Mac)

```bash
# Run with default settings
./scripts/seed-products.sh

# Run with custom settings
./scripts/seed-products.sh --region us-west-2 --table-name MyTable
```

## What Gets Seeded

The script seeds 10 popular Salomon trail running shoes:

1. **Speedcross 6** - Aggressive grip for soft, muddy terrain
2. **Speedcross 5** - Previous generation of the popular Speedcross line
3. **Sense Ride 5** - Balanced cushioning for long distances
4. **Ultra Glide 2** - Maximum cushioning for ultra distances
5. **S/Lab Pulsar Trail 2** - Lightweight racing shoe
6. **XA Pro 3D V9** - All-terrain stability and protection
7. **Thundercross** - Dynamic grip for varied terrain
8. **Sense Pro 5** - Precise fit for technical trails
9. **Wildcross 2** - Versatile grip for mixed conditions
10. **Supercross 4** - Entry-level trail running

Each product includes:

- Unique ID (UUID)
- Product name
- Model number
- Brand (Salomon)
- Image URL (from Salomon official site)
- Official product URL
- Category (trail-running)
- Timestamps (createdAt, updatedAt)

## Verification

After running the seed script, verify the data:

### Using AWS CLI

```bash
# List all products
aws dynamodb scan \
  --table-name PriceComparisonTable \
  --filter-expression "entityType = :type" \
  --expression-attribute-values '{":type":{"S":"product"}}' \
  --region us-east-1

# Count products
aws dynamodb scan \
  --table-name PriceComparisonTable \
  --filter-expression "entityType = :type" \
  --expression-attribute-values '{":type":{"S":"product"}}' \
  --select COUNT \
  --region us-east-1
```

### Using AWS Console

1. Go to DynamoDB console
2. Select `PriceComparisonTable`
3. Click "Explore table items"
4. Filter by `entityType = product`
5. You should see 10 Salomon products

## Next Steps

After seeding products:

1. **Fetch Prices**: Trigger the UpdatePrices Lambda function to fetch current prices from all platforms

   ```bash
   aws lambda invoke \
     --function-name <UpdatePricesFunctionName> \
     --region us-east-1 \
     response.json
   ```

2. **Test API**: Test the products API endpoint

   ```bash
   curl https://<api-gateway-url>/prod/products
   ```

3. **View Frontend**: Open the CloudFront URL to see products in the UI

## Troubleshooting

### Error: AWS credentials not configured

Run `aws configure` and provide your AWS access key, secret key, and default region.

### Error: Table not found

Make sure the CDK stack is deployed:

```bash
npm run deploy
```

### Error: Access denied

Ensure your AWS credentials have permissions to write to DynamoDB:

- `dynamodb:PutItem`
- `dynamodb:DescribeTable`

### Script fails with TypeScript errors

Make sure dependencies are installed:

```bash
npm install
```

## Customization

To add more products or modify existing ones, edit `scripts/seed-products.ts`:

```typescript
const salomonProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Your Product Name',
    modelNumber: 'MODEL123',
    brand: 'Salomon',
    imageUrl: 'https://example.com/image.png',
    officialUrl: 'https://example.com/product',
    category: 'trail-running',
  },
  // ... more products
];
```

Then run the seed script again. Note that this will create duplicate entries if the same products already exist (new UUIDs will be generated).

## Re-seeding

To re-seed the database:

1. **Delete existing products** (optional):

   ```bash
   # This requires a custom script or manual deletion via console
   ```

2. **Run seed script again**:
   ```bash
   npm run seed:products
   ```

Note: The seed script does not check for duplicates. Each run will create new product entries with new UUIDs.
