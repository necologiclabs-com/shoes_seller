import { Platform, PriceAvailability } from '../types';
import { PriceServiceResult } from './amazon-service';

/**
 * Yodobashi Price Service using Web Scraping
 * 
 * Note: This implementation uses HTTP requests to scrape Yodobashi's website.
 * For production use with Puppeteer/Playwright, this would need to be deployed
 * in a Lambda with a custom runtime or container image.
 */
export class YodobashiPriceService {
    private maxRetries = 3;
    private retryDelay = 1000; // ms
    private searchUrl = 'https://www.yodobashi.com/';
    private timeout = 30000; // 30 seconds

    /**
     * Fetch price for a product by searching with product name and model number
     */
    async fetchPrice(productName: string, modelNumber: string): Promise<PriceServiceResult> {
        try {
            const searchQuery = `${productName} ${modelNumber}`;
            const result = await this.searchAndExtractPrice(searchQuery);

            return result;
        } catch (error) {
            console.error('Yodobashi price fetch error:', error);
            return {
                platform: 'yodobashi',
                price: null,
                availability: 'not_found',
                productUrl: '',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Search for product and extract price information
     */
    private async searchAndExtractPrice(searchQuery: string): Promise<PriceServiceResult> {
        return await this.retryOperation(async () => {
            // Build search URL
            const searchParams = new URLSearchParams({
                word: searchQuery
            });
            const url = `${this.searchUrl}?${searchParams.toString()}`;

            // Fetch search results page
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
                },
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                throw new Error(`Yodobashi request failed: ${response.status}`);
            }

            const html = await response.text();

            // Extract product information from HTML
            const productInfo = this.parseSearchResults(html);

            if (!productInfo) {
                return {
                    platform: 'yodobashi',
                    price: null,
                    availability: 'not_found',
                    productUrl: '',
                    errorMessage: 'Product not found on Yodobashi'
                };
            }

            return productInfo;
        });
    }

    /**
     * Parse HTML search results to extract product information
     * 
     * Note: This is a simplified implementation. In production, you would:
     * 1. Use a proper HTML parser (like cheerio or jsdom)
     * 2. Handle pagination
     * 3. Implement more robust selectors
     * 4. Use Puppeteer/Playwright for JavaScript-rendered content
     */
    private parseSearchResults(html: string): PriceServiceResult | null {
        try {
            // Simple regex-based extraction (not robust for production)
            // In production, use a proper HTML parser

            // Look for product price pattern
            const priceMatch = html.match(/¥\s*([\d,]+)/);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

            // Look for product URL pattern
            const urlMatch = html.match(/href="(\/product\/\d+\/?)"/);
            const productPath = urlMatch ? urlMatch[1] : null;

            if (!price || !productPath) {
                return null;
            }

            // Check availability (simplified)
            const inStock = html.includes('在庫あり') || html.includes('お取り寄せ');
            const availability: PriceAvailability = inStock ? 'in_stock' : 'out_of_stock';

            return {
                platform: 'yodobashi',
                price,
                availability,
                productUrl: `https://www.yodobashi.com${productPath}`
            };
        } catch (error) {
            console.error('Error parsing Yodobashi HTML:', error);
            return null;
        }
    }

    /**
     * Retry operation with exponential backoff and timeout handling
     */
    private async retryOperation<T>(
        operation: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= this.maxRetries) {
                throw error;
            }

            // Don't retry on timeout errors after max attempts
            if (error instanceof Error && error.name === 'TimeoutError') {
                console.log(`Timeout on attempt ${attempt}`);
            }

            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            console.log(`Retry attempt ${attempt} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.retryOperation(operation, attempt + 1);
        }
    }
}

/**
 * Enhanced Yodobashi Service using Puppeteer (for future implementation)
 * 
 * This would require:
 * 1. Lambda Layer with Chromium binary
 * 2. Puppeteer or Playwright package
 * 3. Increased Lambda memory and timeout
 */
export class YodobashiPuppeteerService {
    // Placeholder for future Puppeteer implementation
    async fetchPrice(productName: string, modelNumber: string): Promise<PriceServiceResult> {
        // TODO: Implement Puppeteer-based scraping
        // const browser = await puppeteer.launch({ headless: true });
        // const page = await browser.newPage();
        // await page.goto(searchUrl);
        // ... navigate and extract data
        // await browser.close();

        throw new Error('Puppeteer implementation not yet available');
    }
}
