# E2E Testing Quick Reference Card

## 🚀 Quick Start

### 1. Run Automated Tests

```bash
# Install dependencies (first time only)
npm install

# Run E2E verification
npm run verify:e2e
```

### 2. Get Frontend URL

```powershell
aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text
```

### 3. Open in Browser

Visit the CloudFront URL and test manually.

---

## 📋 Manual Test Checklist

### Homepage

- [ ] Page loads in < 3 seconds
- [ ] Product list displays
- [ ] Images load correctly
- [ ] Responsive on mobile/tablet/desktop

### Product Detail

- [ ] Click product card → navigates to detail page
- [ ] Product info displays correctly
- [ ] Price comparison shows 4 platforms
- [ ] Lowest price is highlighted
- [ ] Savings amount is calculated

### Affiliate Links

- [ ] Click "購入する" → opens in new tab
- [ ] URL contains affiliate parameters
- [ ] Navigates to correct product page

### Error Handling

- [ ] Network offline → shows error message
- [ ] Non-existent product → shows 404
- [ ] Missing platform → shows "取扱なし"

---

## 🔧 Common Commands

### Test Price Update

```powershell
# Trigger UpdatePricesFunction
aws lambda invoke --function-name PriceComparisonStack-UpdatePricesFunction --payload '{}' response.json

# Check response
Get-Content response.json | ConvertFrom-Json
```

### Check DynamoDB Data

```powershell
# Check products
aws dynamodb scan --table-name PriceComparisonTable --filter-expression "begins_with(PK, :pk)" --expression-attribute-values '{":pk":{"S":"PRODUCT#"}}' --max-items 5

# Check prices
aws dynamodb scan --table-name PriceComparisonTable --filter-expression "begins_with(SK, :sk)" --expression-attribute-values '{":sk":{"S":"PRICE#"}}' --max-items 10
```

### View CloudWatch Logs

```powershell
# Tail logs
aws logs tail /aws/lambda/PriceComparisonStack-UpdatePricesFunction --follow
```

---

## 🐛 Troubleshooting

### Frontend not loading?

```powershell
# Check CloudFront URL
aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text

# Redeploy frontend
npm run deploy:frontend
```

### No price data?

```powershell
# Run price update
aws lambda invoke --function-name PriceComparisonStack-UpdatePricesFunction --payload '{}' response.json

# Check logs
aws logs tail /aws/lambda/PriceComparisonStack-UpdatePricesFunction --follow
```

### API errors?

```powershell
# Check API endpoint
aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text

# Test API directly
curl <API_ENDPOINT>/products
```

---

## 📚 Documentation

- **Detailed Guide**: `.kiro/specs/trail-running-price-comparison/task-16-e2e-testing-guide.md`
- **Quick Start**: `.kiro/specs/trail-running-price-comparison/E2E_TESTING_README.md`
- **Summary**: `.kiro/specs/trail-running-price-comparison/task-16-summary.md`

---

## ✅ Success Criteria

All tests pass when:

- ✅ Automated verification script passes 100%
- ✅ All manual test scenarios complete
- ✅ All error scenarios verified
- ✅ No console errors in browser
- ✅ Affiliate links work correctly
- ✅ Responsive design works on all devices

---

## 🎯 Next Steps

After Task 16 completion:

1. Task 17: Monitoring and Logging
2. Task 18: Documentation
3. Production deployment
