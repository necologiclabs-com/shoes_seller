# UpdatePrices Lambda Function

## Overview

The UpdatePrices Lambda function is responsible for periodically fetching price data from all supported e-commerce platforms (Amazon, Rakuten, Yodobashi, Mercari) for all registered products and updating the DynamoDB table with the latest information.

## Trigger

This function is automatically triggered by an EventBridge Scheduler rule every 6 hours.

## Functionality

1. **Fetch All Products**: Retrieves all products from DynamoDB using pagination
2. **Parallel Price Fetching**: For each product, fetches prices from all 4 platforms in parallel
3. **Update DynamoDB**: Saves the fetched price data to DynamoDB
4. **Error Handling**: Logs errors for failed platform updates but continues processing other platforms
5. **Summary Report**: Returns a summary of successful and failed updates

## Configuration

### Environment Variables

- `TABLE_NAME`: DynamoDB table name (automatically set by CDK)
- `NODE_OPTIONS`: Node.js options for source maps

### Timeout and Memory

- **Timeout**: 15 minutes (to handle batch processing of all products)
- **Memory**: 512 MB (for parallel processing)

## Manual Invocation

You can manually trigger the function for testing:

```bash
aws lambda invoke \
  --function-name <UpdatePricesFunctionName> \
  --payload '{}' \
  response.json
```

## Response Format

```json
{
  "totalProducts": 10,
  "successfulProducts": 9,
  "failedProducts": 1,
  "results": [
    {
      "productId": "product-123",
      "productName": "Salomon Speedcross 5",
      "success": true,
      "platformResults": {
        "amazon": { "success": true },
        "rakuten": { "success": true },
        "yodobashi": { "success": true },
        "mercari": { "success": false, "error": "Product not found" }
      }
    }
  ]
}
```

## Monitoring

- **CloudWatch Logs**: All execution logs are sent to CloudWatch Logs
- **Metrics**: Lambda invocation metrics, duration, and errors are available in CloudWatch
- **Alarms**: Configure alarms for error rates and execution failures

## Dependencies

This function uses the shared Lambda layer which includes:

- DynamoDB client utilities
- Repository classes
- Price service integrations
- Type definitions

## Error Handling

- **Platform Failures**: If a specific platform fails, the error is logged and recorded, but other platforms continue processing
- **Product Failures**: If all platforms fail for a product, it's marked as failed but processing continues for other products
- **Fatal Errors**: Only critical errors (like DynamoDB access issues) will cause the entire function to fail

## Best Practices

1. **Monitor Execution Time**: Ensure the function completes within the 15-minute timeout
2. **Check Error Rates**: Monitor platform-specific error rates to identify issues with scrapers or APIs
3. **Review Logs**: Regularly review CloudWatch logs for patterns in failures
4. **Test After Changes**: Manually invoke the function after making changes to price services
