# Price Service Integrations

This directory contains price fetching services for different e-commerce platforms. Each service implements standardized error handling, retry logic with exponential backoff, and returns consistent result formats.

## Services

### 1. Amazon Price Service (`amazon-service.ts`)

**Integration Method:** Amazon Product Advertising API (PA-API) 5.0

**Configuration Required:**

```typescript
{
  accessKey: string; // AWS Access Key
  secretKey: string; // AWS Secret Key
  partnerTag: string; // Amazon Associate Tag
  region: string; // API Region (e.g., 'us-east-1')
}
```

**Features:**

- Product search by name and model number
- ASIN resolution
- Price and availability extraction
- Retry logic with exponential backoff (max 3 retries)

**Note:** Currently returns placeholder data. Full PA-API integration requires:

- AWS Signature Version 4 request signing
- PA-API SDK or custom implementation
- Valid Amazon Associate account

### 2. Rakuten Price Service (`rakuten-service.ts`)

**Integration Method:** Rakuten Ichiba Item Search API

**Configuration Required:**

```typescript
{
  applicationId: string;  // Rakuten Application ID (required)
  affiliateId?: string;   // Rakuten Affiliate ID (optional)
}
```

**Features:**

- Product search using official API
- Intelligent product matching
- Price and availability extraction
- Automatic retry on failures

**API Endpoint:** `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706`

### 3. Yodobashi Price Service (`yodobashi-service.ts`)

**Integration Method:** Web Scraping (HTTP requests)

**Configuration Required:** None

**Features:**

- HTTP-based web scraping
- Product search and price extraction
- Timeout handling (30 seconds)
- Retry logic with exponential backoff

**Note:**

- Current implementation uses simple regex parsing
- For production, consider using:
  - Proper HTML parser (cheerio, jsdom)
  - Puppeteer/Playwright for JavaScript-rendered content
  - Lambda with custom runtime or container image

### 4. Mercari Price Service (`mercari-service.ts`)

**Integration Method:** Unofficial API + Web Scraping fallback

**Configuration Required:** None

**Features:**

- Primary: Unofficial API access
- Fallback: Web scraping
- Product matching algorithm
- Dual-strategy approach for reliability

**API Endpoint:** `https://api.mercari.jp/v2/entities:search`

## Usage

### Basic Usage

```typescript
import { AmazonPriceService, RakutenPriceService } from './price-services';

// Initialize services
const amazonService = new AmazonPriceService({
  accessKey: 'YOUR_ACCESS_KEY',
  secretKey: 'YOUR_SECRET_KEY',
  partnerTag: 'YOUR_PARTNER_TAG',
  region: 'us-east-1',
});

const rakutenService = new RakutenPriceService({
  applicationId: 'YOUR_APP_ID',
});

// Fetch prices
const amazonPrice = await amazonService.fetchPrice('Salomon Speedcross', 'L47452800');
const rakutenPrice = await rakutenService.fetchPrice('Salomon Speedcross', 'L47452800');
```

### Using Factory Function

```typescript
import { getPriceService } from './price-services';

const service = getPriceService('rakuten', {
  rakuten: { applicationId: 'YOUR_APP_ID' },
});

const result = await service.fetchPrice('Product Name', 'Model Number');
```

### Fetch All Platforms

```typescript
import { fetchAllPrices } from './price-services';

const config = {
  amazon: { accessKey: '...', secretKey: '...', partnerTag: '...', region: 'us-east-1' },
  rakuten: { applicationId: '...' },
};

const allPrices = await fetchAllPrices('Salomon Speedcross', 'L47452800', config);

console.log(allPrices.amazon); // Amazon result
console.log(allPrices.rakuten); // Rakuten result
console.log(allPrices.yodobashi); // Yodobashi result
console.log(allPrices.mercari); // Mercari result
```

## Result Format

All services return a standardized `PriceServiceResult`:

```typescript
interface PriceServiceResult {
  platform: 'amazon' | 'rakuten' | 'yodobashi' | 'mercari';
  price: number | null; // Price in JPY, null if not found
  availability: 'in_stock' | 'out_of_stock' | 'not_found';
  productUrl: string; // Direct product URL
  errorMessage?: string; // Error details if fetch failed
}
```

## Error Handling

All services implement:

1. **Retry Logic:** Exponential backoff with max 3 retries
2. **Timeout Handling:** 30-second timeout for all requests
3. **Graceful Degradation:** Returns error result instead of throwing
4. **Detailed Logging:** Console logs for debugging

Example error result:

```typescript
{
  platform: 'amazon',
  price: null,
  availability: 'not_found',
  productUrl: '',
  errorMessage: 'Request timeout after 30 seconds'
}
```

## Configuration via Environment Variables

For Lambda deployment, store credentials in:

1. **AWS Systems Manager Parameter Store:**
   - `/price-comparison/amazon/access-key`
   - `/price-comparison/amazon/secret-key`
   - `/price-comparison/rakuten/app-id`

2. **AWS Secrets Manager:**
   - For sensitive credentials

3. **Environment Variables:**
   - For non-sensitive configuration

## Testing

Each service can be tested independently:

```typescript
// Test with mock data
const service = new RakutenPriceService({ applicationId: 'test' });
const result = await service.fetchPrice('Test Product', 'TEST123');

console.log(result);
```

## Future Enhancements

1. **Amazon Service:**
   - Implement full PA-API 5.0 integration
   - Add AWS Signature V4 signing
   - Support multiple regions

2. **Yodobashi Service:**
   - Migrate to Puppeteer/Playwright
   - Implement proper HTML parsing
   - Add pagination support

3. **All Services:**
   - Add caching layer
   - Implement rate limiting
   - Add metrics and monitoring
   - Support batch operations

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 2.1:** Price data collection from 4 platforms
- **Requirement 2.2:** Extract product name, price, availability, and URL
- **Requirement 2.5:** Error handling and retry logic for failed requests
