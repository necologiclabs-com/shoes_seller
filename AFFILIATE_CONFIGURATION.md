# Affiliate Configuration Guide

Complete guide for setting up and managing affiliate links for the Trail Running Price Comparison application.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Platform-Specific Setup](#platform-specific-setup)
- [AWS Configuration](#aws-configuration)
- [Verification](#verification)
- [URL Format Reference](#url-format-reference)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The application supports affiliate links for four e-commerce platforms:

| Platform  | Type             | Commission | Sign-up Difficulty |
| --------- | ---------------- | ---------- | ------------------ |
| Amazon    | Official Program | 2-10%      | Easy               |
| Rakuten   | Official Program | 1-8%       | Easy               |
| Yodobashi | Official Program | 1-3%       | Medium             |
| Mercari   | Official Program | Variable   | Medium             |

### How It Works

1. **Configuration Storage**: Affiliate IDs are stored in AWS Systems Manager Parameter Store
2. **Caching**: IDs are cached for 5 minutes to reduce API calls
3. **URL Generation**: Platform-specific URLs are generated with affiliate parameters
4. **Fallback**: If no affiliate ID is configured, the original product URL is used

## Prerequisites

Before configuring affiliate links, ensure:

1. **AWS CLI is installed and configured**

   ```bash
   aws --version
   aws sts get-caller-identity
   ```

2. **Backend is deployed**

   ```bash
   npm run deploy
   ```

3. **IAM permissions** to write to Systems Manager Parameter Store
   - `ssm:PutParameter`
   - `ssm:GetParameter`

## Platform-Specific Setup

### Amazon Associates

#### 1. Sign Up for Amazon Associates

1. Visit: https://affiliate.amazon.co.jp/ (for Japan)
   - Or https://affiliate-program.amazon.com/ (for US)
2. Click "Join Now for Free"
3. Fill in your information:
   - Website/app information
   - Payment details
   - Tax information
4. Wait for approval (usually 1-3 days)

#### 2. Get Your Associate Tag

1. Log in to Amazon Associates Central
2. Navigate to "Tools" → "Product Links"
3. Your Associate Tag is displayed at the top
   - Format: `yourname-22` (Japan) or `yourname-20` (US)

#### 3. Configure in AWS

```bash
aws ssm put-parameter \
  --name "/price-comparison/affiliate/amazon/id" \
  --value "your-associate-tag-22" \
  --type "String" \
  --overwrite
```

#### 4. Verify

```bash
aws ssm get-parameter \
  --name "/price-comparison/affiliate/amazon/id" \
  --query "Parameter.Value" \
  --output text
```

#### URL Format

```
https://www.amazon.co.jp/dp/{ASIN}?tag={your-associate-tag}
```

Example:

```
https://www.amazon.co.jp/dp/B08XYZ123?tag=yourname-22
```

### Rakuten Affiliate

#### 1. Sign Up for Rakuten Affiliate

1. Visit: https://affiliate.rakuten.co.jp/
2. Click "新規会員登録" (New Member Registration)
3. Fill in your information:
   - Email address
   - Website/blog information
   - Payment details (bank account)
4. Wait for approval (usually 1-2 days)

#### 2. Get Your Affiliate ID

1. Log in to Rakuten Affiliate
2. Navigate to "アフィリエイトID確認" (Check Affiliate ID)
3. Copy your Affiliate ID
   - Format: `1234567890.abcdefgh.12345678.ijklmnop`

#### 3. Configure in AWS

```bash
aws ssm put-parameter \
  --name "/price-comparison/affiliate/rakuten/id" \
  --value "1234567890.abcdefgh.12345678.ijklmnop" \
  --type "String" \
  --overwrite
```

#### 4. Verify

```bash
aws ssm get-parameter \
  --name "/price-comparison/affiliate/rakuten/id" \
  --query "Parameter.Value" \
  --output text
```

#### URL Format

```
https://hb.afl.rakuten.co.jp/hgc/{affiliate-id}/?pc={encoded-product-url}
```

Example:

```
https://hb.afl.rakuten.co.jp/hgc/1234567890.abcdefgh.12345678.ijklmnop/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fitem123%2F
```

### Yodobashi Affiliate

#### 1. Sign Up for Yodobashi Affiliate

1. Visit: https://www.yodobashi.com/ec/support/affiliate/index.html
2. Click "アフィリエイト申込" (Apply for Affiliate)
3. Fill in the application form:
   - Website information
   - Contact details
   - Payment information
4. Wait for approval (usually 3-7 days)

#### 2. Get Your Affiliate ID

1. Log in to Yodobashi Affiliate Portal
2. Navigate to "アフィリエイトID" (Affiliate ID)
3. Copy your Affiliate ID
   - Format: `yodobashi_affiliate_12345`

#### 3. Configure in AWS

```bash
aws ssm put-parameter \
  --name "/price-comparison/affiliate/yodobashi/id" \
  --value "yodobashi_affiliate_12345" \
  --type "String" \
  --overwrite
```

#### 4. Verify

```bash
aws ssm get-parameter \
  --name "/price-comparison/affiliate/yodobashi/id" \
  --query "Parameter.Value" \
  --output text
```

#### URL Format

```
{original-product-url}?affiliate_id={your-affiliate-id}
```

Example:

```
https://www.yodobashi.com/product/100000001234567/?affiliate_id=yodobashi_affiliate_12345
```

### Mercari Affiliate

#### 1. Sign Up for Mercari Affiliate

1. Visit: https://about.mercari.com/affiliate/ (if available)
2. Or contact Mercari business support for affiliate program details
3. Fill in the application:
   - Business information
   - Website/app details
   - Expected traffic
4. Wait for approval (usually 5-10 days)

#### 2. Get Your Affiliate ID

1. Log in to Mercari Affiliate Dashboard
2. Navigate to "Affiliate Settings"
3. Copy your Affiliate ID
   - Format: `mercari_aff_12345`

#### 3. Configure in AWS

```bash
aws ssm put-parameter \
  --name "/price-comparison/affiliate/mercari/id" \
  --value "mercari_aff_12345" \
  --type "String" \
  --overwrite
```

#### 4. Verify

```bash
aws ssm get-parameter \
  --name "/price-comparison/affiliate/mercari/id" \
  --query "Parameter.Value" \
  --output text
```

#### URL Format

```
{original-product-url}?afid={your-affiliate-id}
```

Example:

```
https://jp.mercari.com/item/m12345678901?afid=mercari_aff_12345
```

## AWS Configuration

### Using AWS CLI

#### Set All Affiliate IDs at Once

Create a script `configure-affiliates.sh`:

```bash
#!/bin/bash

# Amazon
aws ssm put-parameter \
  --name "/price-comparison/affiliate/amazon/id" \
  --value "your-amazon-tag" \
  --type "String" \
  --overwrite

# Rakuten
aws ssm put-parameter \
  --name "/price-comparison/affiliate/rakuten/id" \
  --value "your-rakuten-id" \
  --type "String" \
  --overwrite

# Yodobashi
aws ssm put-parameter \
  --name "/price-comparison/affiliate/yodobashi/id" \
  --value "your-yodobashi-id" \
  --type "String" \
  --overwrite

# Mercari
aws ssm put-parameter \
  --name "/price-comparison/affiliate/mercari/id" \
  --value "your-mercari-id" \
  --type "String" \
  --overwrite

echo "All affiliate IDs configured successfully!"
```

Make executable and run:

```bash
chmod +x configure-affiliates.sh
./configure-affiliates.sh
```

#### PowerShell Version

Create `configure-affiliates.ps1`:

```powershell
# Amazon
aws ssm put-parameter `
  --name "/price-comparison/affiliate/amazon/id" `
  --value "your-amazon-tag" `
  --type "String" `
  --overwrite

# Rakuten
aws ssm put-parameter `
  --name "/price-comparison/affiliate/rakuten/id" `
  --value "your-rakuten-id" `
  --type "String" `
  --overwrite

# Yodobashi
aws ssm put-parameter `
  --name "/price-comparison/affiliate/yodobashi/id" `
  --value "your-yodobashi-id" `
  --type "String" `
  --overwrite

# Mercari
aws ssm put-parameter `
  --name "/price-comparison/affiliate/mercari/id" `
  --value "your-mercari-id" `
  --type "String" `
  --overwrite

Write-Host "All affiliate IDs configured successfully!"
```

Run:

```powershell
.\configure-affiliates.ps1
```

### Using AWS Console

1. **Open AWS Console**
2. **Navigate to Systems Manager**
3. **Go to Parameter Store**
4. **Create Parameters**:
   - Click "Create parameter"
   - Name: `/price-comparison/affiliate/amazon/id`
   - Type: `String`
   - Value: Your affiliate ID
   - Click "Create parameter"
5. **Repeat for all platforms**

### Using AWS CDK (Optional)

Add to `lib/price-comparison-stack.ts`:

```typescript
import * as ssm from 'aws-cdk-lib/aws-ssm';

// In your stack constructor
new ssm.StringParameter(this, 'AmazonAffiliateId', {
  parameterName: '/price-comparison/affiliate/amazon/id',
  stringValue: 'your-amazon-tag', // Or use context/env var
});

new ssm.StringParameter(this, 'RakutenAffiliateId', {
  parameterName: '/price-comparison/affiliate/rakuten/id',
  stringValue: 'your-rakuten-id',
});

// Repeat for other platforms
```

**Note**: Hardcoding affiliate IDs in CDK is not recommended for production. Use environment variables or AWS Secrets Manager instead.

## Verification

### 1. Check Parameter Store

```bash
# List all affiliate parameters
aws ssm get-parameters-by-path \
  --path "/price-comparison/affiliate" \
  --recursive

# Check specific parameter
aws ssm get-parameter \
  --name "/price-comparison/affiliate/amazon/id"
```

### 2. Test API Response

```bash
# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

# Get a product ID
PRODUCT_ID=$(curl -s "${API_URL}/prod/products" | jq -r '.products[0].id')

# Test prices endpoint
curl -s "${API_URL}/prod/products/${PRODUCT_ID}/prices" | jq '.prices[] | {platform, affiliateUrl}'
```

Expected output:

```json
{
  "platform": "amazon",
  "affiliateUrl": "https://www.amazon.co.jp/dp/B08XYZ123?tag=your-tag"
}
{
  "platform": "rakuten",
  "affiliateUrl": "https://hb.afl.rakuten.co.jp/hgc/..."
}
```

### 3. Test in Frontend

1. Open the application in browser
2. Navigate to a product detail page
3. Check price comparison section
4. Click on "購入する" (Purchase) buttons
5. Verify URLs contain affiliate parameters

### 4. Verify Affiliate Tracking

**Amazon**:

1. Click affiliate link
2. Check URL in browser address bar
3. Should contain `?tag=your-tag`

**Rakuten**:

1. Click affiliate link
2. Should redirect through `hb.afl.rakuten.co.jp`
3. Then redirect to product page

**Yodobashi & Mercari**:

1. Click affiliate link
2. Check URL parameters
3. Should contain affiliate ID

## URL Format Reference

### Amazon

**Standard Format**:

```
https://www.amazon.co.jp/dp/{ASIN}?tag={affiliate-tag}
```

**With Additional Parameters**:

```
https://www.amazon.co.jp/dp/{ASIN}?tag={affiliate-tag}&linkCode=osi&th=1&psc=1
```

**Search Results**:

```
https://www.amazon.co.jp/s?k={search-term}&tag={affiliate-tag}
```

### Rakuten

**Standard Format**:

```
https://hb.afl.rakuten.co.jp/hgc/{affiliate-id}/?pc={encoded-url}
```

**With Tracking**:

```
https://hb.afl.rakuten.co.jp/hgc/{affiliate-id}/?pc={encoded-url}&link_type=text&ut=eyJwYWdlIjoidXJsIn0
```

### Yodobashi

**Standard Format**:

```
{product-url}?affiliate_id={affiliate-id}
```

**With Existing Parameters**:

```
{product-url}?param1=value1&affiliate_id={affiliate-id}
```

### Mercari

**Standard Format**:

```
{product-url}?afid={affiliate-id}
```

**With Existing Parameters**:

```
{product-url}?param1=value1&afid={affiliate-id}
```

## Troubleshooting

### Affiliate Links Not Appearing

**Issue**: `affiliateUrl` is same as `productUrl`

**Solutions**:

1. **Check Parameter Store**:

   ```bash
   aws ssm get-parameter \
     --name "/price-comparison/affiliate/amazon/id"
   ```

2. **Check Lambda Permissions**:

   ```bash
   aws lambda get-policy \
     --function-name GetPricesFunction
   ```

3. **Check CloudWatch Logs**:

   ```bash
   aws logs tail /aws/lambda/GetPricesFunction --follow
   ```

4. **Clear Cache**: Wait 5 minutes for cache to expire

### Invalid Affiliate ID Error

**Issue**: Affiliate program rejects clicks

**Solutions**:

1. **Verify ID Format**: Check platform-specific format requirements
2. **Check Account Status**: Ensure affiliate account is active
3. **Test Manually**: Create affiliate link manually and test
4. **Contact Support**: Reach out to affiliate program support

### Commission Not Tracking

**Issue**: Clicks not showing in affiliate dashboard

**Solutions**:

1. **Check Cookie Settings**: Ensure cookies are enabled
2. **Test Incognito**: Try in private/incognito mode
3. **Wait 24-48 Hours**: Tracking data may be delayed
4. **Verify Link Format**: Ensure URL format is correct
5. **Check Terms**: Ensure compliance with affiliate terms

### Parameter Store Access Denied

**Issue**: Lambda cannot read parameters

**Solution**:

Add IAM permissions to Lambda role:

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameter", "ssm:GetParametersByPath"],
  "Resource": ["arn:aws:ssm:*:*:parameter/price-comparison/affiliate/*"]
}
```

This is automatically configured in the CDK stack.

## Best Practices

### Security

1. **Never Commit Affiliate IDs**: Don't hardcode in source code
2. **Use Parameter Store**: Store securely in AWS
3. **Restrict Access**: Use IAM policies to limit access
4. **Rotate Regularly**: Update IDs if compromised

### Compliance

1. **Disclose Affiliate Relationships**: Add disclosure on website
2. **Follow Platform Rules**: Comply with each platform's terms
3. **Don't Manipulate**: Never artificially inflate clicks
4. **Monitor Performance**: Regularly check affiliate dashboards

### Optimization

1. **Test Links Regularly**: Ensure links are working
2. **Track Conversions**: Monitor which platforms perform best
3. **Update Strategies**: Adjust based on performance data
4. **A/B Testing**: Test different link placements

### Monitoring

1. **Set Up Alerts**: Monitor for broken links
2. **Check Logs**: Review CloudWatch logs for errors
3. **Verify Tracking**: Regularly test affiliate tracking
4. **Review Reports**: Check affiliate dashboards weekly

### Disclosure Example

Add to your website footer:

```html
<div class="affiliate-disclosure">
  <p>
    当サイトは、Amazon.co.jp、楽天市場、ヨドバシ.com、メルカリの
    アフィリエイトプログラムに参加しています。
    商品購入時に、当サイトが紹介料を受け取る場合があります。
  </p>
  <p>
    This site participates in affiliate programs with Amazon, Rakuten, Yodobashi, and Mercari. We
    may earn a commission when you purchase products through our links.
  </p>
</div>
```

## Additional Resources

### Official Documentation

- **Amazon Associates**: https://affiliate.amazon.co.jp/help
- **Rakuten Affiliate**: https://affiliate.rakuten.co.jp/guides/
- **Yodobashi Affiliate**: https://www.yodobashi.com/ec/support/affiliate/
- **AWS Parameter Store**: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html

### Support

For issues with:

- **AWS Configuration**: Check AWS documentation or contact AWS support
- **Affiliate Programs**: Contact respective platform support
- **Application Issues**: Check CloudWatch logs and application documentation

---

**Happy Affiliate Marketing! 💰**
