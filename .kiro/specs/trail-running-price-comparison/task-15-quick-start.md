# Task 15: Quick Start Guide

## What Was Built

A complete product seeding solution that populates your DynamoDB table with 10 Salomon trail running shoes.

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Ensure AWS is Configured

```bash
# Check AWS credentials
aws sts get-caller-identity

# If not configured, run:
aws configure
```

### Step 3: Run the Seed

**Option A - Using npm (Recommended):**

```bash
npm run seed:products
```

**Option B - Using PowerShell (Windows):**

```powershell
.\scripts\seed-products.ps1
```

**Option C - Using Bash (Linux/Mac):**

```bash
chmod +x scripts/seed-products.sh
./scripts/seed-products.sh
```

## Verify It Worked

```bash
# Run verification script
npm run verify:seed

# Or check via AWS CLI
aws dynamodb scan \
  --table-name PriceComparisonTable \
  --filter-expression "entityType = :type" \
  --expression-attribute-values '{":type":{"S":"product"}}' \
  --select COUNT
```

Expected: 10 products

## What Gets Seeded

10 Salomon trail running shoes:

- Speedcross 6
- Speedcross 5
- Sense Ride 5
- Ultra Glide 2
- S/Lab Pulsar Trail 2
- XA Pro 3D V9
- Thundercross
- Sense Pro 5
- Wildcross 2
- Supercross 4

Each with:

- Unique ID
- Product name & model number
- Brand (Salomon)
- Image URL
- Official product URL
- Category (trail-running)
- Timestamps

## Next Steps

1. **Fetch prices** for the products:

   ```bash
   aws lambda invoke \
     --function-name <UpdatePricesFunctionName> \
     response.json
   ```

2. **Test the API**:

   ```bash
   curl https://<api-gateway-url>/prod/products
   ```

3. **View in frontend**: Open your CloudFront URL

## Troubleshooting

| Issue                          | Solution                           |
| ------------------------------ | ---------------------------------- |
| AWS credentials not configured | Run `aws configure`                |
| Table not found                | Deploy stack: `npm run deploy`     |
| Access denied                  | Check IAM permissions for DynamoDB |
| Module not found               | Run `npm install`                  |

## Documentation

- **Quick Reference**: `scripts/SEED_README.md`
- **Detailed Guide**: `scripts/SEED_INSTRUCTIONS.md`
- **Complete Summary**: `.kiro/specs/trail-running-price-comparison/task-15-summary.md`

## Files Created

- `scripts/seed-products.ts` - Main seed script
- `scripts/verify-seed.ts` - Verification script
- `scripts/seed-products.ps1` - PowerShell wrapper
- `scripts/seed-products.sh` - Bash wrapper
- Documentation files

## Important Notes

⚠️ **Running the seed multiple times will create duplicate products** (new UUIDs each time)

✅ **Safe to run in development** - Just creates more test data

🔄 **To re-seed cleanly**: Delete existing products first via AWS Console
