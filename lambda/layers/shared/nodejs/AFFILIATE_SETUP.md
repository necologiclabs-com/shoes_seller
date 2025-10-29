# Affiliate Link Setup Guide

## Overview

This implementation adds affiliate link generation functionality to the price comparison API. The system retrieves affiliate configurations from AWS Systems Manager Parameter Store and generates platform-specific affiliate URLs.

## AWS Parameter Store Configuration

To enable affiliate links, you need to configure the following parameters in AWS Systems Manager Parameter Store:

### Parameter Structure

For each platform (amazon, rakuten, yodobashi, mercari), create the following parameters:

```
/price-comparison/affiliate/{platform}/id
/price-comparison/affiliate/{platform}/tracking-tag (optional)
```

### Example Parameters

```bash
# Amazon
aws ssm put-parameter \
  --name "/price-comparison/affiliate/amazon/id" \
  --value "your-amazon-associate-tag" \
  --type "String"

# Rakuten
aws ssm put-parameter \
  --name "/price-comparison/affiliate/rakuten/id" \
  --value "your-rakuten-affiliate-id" \
  --type "String"

# Yodobashi
aws ssm put-parameter \
  --name "/price-comparison/affiliate/yodobashi/id" \
  --value "your-yodobashi-affiliate-id" \
  --type "String"

# Mercari
aws ssm put-parameter \
  --name "/price-comparison/affiliate/mercari/id" \
  --value "your-mercari-affiliate-id" \
  --type "String"
```

## Affiliate URL Formats

### Amazon

- Format: `https://www.amazon.co.jp/dp/{ASIN}?tag={affiliateId}`
- The affiliate tag is added as a query parameter

### Rakuten

- Format: `https://hb.afl.rakuten.co.jp/hgc/{affiliateId}/?pc={encodedProductUrl}`
- Uses Rakuten's affiliate redirect service

### Yodobashi

- Format: Original URL with `?affiliate_id={affiliateId}` parameter
- Adds affiliate ID as a query parameter to the product URL

### Mercari

- Format: Original URL with `?afid={affiliateId}` parameter
- Adds affiliate ID as a query parameter to the product URL

## Caching

The system caches affiliate configurations for 5 minutes to reduce Parameter Store API calls. The cache is automatically refreshed when it expires.

## API Response

The `/products/{productId}/prices` endpoint now includes an `affiliateUrl` field for each platform:

```json
{
  "productId": "product-123",
  "prices": [
    {
      "platform": "amazon",
      "price": 15000,
      "availability": "in_stock",
      "productUrl": "https://www.amazon.co.jp/dp/B08XYZ123",
      "affiliateUrl": "https://www.amazon.co.jp/dp/B08XYZ123?tag=your-tag",
      "lastUpdated": "2025-10-26T10:00:00Z"
    }
  ],
  "lastUpdated": "2025-10-26T10:00:00Z"
}
```

## Fallback Behavior

If no affiliate configuration is found for a platform, the system falls back to using the original product URL without affiliate parameters.

## Testing

To test the affiliate link generation locally or in development:

1. Set up the Parameter Store parameters in your AWS account
2. Ensure the Lambda function has IAM permissions to read from Parameter Store
3. Deploy the updated stack
4. Call the `/products/{productId}/prices` endpoint
5. Verify that `affiliateUrl` fields are present and correctly formatted

## IAM Permissions

The GetPrices Lambda function requires the following IAM permissions:

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter", "ssm:GetParametersByPath"],
  "Resource": ["arn:aws:ssm:{region}:{account}:parameter/price-comparison/affiliate/*"]
}
```

These permissions are automatically granted by the CDK stack.
