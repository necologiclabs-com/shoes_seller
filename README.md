# Trail Running Shoes Price Comparison

トレイルランニングシューズの価格比較アフィリエイトサイト

A modern web application that compares prices for trail running shoes across multiple e-commerce platforms (Amazon, Rakuten, Yodobashi, Mercari) with affiliate link integration.

[![CI/CD Pipeline](https://github.com/necologiclabs-com/shoes_seller/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/necologiclabs-com/shoes_seller/actions/workflows/ci-cd.yml)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

> **📚 Complete Documentation**: See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) for a comprehensive index of all documentation.

## 🎯 Overview

This application provides a comprehensive price comparison service for trail running shoes, initially focusing on Salomon products. Users can:

- Browse a catalog of trail running shoes
- Compare prices across 4 major e-commerce platforms
- View real-time availability and pricing information
- Access affiliate links to purchase products
- See savings opportunities with highlighted best prices

The system uses a serverless architecture on AWS with automated price updates every 6 hours and continuous deployment via GitHub Actions.

## ✨ Features

### Current Features (v1.0)

- **Product Catalog**: Browse Salomon trail running shoes with images and details
- **Multi-Platform Price Comparison**: Compare prices from Amazon, Rakuten, Yodobashi, and Mercari
- **Affiliate Link Integration**: Generate platform-specific affiliate URLs
- **Automated Price Updates**: Scheduled price fetching every 6 hours via EventBridge
- **Responsive Design**: Mobile-first UI with TailwindCSS
- **Real-time Availability**: Display stock status for each platform
- **Best Price Highlighting**: Visual indicators for lowest prices
- **Savings Calculator**: Show potential savings compared to highest price

### Planned Features (Future Releases)

- **Search Functionality**: Search by product name, model number, or Amazon URL
- **AI-Powered Recommendations**: Personalized product suggestions using generative AI
- **Similar Product Discovery**: Find comparable shoes based on features
- **Price History Tracking**: View price trends over time
- **Price Drop Alerts**: Email notifications for price changes
- **Multi-Brand Support**: Expand beyond Salomon to other brands

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  React SPA + TypeScript + Vite + TailwindCSS + React Query  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront CDN                            │
│              (S3 Static Website Hosting)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (REST)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ GetProducts  │ │GetProductDetail│ │ GetPrices   │ │UpdatePrices  │
│   Lambda     │ │    Lambda     │ │   Lambda    │ │   Lambda     │
└──────┬───────┘ └──────┬────────┘ └──────┬──────┘ └──────┬───────┘
       │                │                 │                │
       └────────────────┴─────────────────┴────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   DynamoDB Table      │
                    │ (Single-table design) │
                    └───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │ Systems Manager      │  │  External Services   │
        │  Parameter Store     │  │  - Amazon PA-API     │
        │ (Affiliate Configs)  │  │  - Rakuten API       │
        └──────────────────────┘  │  - Yodobashi Scraper │
                                  │  - Mercari API       │
                                  └──────────────────────┘
```

### Architecture Layers

1. **Presentation Layer**: React SPA with responsive design
2. **CDN Layer**: CloudFront for global content delivery
3. **API Layer**: API Gateway with REST endpoints
4. **Business Logic Layer**: Lambda functions for each domain
5. **Data Layer**: DynamoDB with single-table design pattern
6. **Integration Layer**: Price scraping and API integration services
7. **Scheduling Layer**: EventBridge for automated price updates

## 🛠️ Technology Stack

### Frontend

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **HTTP Client**: Axios

### Backend

- **Runtime**: Node.js 20.x
- **Language**: TypeScript
- **API**: AWS API Gateway (REST)
- **Compute**: AWS Lambda
- **Database**: Amazon DynamoDB
- **Scheduling**: Amazon EventBridge
- **Configuration**: AWS Systems Manager Parameter Store
- **Secrets**: AWS Secrets Manager

### Infrastructure

- **IaC**: AWS CDK (TypeScript)
- **Hosting**: Amazon S3 + CloudFront
- **Monitoring**: Amazon CloudWatch
- **Logging**: CloudWatch Logs

### Development Tools

- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript Compiler

## 📁 Project Structure

```
trail-running-price-comparison/
├── bin/
│   └── price-comparison.ts          # CDK app entry point
├── lib/
│   └── price-comparison-stack.ts    # CDK stack definition
├── lambda/
│   ├── get-products/                # Product list Lambda
│   │   ├── index.ts
│   │   └── package.json
│   ├── get-product-detail/          # Product detail Lambda
│   │   ├── index.ts
│   │   └── package.json
│   ├── get-prices/                  # Price retrieval Lambda
│   │   ├── index.ts
│   │   └── package.json
│   ├── update-prices/               # Price update Lambda
│   │   ├── index.ts
│   │   └── package.json
│   └── layers/
│       └── shared/
│           └── nodejs/              # Shared Lambda Layer
│               ├── types.ts         # TypeScript interfaces
│               ├── dynamodb-client.ts
│               ├── entity-mapper.ts
│               ├── repositories.ts
│               ├── affiliate-utils.ts
│               ├── affiliate-config.ts
│               ├── logger.ts
│               ├── price-services/
│               │   ├── amazon-service.ts
│               │   ├── rakuten-service.ts
│               │   ├── yodobashi-service.ts
│               │   └── mercari-service.ts
│               └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── PriceComparison.tsx
│   │   │   └── PlatformCard.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── ProductDetailPage.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── scripts/
│   ├── seed-products.ts             # Product seeding script
│   ├── seed-products.sh             # Bash wrapper
│   ├── seed-products.ps1            # PowerShell wrapper
│   ├── verify-seed.ts               # Seed verification
│   ├── verify-e2e.ts                # E2E verification
│   ├── verify-e2e.sh                # Bash wrapper
│   ├── verify-e2e.ps1               # PowerShell wrapper
│   ├── deploy-frontend.sh           # Frontend deployment (Bash)
│   ├── deploy-frontend.ps1          # Frontend deployment (PowerShell)
│   ├── configure-frontend.ps1       # Frontend config script
│   ├── README.md                    # Scripts documentation
│   ├── SEED_INSTRUCTIONS.md         # Seeding guide
│   └── SEED_README.md               # Seed script details
├── cdk.out/                         # CDK synthesis output (generated)
├── dist/                            # TypeScript build output (generated)
├── node_modules/                    # Dependencies (generated)
├── .kiro/
│   └── specs/
│       └── trail-running-price-comparison/
│           ├── requirements.md      # Feature requirements
│           ├── design.md            # Design document
│           └── tasks.md             # Implementation tasks
├── package.json                     # Root dependencies
├── tsconfig.json                    # TypeScript config
├── cdk.json                         # CDK config
├── .eslintrc.json                   # ESLint config
├── .prettierrc.json                 # Prettier config
├── .gitignore
├── README.md                        # This file
├── DEPLOYMENT.md                    # Deployment guide
├── SETUP.md                         # Setup guide
└── LICENSE
```

## 🚀 Getting Started

> **Quick Start**: For a rapid setup, see [QUICK_START.md](./QUICK_START.md) for a 5-minute deployment guide.

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20.x or later ([Download](https://nodejs.org/))
- **npm**: v10.x or later (comes with Node.js)
- **AWS CLI**: v2.x or later ([Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- **AWS Account**: With appropriate permissions
- **AWS CDK**: v2.114.0 or later (optional, included in dependencies)

### AWS Credentials Configuration

Configure your AWS credentials:

```bash
aws configure
```

You'll need:

- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`, `ap-northeast-1`)
- Default output format (e.g., `json`)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd trail-running-price-comparison
   ```

2. **Install root dependencies**:

   ```bash
   npm install
   ```

3. **Install frontend dependencies**:

   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Install Lambda Layer dependencies**:

   ```bash
   cd lambda/layers/shared/nodejs
   npm install
   cd ../../../..
   ```

5. **Build TypeScript**:

   ```bash
   npm run build
   ```

6. **Verify CDK synthesis**:
   ```bash
   npm run synth
   ```

### Quick Start

1. **Bootstrap CDK** (first time only):

   ```bash
   npx cdk bootstrap
   ```

2. **Deploy infrastructure**:

   ```bash
   npm run deploy
   ```

3. **Seed initial product data**:

   ```bash
   npm run seed:products
   ```

4. **Verify seeded data**:

   ```bash
   npm run verify:seed
   ```

5. **Configure frontend**:

   ```bash
   npm run configure:frontend
   ```

6. **Deploy frontend**:

   ```bash
   npm run deploy:frontend
   ```

7. **Access the application**:
   - The CloudFront URL will be displayed in the deployment output
   - Open the URL in your browser

For detailed setup instructions, see:

- [SETUP.md](./SETUP.md) - Initial setup guide
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - Local development guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [AFFILIATE_CONFIGURATION.md](./AFFILIATE_CONFIGURATION.md) - Affiliate setup guide

## � CI/CD with GitHub Actions

This project uses GitHub Actions for continuous integration and deployment.

### Automated Workflows

**CI Pipeline** (on all pushes and PRs):
- ✅ Lint checking
- ✅ TypeScript build
- ✅ Test execution
- ✅ Frontend build

**CD Pipeline** (on main branch only):
- 🚀 Infrastructure deployment (CDK)
- 🚀 Frontend deployment to S3
- 🚀 CloudFront cache invalidation

### Setup GitHub Actions

1. **Configure AWS credentials as GitHub Secrets**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_ACCOUNT_ID`
   - `VITE_API_BASE_URL`

2. **Run CDK Bootstrap** (first time only):
   ```bash
   npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-northeast-1
   ```

3. **Push to main branch**:
   ```bash
   git push origin main
   ```

For detailed instructions, see:
- [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) - Complete CI/CD setup guide
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - GitHub Secrets configuration

### Workflow Status

Check the status of your workflows:
- Go to the **Actions** tab in your GitHub repository
- View logs, re-run failed jobs, or cancel workflows

## �📦 Deployment

### Quick Deployment

Deploy everything at once:

```bash
npm run deploy:all
```

This command:

1. Deploys the CDK stack (backend infrastructure)
2. Builds the frontend
3. Uploads to S3
4. Invalidates CloudFront cache

### Individual Deployment

**Backend only**:

```bash
npm run deploy
```

**Frontend only**:

```bash
npm run deploy:frontend
```

**Build frontend without deploying**:

```bash
npm run build:frontend
```

### Deployment Outputs

After deployment, you'll receive:

- **ApiUrl**: Backend API endpoint
- **FrontendUrl**: CloudFront distribution URL
- **FrontendBucketName**: S3 bucket name
- **CloudFrontDistributionId**: Distribution ID
- **TableName**: DynamoDB table name

For comprehensive deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## ⚙️ Configuration

### Affiliate ID Configuration

To enable affiliate links, configure affiliate IDs in AWS Systems Manager Parameter Store:

```bash
# Amazon Affiliate ID
aws ssm put-parameter \
  --name "/price-comparison/affiliate/amazon/id" \
  --value "your-amazon-associate-tag" \
  --type "String"

# Rakuten Affiliate ID
aws ssm put-parameter \
  --name "/price-comparison/affiliate/rakuten/id" \
  --value "your-rakuten-affiliate-id" \
  --type "String"

# Yodobashi Affiliate ID
aws ssm put-parameter \
  --name "/price-comparison/affiliate/yodobashi/id" \
  --value "your-yodobashi-affiliate-id" \
  --type "String"

# Mercari Affiliate ID
aws ssm put-parameter \
  --name "/price-comparison/affiliate/mercari/id" \
  --value "your-mercari-affiliate-id" \
  --type "String"
```

For detailed affiliate setup instructions, see:

- [AFFILIATE_CONFIGURATION.md](./AFFILIATE_CONFIGURATION.md) - Complete affiliate configuration guide
- [lambda/layers/shared/nodejs/AFFILIATE_SETUP.md](./lambda/layers/shared/nodejs/AFFILIATE_SETUP.md) - Technical implementation details

### API Keys Configuration (Optional)

If using official APIs (Amazon PA-API, Rakuten API), store credentials in AWS Secrets Manager:

```bash
# Amazon PA-API credentials
aws secretsmanager create-secret \
  --name price-comparison/amazon-api \
  --secret-string '{"accessKey":"YOUR_ACCESS_KEY","secretKey":"YOUR_SECRET_KEY","partnerTag":"YOUR_PARTNER_TAG"}'

# Rakuten API key
aws secretsmanager create-secret \
  --name price-comparison/rakuten-api \
  --secret-string '{"applicationId":"YOUR_APP_ID"}'
```

### Frontend Environment Variables

Create `.env.production` in the `frontend/` directory:

```env
VITE_API_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

The API URL is provided in the CDK deployment outputs.

### Price Update Schedule

The default price update schedule is every 6 hours. To modify:

1. Edit `lib/price-comparison-stack.ts`
2. Find the EventBridge rule definition
3. Change the `schedule` property
4. Redeploy: `npm run deploy`

Example schedules:

- Every 6 hours: `Schedule.rate(Duration.hours(6))`
- Every 12 hours: `Schedule.rate(Duration.hours(12))`
- Daily at 3 AM: `Schedule.cron({ hour: '3', minute: '0' })`

## 💻 Development

### Available Scripts

| Script                       | Description                            |
| ---------------------------- | -------------------------------------- |
| `npm run build`              | Compile TypeScript to JavaScript       |
| `npm run watch`              | Watch mode for TypeScript compilation  |
| `npm run synth`              | Synthesize CDK stack to CloudFormation |
| `npm run deploy`             | Deploy backend infrastructure          |
| `npm run deploy:frontend`    | Deploy frontend to S3/CloudFront       |
| `npm run deploy:all`         | Deploy backend and frontend            |
| `npm run build:frontend`     | Build frontend for production          |
| `npm run configure:frontend` | Configure frontend environment         |
| `npm run lint`               | Run ESLint                             |
| `npm run format`             | Format code with Prettier              |
| `npm run seed:products`      | Seed initial product data              |
| `npm run verify:seed`        | Verify seeded products                 |
| `npm run verify:e2e`         | Run end-to-end verification            |

### Local Development

#### Backend Development

1. **Make changes** to Lambda functions or CDK stack
2. **Build TypeScript**:
   ```bash
   npm run build
   ```
3. **Test locally** (optional):
   ```bash
   # Use AWS SAM or Lambda local testing tools
   ```
4. **Deploy changes**:
   ```bash
   npm run deploy
   ```

#### Frontend Development

1. **Navigate to frontend directory**:

   ```bash
   cd frontend
   ```

2. **Start development server**:

   ```bash
   npm run dev
   ```

3. **Access at**: `http://localhost:5173`

4. **Make changes** - hot reload is enabled

5. **Build for production**:

   ```bash
   npm run build
   ```

6. **Deploy**:
   ```bash
   cd ..
   npm run deploy:frontend
   ```

### Code Quality

**Linting**:

```bash
npm run lint
```

**Formatting**:

```bash
npm run format
```

**Type Checking**:

```bash
npm run build
```

### Testing

#### Seed Verification

```bash
npm run verify:seed
```

#### End-to-End Verification

```bash
npm run verify:e2e
```

For detailed testing instructions, see:

- [scripts/SEED_INSTRUCTIONS.md](./scripts/SEED_INSTRUCTIONS.md)
- [.kiro/specs/trail-running-price-comparison/E2E_TESTING_README.md](./.kiro/specs/trail-running-price-comparison/E2E_TESTING_README.md)

## 📚 API Documentation

### Base URL

```
https://<api-gateway-id>.execute-api.<region>.amazonaws.com/prod
```

### Endpoints

#### GET /products

Retrieve a list of all products.

**Response**:

```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Salomon Speedcross 6",
      "modelNumber": "L47452800",
      "brand": "Salomon",
      "imageUrl": "https://...",
      "officialUrl": "https://...",
      "category": "trail-running",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET /products/{productId}

Retrieve details for a specific product.

**Parameters**:

- `productId` (path): Product UUID

**Response**:

```json
{
  "product": {
    "id": "uuid",
    "name": "Salomon Speedcross 6",
    "modelNumber": "L47452800",
    "brand": "Salomon",
    "imageUrl": "https://...",
    "officialUrl": "https://...",
    "category": "trail-running",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /products/{productId}/prices

Retrieve price comparison data for a product.

**Parameters**:

- `productId` (path): Product UUID

**Response**:

```json
{
  "productId": "uuid",
  "prices": [
    {
      "platform": "amazon",
      "price": 15000,
      "availability": "in_stock",
      "productUrl": "https://www.amazon.co.jp/...",
      "affiliateUrl": "https://www.amazon.co.jp/...?tag=your-tag",
      "lastUpdated": "2025-10-26T10:00:00Z"
    },
    {
      "platform": "rakuten",
      "price": 14500,
      "availability": "in_stock",
      "productUrl": "https://item.rakuten.co.jp/...",
      "affiliateUrl": "https://hb.afl.rakuten.co.jp/...",
      "lastUpdated": "2025-10-26T10:00:00Z"
    }
  ],
  "lastUpdated": "2025-10-26T10:00:00Z"
}
```

**Availability Values**:

- `in_stock`: Product is available
- `out_of_stock`: Product is temporarily unavailable
- `not_found`: Product not found on platform

### Error Responses

**404 Not Found**:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found"
  }
}
```

**500 Internal Server Error**:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An error occurred while processing your request"
  }
}
```

## 📊 Monitoring

### CloudWatch Metrics

Monitor the following metrics in CloudWatch:

**Lambda Functions**:

- Invocation count
- Error count and rate
- Duration (p50, p95, p99)
- Throttles
- Concurrent executions

**API Gateway**:

- Request count
- 4xx and 5xx error rates
- Latency (p50, p95, p99)
- Integration latency

**DynamoDB**:

- Read/write capacity units consumed
- Throttled requests
- System errors

### CloudWatch Logs

**Lambda Logs**:

```bash
# View logs for a specific function
aws logs tail /aws/lambda/<function-name> --follow

# Example
aws logs tail /aws/lambda/GetProductsFunction --follow
```

**Structured Logging**:
All Lambda functions use structured JSON logging for easy parsing and analysis.

### CloudWatch Alarms

Configured alarms:

- Lambda error rate > 5%
- API Gateway 5xx error rate > 1%
- UpdatePrices function failures

### Monitoring Dashboard

Access the CloudWatch dashboard:

1. Open AWS Console
2. Navigate to CloudWatch
3. Select "Dashboards"
4. Open "PriceComparisonDashboard"

For detailed monitoring setup, see [.kiro/specs/trail-running-price-comparison/MONITORING_QUICK_REFERENCE.md](./.kiro/specs/trail-running-price-comparison/MONITORING_QUICK_REFERENCE.md).

## 🔧 Troubleshooting

### Common Issues

#### Deployment Fails

**Issue**: CDK deployment fails with permission errors

**Solution**:

```bash
# Ensure AWS credentials are configured
aws sts get-caller-identity

# Bootstrap CDK if not done
npx cdk bootstrap

# Check IAM permissions
```

#### Frontend Shows "Network Error"

**Issue**: Frontend cannot connect to API

**Solution**:

1. Verify API URL in `.env.production`
2. Check CORS configuration in CDK stack
3. Verify API Gateway deployment
4. Check browser console for errors

#### Prices Not Updating

**Issue**: Price data is stale

**Solution**:

```bash
# Manually trigger UpdatePrices function
aws lambda invoke \
  --function-name <UpdatePricesFunctionName> \
  --region <your-region> \
  response.json

# Check function logs
aws logs tail /aws/lambda/<UpdatePricesFunctionName> --follow
```

#### Products Not Appearing

**Issue**: Product list is empty

**Solution**:

```bash
# Verify products are seeded
npm run verify:seed

# Re-seed if necessary
npm run seed:products
```

#### CloudFront Shows Old Content

**Issue**: Frontend updates not visible

**Solution**:

```bash
# Create cache invalidation
aws cloudfront create-invalidation \
  --distribution-id <your-distribution-id> \
  --paths "/*"
```

### Debug Mode

Enable debug logging:

1. **Lambda Functions**: Set `LOG_LEVEL` environment variable to `DEBUG`
2. **Frontend**: Check browser console for detailed logs

### Getting Help

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment issues
2. Review [scripts/SEED_INSTRUCTIONS.md](./scripts/SEED_INSTRUCTIONS.md) for seeding issues
3. Check CloudWatch Logs for error details
4. Review AWS service quotas and limits

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Run linting and formatting**:
   ```bash
   npm run lint
   npm run format
   ```
5. **Test your changes**
6. **Commit with clear messages**: `git commit -m "Add feature: description"`
7. **Push to your fork**: `git push origin feature/your-feature`
8. **Create a Pull Request**

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write clear, self-documenting code
- Add comments for complex logic
- Follow existing patterns and conventions

### Commit Messages

Use conventional commit format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Salomon**: For trail running shoe product information
- **AWS**: For serverless infrastructure
- **React Community**: For excellent frontend tools
- **Open Source Contributors**: For the libraries used in this project

## 📞 Support

For issues, questions, or suggestions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing documentation
3. Check CloudWatch logs for errors
4. Create an issue in the repository

## 🗺️ Roadmap

### Phase 1 (Current)

- ✅ Product catalog management
- ✅ Multi-platform price comparison
- ✅ Affiliate link integration
- ✅ Automated price updates
- ✅ Responsive web interface

### Phase 2 (Planned)

- 🔲 Search functionality
- 🔲 Price history tracking
- 🔲 Price drop alerts
- 🔲 User accounts and favorites
- 🔲 Admin dashboard

### Phase 3 (Future)

- 🔲 AI-powered recommendations
- 🔲 Similar product discovery
- 🔲 Multi-brand support
- 🔲 International markets
- 🔲 Mobile app

---

**Built with ❤️ for trail runners**

# CI/CD Pipeline Test - GitHub Actions

# Route53 record removed, ready for CDK management
