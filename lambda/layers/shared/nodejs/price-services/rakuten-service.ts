import { PriceAvailability } from '../types';
import { PriceServiceResult } from './amazon-service';

interface RakutenAPIConfig {
    applicationId: string;
    affiliateId?: string;
}

interface RakutenSearchResponse {
    Items?: Array<{
        Item: {
            itemName: string;
            itemPrice: number;
            itemUrl: string;
            availability: number;
            itemCode: string;
            mediumImageUrls?: Array<{ imageUrl: string }>;
            smallImageUrls?: Array<{ imageUrl: string }>;
        };
    }>;
    error?: string;
    error_description?: string;
}

/**
 * Rakuten Price Service using Rakuten Ichiba Item Search API
 */
export class RakutenPriceService {
    private config: RakutenAPIConfig | null = null;
    private maxRetries = 3;
    private retryDelay = 1000; // ms
    private apiEndpoint = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706';

    constructor(config?: RakutenAPIConfig) {
        this.config = config || null;
    }

    /**
     * Fetch price for a product by searching with product name and model number
     */
    async fetchPrice(productName: string, modelNumber: string): Promise<PriceServiceResult> {
        try {
            if (!this.config?.applicationId) {
                throw new Error('Rakuten API application ID not configured');
            }

            const searchQuery = `${productName} ${modelNumber}`;
            const result = await this.searchProduct(searchQuery);

            return result;
        } catch (error) {
            console.error('Rakuten price fetch error:', error);
            return {
                platform: 'rakuten',
                price: null,
                availability: 'not_found',
                productUrl: '',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Search for product using Rakuten API
     */
    private async searchProduct(searchQuery: string): Promise<PriceServiceResult> {
        return await this.retryOperation(async () => {
            const params = new URLSearchParams({
                applicationId: this.config!.applicationId,
                keyword: searchQuery,
                hits: '5',
                sort: '-itemPrice', // Sort by price descending to get most relevant
                formatVersion: '2',
                imageFlag: '1' // Request image URLs
            });

            if (this.config?.affiliateId) {
                params.append('affiliateId', this.config.affiliateId);
            }

            const url = `${this.apiEndpoint}?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });

            if (!response.ok) {
                throw new Error(`Rakuten API error: ${response.status} ${response.statusText}`);
            }

            const data = (await response.json()) as RakutenSearchResponse;

            if (data.error) {
                throw new Error(`Rakuten API error: ${data.error} - ${data.error_description}`);
            }

            // Find best matching product
            const matchedItem = this.findBestMatch(data, searchQuery);

            if (!matchedItem) {
                return {
                    platform: 'rakuten',
                    price: null,
                    availability: 'not_found',
                    productUrl: '',
                    errorMessage: 'Product not found on Rakuten'
                };
            }

            return {
                platform: 'rakuten',
                price: matchedItem.itemPrice,
                availability: this.mapAvailability(matchedItem.availability),
                productUrl: matchedItem.itemUrl,
                imageUrl: this.extractImageUrl(matchedItem)
            };
        });
    }

    /**
     * Find best matching product from search results
     */
    private findBestMatch(
        data: RakutenSearchResponse,
        searchQuery: string
    ): { itemName: string; itemPrice: number; itemUrl: string; availability: number; itemCode: string; mediumImageUrls?: Array<{ imageUrl: string }>; smallImageUrls?: Array<{ imageUrl: string }> } | null {
        if (!data.Items || data.Items.length === 0) {
            return null;
        }

        // Simple matching: return first result
        // In production, implement more sophisticated matching logic
        // based on product name similarity, model number matching, etc.
        const firstItem = data.Items[0]!.Item;

        // Basic validation: check if search terms appear in item name
        const queryTerms = searchQuery.toLowerCase().split(' ');
        const itemName = firstItem.itemName.toLowerCase();

        const matchScore = queryTerms.filter(term => itemName.includes(term)).length;

        // Require at least 50% of terms to match
        if (matchScore >= queryTerms.length * 0.5) {
            return firstItem;
        }

        return null;
    }

    /**
     * Map Rakuten availability to our standard format
     */
    private mapAvailability(availability: number): PriceAvailability {
        // Rakuten availability: 1 = in stock, 0 = out of stock
        if (availability === 1) {
            return 'in_stock';
        }
        return 'out_of_stock';
    }

    /**
     * Extract image URL from Rakuten item
     */
    private extractImageUrl(item: { mediumImageUrls?: Array<{ imageUrl: string }>; smallImageUrls?: Array<{ imageUrl: string }> }): string | undefined {
        // Try medium image first, fallback to small
        return item.mediumImageUrls?.[0]?.imageUrl || item.smallImageUrls?.[0]?.imageUrl;
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

            // Don't retry on 4xx errors (client errors)
            if (error instanceof Error && error.message.includes('4')) {
                throw error;
            }

            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            console.log(`Retry attempt ${attempt} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.retryOperation(operation, attempt + 1);
        }
    }
}
