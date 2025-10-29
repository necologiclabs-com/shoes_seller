# Local Development Guide

Complete guide for setting up and developing the Trail Running Price Comparison application locally.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Testing Locally](#testing-locally)
- [Debugging](#debugging)
- [Common Development Tasks](#common-development-tasks)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js and npm**
   - Version: Node.js 20.x or later
   - Download: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should show v20.x.x or later
     npm --version   # Should show v10.x.x or later
     ```

2. **AWS CLI**
   - Version: 2.x or later
   - Installation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
   - Verify installation:
     ```bash
     aws --version  # Should show aws-cli/2.x.x
     ```

3. **Git**
   - Download: https://git-scm.com/downloads
   - Verify installation:
     ```bash
     git --version
     ```

4. **Code Editor** (Recommended)
   - Visual Studio Code: https://code.visualstudio.com/
   - With extensions:
     - ESLint
     - Prettier
     - TypeScript and JavaScript Language Features

### AWS Account Setup

1. **Create AWS Account** (if you don't have one)
   - Visit: https://aws.amazon.com/
   - Sign up for a free tier account

2. **Create IAM User** (recommended for development)
   - Go to IAM Console
   - Create user with programmatic access
   - Attach policies:
     - `AdministratorAccess` (for development)
     - Or specific permissions for CloudFormation, Lambda, DynamoDB, S3, CloudFront, API Gateway, EventBridge, Systems Manager

3. **Configure AWS Credentials**

   ```bash
   aws configure
   ```

   Enter:
   - AWS Access Key ID: `<your-access-key>`
   - AWS Secret Access Key: `<your-secret-key>`
   - Default region: `us-east-1` (or your preferred region)
   - Default output format: `json`

4. **Verify Configuration**

   ```bash
   aws sts get-caller-identity
   ```

   Should display your account ID and user ARN.

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd trail-running-price-comparison
```

### 2. Install Dependencies

#### Root Dependencies

```bash
npm install
```

This installs:

- AWS CDK
- TypeScript
- ESLint, Prettier
- Build tools

#### Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

This installs:

- React, React Router
- Vite
- TailwindCSS
- React Query
- Axios

#### Lambda Layer Dependencies

```bash
cd lambda/layers/shared/nodejs
npm install
cd ../../../..
```

This installs:

- AWS SDK clients
- UUID generator
- Shared utilities

### 3. Build TypeScript

```bash
npm run build
```

This compiles:

- CDK stack definitions
- Lambda function code
- Shared layer code

### 4. Verify Setup

```bash
# Synthesize CDK stack (should complete without errors)
npm run synth

# Check for any TypeScript errors
npx tsc --noEmit
```

## Development Workflow

### Backend Development

#### 1. Make Changes to Lambda Functions

Example: Modify `lambda/get-products/index.ts`

```typescript
// Add new functionality
export const handler = async (event: APIGatewayProxyEvent) => {
  console.log('New feature added');
  // Your code here
};
```

#### 2. Build TypeScript

```bash
npm run build
```

Or use watch mode for automatic compilation:

```bash
npm run watch
```

#### 3. Test Locally (Optional)

**Option A: Use AWS SAM**

```bash
# Install SAM CLI
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Generate SAM template from CDK
cdk synth --no-staging > template.yaml

# Invoke function locally
sam local invoke GetProductsFunction
```

**Option B: Unit Testing**

Create test files in `lambda/<function-name>/test/`:

```typescript
// lambda/get-products/test/index.test.ts
import { handler } from '../index';

describe('GetProducts', () => {
  it('should return products', async () => {
    const event = {
      /* mock event */
    };
    const result = await handler(event);
    expect(result.statusCode).toBe(200);
  });
});
```

#### 4. Deploy Changes

```bash
npm run deploy
```

#### 5. Test in AWS

```bash
# Get API URL from stack outputs
aws cloudformation describe-stacks \
  --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# Test endpoint
curl https://<api-url>/prod/products
```

### Frontend Development

#### 1. Start Development Server

```bash
cd frontend
npm run dev
```

Access at: http://localhost:5173

Features:

- Hot Module Replacement (HMR)
- Fast refresh
- Instant updates on file changes

#### 2. Configure API Endpoint

Create `.env.development` in `frontend/`:

```env
VITE_API_URL=http://localhost:3000
# Or use deployed API
VITE_API_URL=https://<api-gateway-url>/prod
```

#### 3. Make Changes

Example: Modify `frontend/src/components/ProductCard.tsx`

```tsx
export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition">{/* Your changes */}</div>
  );
};
```

Changes appear instantly in the browser.

#### 4. Build for Production

```bash
npm run build
```

Output in `frontend/dist/`

#### 5. Preview Production Build

```bash
npm run preview
```

Access at: http://localhost:4173

#### 6. Deploy Frontend

```bash
cd ..
npm run deploy:frontend
```

### Shared Layer Development

#### 1. Make Changes

Example: Add new utility in `lambda/layers/shared/nodejs/`

```typescript
// lambda/layers/shared/nodejs/utils.ts
export function formatPrice(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`;
}
```

#### 2. Build Layer

```bash
cd lambda/layers/shared/nodejs
npm run build
cd ../../../..
```

#### 3. Deploy Stack

```bash
npm run deploy
```

The layer is automatically updated and all Lambda functions using it are updated.

### CDK Stack Development

#### 1. Make Changes

Example: Modify `lib/price-comparison-stack.ts`

```typescript
// Add new Lambda function
const newFunction = new lambda.Function(this, 'NewFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/new-function'),
});
```

#### 2. Synthesize Stack

```bash
npm run synth
```

Review generated CloudFormation in `cdk.out/`

#### 3. Diff Changes

```bash
npx cdk diff
```

Shows what will change in your AWS account.

#### 4. Deploy

```bash
npm run deploy
```

## Testing Locally

### Unit Tests

#### Backend Unit Tests

Create test files alongside Lambda functions:

```typescript
// lambda/get-products/index.test.ts
import { handler } from './index';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

jest.mock('@aws-sdk/client-dynamodb');

describe('GetProducts Handler', () => {
  it('should return 200 with products', async () => {
    // Mock DynamoDB response
    const mockScan = jest.fn().mockResolvedValue({
      Items: [
        /* mock items */
      ],
    });

    const result = await handler({} as any);

    expect(result.statusCode).toBe(200);
  });
});
```

Run tests:

```bash
cd lambda/get-products
npm test
cd ../..
```

#### Frontend Unit Tests

Create test files in `frontend/src/`:

```typescript
// frontend/src/components/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('renders product name', () => {
    const product = {
      id: '1',
      name: 'Test Product',
      // ...
    };

    render(<ProductCard product={product} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
```

Run tests:

```bash
cd frontend
npm test
cd ..
```

### Integration Tests

#### Test with Local DynamoDB

1. **Install DynamoDB Local**:

   ```bash
   # Using Docker
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

2. **Configure endpoint**:

   ```typescript
   const client = new DynamoDBClient({
     endpoint: 'http://localhost:8000',
     region: 'local',
   });
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

### End-to-End Tests

#### Using Verification Script

```bash
# Verify full workflow
npm run verify:e2e
```

This tests:

- Product retrieval
- Price fetching
- API responses
- Data consistency

#### Manual E2E Testing

1. **Seed products**:

   ```bash
   npm run seed:products
   ```

2. **Trigger price update**:

   ```bash
   aws lambda invoke \
     --function-name <UpdatePricesFunctionName> \
     response.json
   ```

3. **Test API**:

   ```bash
   # List products
   curl https://<api-url>/prod/products

   # Get product detail
   curl https://<api-url>/prod/products/<product-id>

   # Get prices
   curl https://<api-url>/prod/products/<product-id>/prices
   ```

4. **Test frontend**:
   - Open CloudFront URL
   - Navigate through pages
   - Verify price display
   - Test affiliate links

## Debugging

### Backend Debugging

#### CloudWatch Logs

```bash
# Tail logs in real-time
aws logs tail /aws/lambda/<function-name> --follow

# Filter logs
aws logs tail /aws/lambda/<function-name> --filter-pattern "ERROR"

# View specific time range
aws logs tail /aws/lambda/<function-name> \
  --since 1h \
  --follow
```

#### Local Debugging with VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Lambda",
      "program": "${workspaceFolder}/lambda/get-products/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

Set breakpoints and press F5 to debug.

#### Add Debug Logging

```typescript
// lambda/get-products/index.ts
import { logger } from '/opt/nodejs/logger';

export const handler = async (event: any) => {
  logger.debug('Event received', { event });

  try {
    const result = await getProducts();
    logger.debug('Products retrieved', { count: result.length });
    return result;
  } catch (error) {
    logger.error('Error getting products', { error });
    throw error;
  }
};
```

### Frontend Debugging

#### Browser DevTools

1. Open browser DevTools (F12)
2. Check Console for errors
3. Use Network tab to inspect API calls
4. Use React DevTools extension

#### VS Code Debugging

Install "Debugger for Chrome" extension.

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

#### React Query DevTools

Already included in development mode. Access at bottom-left of the page.

### DynamoDB Debugging

#### View Table Data

```bash
# Scan table
aws dynamodb scan --table-name PriceComparisonTable

# Get specific item
aws dynamodb get-item \
  --table-name PriceComparisonTable \
  --key '{"PK":{"S":"PRODUCT#123"},"SK":{"S":"METADATA"}}'

# Query by partition key
aws dynamodb query \
  --table-name PriceComparisonTable \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"PRODUCT#123"}}'
```

#### Use NoSQL Workbench

Download: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/workbench.html

Features:

- Visual data modeling
- Query builder
- Data import/export

## Common Development Tasks

### Add New Lambda Function

1. **Create function directory**:

   ```bash
   mkdir lambda/new-function
   cd lambda/new-function
   ```

2. **Create handler**:

   ```typescript
   // index.ts
   export const handler = async (event: any) => {
     return {
       statusCode: 200,
       body: JSON.stringify({ message: 'Hello' }),
     };
   };
   ```

3. **Add to CDK stack**:

   ```typescript
   // lib/price-comparison-stack.ts
   const newFunction = new lambda.Function(this, 'NewFunction', {
     runtime: lambda.Runtime.NODEJS_20_X,
     handler: 'index.handler',
     code: lambda.Code.fromAsset('lambda/new-function'),
     layers: [sharedLayer],
   });
   ```

4. **Deploy**:
   ```bash
   npm run build
   npm run deploy
   ```

### Add New API Endpoint

1. **Create Lambda function** (see above)

2. **Add API Gateway integration**:

   ```typescript
   // lib/price-comparison-stack.ts
   const newResource = api.root.addResource('new-endpoint');
   newResource.addMethod('GET', new apigateway.LambdaIntegration(newFunction));
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

### Add New Frontend Component

1. **Create component file**:

   ```typescript
   // frontend/src/components/NewComponent.tsx
   import React from 'react';

   interface NewComponentProps {
     // props
   }

   export const NewComponent: React.FC<NewComponentProps> = (props) => {
     return <div>New Component</div>;
   };
   ```

2. **Use in page**:

   ```typescript
   // frontend/src/pages/HomePage.tsx
   import { NewComponent } from '../components/NewComponent';

   export const HomePage = () => {
     return (
       <div>
         <NewComponent />
       </div>
     );
   };
   ```

3. **Test locally**:
   ```bash
   cd frontend
   npm run dev
   ```

### Update Price Services

1. **Modify service**:

   ```typescript
   // lambda/layers/shared/nodejs/price-services/amazon-service.ts
   export async function fetchAmazonPrice(productName: string) {
     // Updated logic
   }
   ```

2. **Build layer**:

   ```bash
   cd lambda/layers/shared/nodejs
   npm run build
   cd ../../../..
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

### Add Environment Variables

1. **Add to CDK stack**:

   ```typescript
   const myFunction = new lambda.Function(this, 'MyFunction', {
     // ...
     environment: {
       MY_VAR: 'value',
       TABLE_NAME: table.tableName,
     },
   });
   ```

2. **Use in Lambda**:

   ```typescript
   const myVar = process.env.MY_VAR;
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

## Best Practices

### Code Organization

- Keep Lambda functions small and focused
- Use shared layer for common code
- Separate business logic from handlers
- Use TypeScript interfaces for type safety

### Error Handling

```typescript
// Good
try {
  const result = await operation();
  return success(result);
} catch (error) {
  logger.error('Operation failed', { error });
  return errorResponse(error);
}

// Bad
const result = await operation(); // No error handling
```

### Logging

```typescript
// Good - Structured logging
logger.info('Processing request', {
  productId,
  platform,
  timestamp: new Date().toISOString(),
});

// Bad - Unstructured logging
console.log('Processing ' + productId);
```

### Performance

- Use DynamoDB batch operations when possible
- Implement caching for frequently accessed data
- Minimize Lambda cold starts with provisioned concurrency
- Optimize bundle sizes

### Security

- Never commit AWS credentials
- Use environment variables for configuration
- Implement least privilege IAM policies
- Validate all inputs
- Sanitize user data

### Testing

- Write unit tests for business logic
- Test error scenarios
- Mock external dependencies
- Use integration tests for critical paths

## Troubleshooting

### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist
npm run build

# Check for errors
npx tsc --noEmit
```

### CDK Deployment Fails

```bash
# Check diff
npx cdk diff

# Force re-bootstrap
npx cdk bootstrap --force

# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name PriceComparisonStack
```

### Lambda Function Errors

```bash
# Check logs
aws logs tail /aws/lambda/<function-name> --follow

# Test function directly
aws lambda invoke \
  --function-name <function-name> \
  --payload '{}' \
  response.json

cat response.json
```

### Frontend Build Errors

```bash
# Clean install
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### DynamoDB Access Issues

```bash
# Check IAM permissions
aws iam get-user

# Test table access
aws dynamodb describe-table --table-name PriceComparisonTable

# Check table exists
aws dynamodb list-tables
```

### API Gateway CORS Issues

1. Check CORS configuration in CDK stack
2. Verify OPTIONS method is configured
3. Check browser console for CORS errors
4. Test with curl to isolate issue

### Environment Variable Issues

```bash
# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name <function-name> \
  --query 'Environment'
```

---

**Happy Coding! 🚀**
