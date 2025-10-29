import { PriceAvailability } from '../types';
import { PriceServiceResult } from './amazon-service';

interface MercariSearchResponse {
    data?: Array<{
        id: string;
        name: string;
        price: number;
        status: string;
        thumbnails?: string[];
    }>;
    meta?: {
        num_found: number;
    };
}

/**
 * Mercari Price Service using Web API
 * 
 * Note: Mercari has an unofficial API that can be accessed.
 * This implementation attempts to use that API, with fallback to web scraping.
 */
export class MercariPriceService {
    private maxRetries = 3;
    private retryDelay = 1000; // ms
    private apiEndpoint = 'https://api.mercari.jp/v2/entities:search';
    private webEndpoint = 'https://jp.mercari.com/search';
    private timeout = 30000; // 30 seconds

    /**
     * Fetch price for a product by searching with product name and model number
     */
    async fetchPrice(productName: string, modelNumber: string): Promise<PriceServiceResult> {
        try {
            const searchQuery = `${productName} ${modelNumber}`;

            // Try API first, fallback to web scraping
            let result = await this.searchViaAPI(searchQuery);

            if (!result) {
                result = await this.searchViaWeb(searchQuery);
            }

            return result || {
                platform: 'mercari',
                price: null,
                availability: 'not_found',
                productUrl: '',
                errorMessage: 'Product not found on Mercari'
            };
        } catch (error) {
            console.error('Mercari price fetch error:', error);
            return {
                platform: 'mercari',
                price: null,
                availability: 'not_found',
                productUrl: '',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Search using Mercari's unofficial API
     */
    private async searchViaAPI(searchQuery: string): Promise<PriceServiceResult | null> {
        return await this.retryOperation(async () => {
            try {
                const params = new URLSearchParams({
                    keyword: searchQuery,
                    limit: '10',
                    sort: 'created_time',
                    order: 'desc',
                    status: 'on_sale'
                });

                const url = `${this.apiEndpoint}?${params.toString()}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json',
                        'X-Platform': 'web'
                    },
                    signal: AbortSignal.timeout(this.timeout)
                });

                if (!response.ok) {
                    console.log(`Mercari API returned ${response.status}, will try web scraping`);
                    return null;
                }

                const data = (await response.json()) as MercariSearchResponse;

                if (!data.data || data.data.length === 0) {
                    return null;
                }

                // Find best matching product
                const matchedItem = this.findBestMatch(data.data, searchQuery);

                if (!matchedItem) {
                    return null;
                }

                return {
                    platform: 'mercari',
                    price: matchedItem.price,
                    availability: this.mapAvailability(matchedItem.status),
                    productUrl: `https://jp.mercari.com/item/${matchedItem.id}`
                };
            } catch (error) {
                console.log('Mercari API error, will try web scraping:', error);
                return null;
            }
        });
    }

    /**
     * Search using web scraping as fallback
     */
    private async searchViaWeb(searchQuery: string): Promise<PriceServiceResult | null> {
        return await this.retryOperation(async () => {
            const params = new URLSearchParams({
                keyword: searchQuery,
                status: 'on_sale'
            });

            const url = `${this.webEndpoint}?${params.toString()}`;

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
                throw new Error(`Mercari web request failed: ${response.status}`);
            }

            const html = await response.text();

            // Extract product information from HTML
            return this.parseSearchResults(html);
        });
    }

    /**
     * Find best matching product from search results
     */
    private findBestMatch(
        items: MercariSearchResponse['data'],
        searchQuery: string
    ): { id: string; name: string; price: number; status: string; thumbnails?: string[]; } | null {
        if (!items || items.length === 0) {
            return null;
        }

        // Simple matching: find item with most matching terms
        const queryTerms = searchQuery.toLowerCase().split(' ');

        let bestMatch = items[0]!;
        let bestScore = 0;

        for (const item of items) {
            const itemName = item.name.toLowerCase();
            const matchScore = queryTerms.filter(term => itemName.includes(term)).length;

            if (matchScore > bestScore) {
                bestScore = matchScore;
                bestMatch = item;
            }
        }

        // Require at least 50% of terms to match
        if (bestScore >= queryTerms.length * 0.5) {
            return bestMatch;
        }

        return null;
    }

    /**
     * Parse HTML search results to extract product information
     */
    private parseSearchResults(html: string): PriceServiceResult | null {
        try {
            // Simple regex-based extraction (not robust for production)
            // In production, use a proper HTML parser

            // Look for product data in JSON-LD or data attributes
            const priceMatch = html.match(/"price":\s*(\d+)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : null;

            const idMatch = html.match(/\/item\/(m\d+)/);
            const itemId = idMatch ? idMatch[1] : null;

            if (!price || !itemId) {
                return null;
            }

            return {
                platform: 'mercari',
                price,
                availability: 'in_stock', // If found in search, it's available
                productUrl: `https://jp.mercari.com/item/${itemId}`
            };
        } catch (error) {
            console.error('Error parsing Mercari HTML:', error);
            return null;
        }
    }

    /**
     * Map Mercari status to our standard format
     */
    private mapAvailability(status: string): PriceAvailability {
        if (status === 'on_sale') {
            return 'in_stock';
        }
        if (status === 'sold_out' || status === 'trading') {
            return 'out_of_stock';
        }
        return 'not_found';
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
}
