import { Platform, PriceAvailability } from '../types';

export interface PriceServiceResult {
    platform: Platform;
    price: number | null;
    availability: PriceAvailability;
    productUrl: string;
    imageUrl?: string; // 製品画像URL（取得できた場合）
    errorMessage?: string;
}

interface AmazonPAAPIConfig {
    accessKey: string;
    secretKey: string;
    partnerTag: string;
    region: string;
}

/**
 * Amazon Price Service using Product Advertising API 5.0
 * 
 * Note: This implementation requires AWS credentials and Amazon PA-API access.
 * For development/testing without PA-API access, this will return mock data or errors.
 */
export class AmazonPriceService {
    private config: AmazonPAAPIConfig | null = null;
    private maxRetries = 3;
    private retryDelay = 1000; // ms

    constructor(config?: AmazonPAAPIConfig) {
        this.config = config || null;
    }

    /**
     * Fetch price for a product by searching with product name and model number
     */
    async fetchPrice(productName: string, modelNumber: string): Promise<PriceServiceResult> {
        try {
            // First, search for the product to get ASIN
            const asin = await this.searchProduct(productName, modelNumber);

            if (!asin) {
                return {
                    platform: 'amazon',
                    price: null,
                    availability: 'not_found',
                    productUrl: '',
                    errorMessage: 'Product not found on Amazon'
                };
            }

            // Then fetch price details using ASIN
            return await this.fetchPriceByASIN(asin);
        } catch (error) {
            console.error('Amazon price fetch error:', error);
            return {
                platform: 'amazon',
                price: null,
                availability: 'not_found',
                productUrl: '',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Search for product and resolve ASIN
     */
    private async searchProduct(productName: string, modelNumber: string): Promise<string | null> {
        const searchQuery = `${productName} ${modelNumber}`;

        return await this.retryOperation(async () => {
            if (!this.config) {
                throw new Error('Amazon PA-API credentials not configured');
            }

            // TODO: Implement actual PA-API 5.0 SearchItems operation
            // This requires signing requests with AWS Signature Version 4
            // For now, return null to indicate not found
            console.log(`Searching Amazon for: ${searchQuery}`);

            // Placeholder: In production, this would call PA-API SearchItems
            // const response = await this.callPAAPI('SearchItems', {
            //     Keywords: searchQuery,
            //     SearchIndex: 'All',
            //     ItemCount: 5,
            //     Resources: ['ItemInfo.Title', 'Offers.Listings.Price']
            // });

            return null;
        });
    }

    /**
     * Fetch price details by ASIN
     */
    private async fetchPriceByASIN(asin: string): Promise<PriceServiceResult> {
        return await this.retryOperation(async () => {
            if (!this.config) {
                throw new Error('Amazon PA-API credentials not configured');
            }

            // TODO: Implement actual PA-API 5.0 GetItems operation
            console.log(`Fetching Amazon price for ASIN: ${asin}`);

            // Placeholder: In production, this would call PA-API GetItems
            // const response = await this.callPAAPI('GetItems', {
            //     ItemIds: [asin],
            //     Resources: [
            //         'ItemInfo.Title',
            //         'Offers.Listings.Price',
            //         'Offers.Listings.Availability.Type',
            //         'ItemInfo.ProductInfo'
            //     ]
            // });

            return {
                platform: 'amazon',
                price: null,
                availability: 'not_found',
                productUrl: `https://www.amazon.co.jp/dp/${asin}`,
                errorMessage: 'PA-API integration not yet implemented'
            };
        });
    }

    /**
     * Retry operation with exponential backoff
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

            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            console.log(`Retry attempt ${attempt} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.retryOperation(operation, attempt + 1);
        }
    }

    /**
     * Extract price from PA-API response
     */
    private extractPrice(item: Record<string, unknown>): number | null {
        try {
            const price = (item?.Offers as any)?.Listings?.[0]?.Price?.Amount;
            return price ? parseFloat(price) : null;
        } catch {
            return null;
        }
    }

    /**
     * Extract availability from PA-API response
     */
    private extractAvailability(item: Record<string, unknown>): PriceAvailability {
        try {
            const availabilityType = (item?.Offers as any)?.Listings?.[0]?.Availability?.Type;

            if (!availabilityType) {
                return 'not_found';
            }

            if (availabilityType === 'Now') {
                return 'in_stock';
            }

            return 'out_of_stock';
        } catch {
            return 'not_found';
        }
    }

    /**
     * Extract image URL from PA-API response
     */
    private extractImageUrl(item: Record<string, unknown>): string | undefined {
        try {
            // Try to get the large image first, fallback to medium
            const images = (item?.Images as any)?.Primary;
            return images?.Large?.URL || images?.Medium?.URL || undefined;
        } catch {
            return undefined;
        }
    }
}
