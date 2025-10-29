/**
 * Salomon Catalog Service
 * 
 * Fetches product catalog data from Salomon official website
 * including product details, colors, sizes, and inventory status.
 */

export interface SalomonProduct {
    modelNumber: string;
    name: string;
    description: string;
    imageUrl: string;
    officialUrl: string;
    price: number | null;
    category: string;
    colors: SalomonColorVariant[];
    sizes: SalomonSizeVariant[];
}

export interface SalomonColorVariant {
    colorCode: string;
    colorName: string;
    imageUrl: string;
    inStock: boolean;
}

export interface SalomonSizeVariant {
    size: string;
    sizeEU: string;
    sizeUS: string;
    sizeUK: string;
    inStock: boolean;
    sku: string;
}

export interface SalomonCatalogResult {
    success: boolean;
    product?: SalomonProduct;
    error?: string;
}

/**
 * Salomon Catalog Service
 * 
 * Scrapes Salomon official website to retrieve product catalog information.
 * Uses a combination of product listing API and individual product page scraping.
 */
export class SalomonCatalogService {
    private baseUrl = 'https://www.salomon.com';
    private apiBaseUrl = 'https://www.salomon.com/api';
    private catalogUrl = 'https://www.salomon.com/ja-jp/shop';
    private maxRetries = 3;
    private retryDelay = 2000; // ms
    private timeout = 60000; // 60 seconds (catalog scraping can be slow)

    /**
     * Fetch all trail running shoes from Salomon catalog
     */
    async fetchTrailRunningShoes(): Promise<SalomonProduct[]> {
        try {
            // Step 1: Fetch product listing from category page
            const productUrls = await this.fetchProductListingUrls();

            // Step 2: Fetch details for each product
            const products: SalomonProduct[] = [];
            for (const url of productUrls) {
                const result = await this.fetchProductDetails(url);
                if (result.success && result.product) {
                    products.push(result.product);
                }
                // Rate limiting: wait between requests
                await this.delay(1000);
            }

            return products;
        } catch (error) {
            console.error('Error fetching Salomon catalog:', error);
            throw error;
        }
    }

    /**
     * Fetch product listing URLs from category page
     */
    private async fetchProductListingUrls(): Promise<string[]> {
        return await this.retryOperation(async () => {
            // Category page for trail running shoes
            const categoryUrl = `${this.catalogUrl}/trail-running.html`;

            const response = await fetch(categoryUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                },
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch category page: ${response.status}`);
            }

            const html = await response.text();

            // Extract product URLs from HTML
            // Pattern: /ja-jp/shop/product/{product-name}.html
            const urlPattern = /\/ja-jp\/shop\/product\/([^"]+)\.html/g;
            const matches = [...html.matchAll(urlPattern)];
            const urls = [...new Set(matches.map(m => `${this.baseUrl}${m[0]}`))];

            console.log(`Found ${urls.length} products in category`);
            return urls;
        });
    }

    /**
     * Fetch detailed product information from product page
     */
    async fetchProductDetails(productUrl: string): Promise<SalomonCatalogResult> {
        return await this.retryOperation(async () => {
            try {
                const response = await fetch(productUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                    },
                    signal: AbortSignal.timeout(this.timeout),
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch product page: ${response.status}`);
                }

                const html = await response.text();

                // Extract product data from HTML
                const product = this.parseProductPage(html, productUrl);

                if (!product) {
                    return {
                        success: false,
                        error: 'Failed to parse product data',
                    };
                }

                return {
                    success: true,
                    product,
                };
            } catch (error) {
                console.error(`Error fetching product details from ${productUrl}:`, error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }

    /**
     * Parse product page HTML to extract structured data
     */
    private parseProductPage(html: string, productUrl: string): SalomonProduct | null {
        try {
            // Extract JSON-LD structured data (most reliable method)
            const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
            let productData: { name?: string; description?: string; image?: string; offers?: { price?: number } } | null = null;

            if (jsonLdMatch) {
                try {
                    productData = JSON.parse(jsonLdMatch[1]);
                } catch (e) {
                    console.warn('Failed to parse JSON-LD:', e);
                }
            }

            // Extract model number from URL or page
            const modelNumberMatch = productUrl.match(/\/product\/([^/]+)\.html/);
            const urlSlug = modelNumberMatch ? modelNumberMatch[1] : '';

            // Extract model code (e.g., L47452800) from page
            const modelCodeMatch = html.match(/(?:model|sku|article)["']?\s*:\s*["']?([A-Z]\d{8})["']?/i);
            const modelNumber = modelCodeMatch ? modelCodeMatch[1] : urlSlug;

            // Extract product name
            const nameMatch = html.match(/<h1[^>]*class="[^"]*product-name[^"]*"[^>]*>(.*?)<\/h1>/i) ||
                html.match(/<meta property="og:title" content="([^"]+)"/) ||
                (productData && productData.name);
            const name = nameMatch ? (typeof nameMatch === 'string' ? nameMatch : nameMatch[1].trim()) : '';

            // Extract description
            const descMatch = html.match(/<meta name="description" content="([^"]+)"/) ||
                html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/div>/is) ||
                (productData && productData.description);
            const description = descMatch ? (typeof descMatch === 'string' ? descMatch : descMatch[1].trim()) : '';

            // Extract main image
            const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/) ||
                html.match(/<img[^>]+class="[^"]*product-image[^"]*"[^>]+src="([^"]+)"/i) ||
                (productData && productData.image);
            const imageUrl = imageMatch ? (typeof imageMatch === 'string' ? imageMatch : imageMatch[1]) : '';

            // Extract price
            const priceMatch = html.match(/["']price["']\s*:\s*["']?(\d+(?:\.\d+)?)["']?/) ||
                html.match(/¥\s*([\d,]+)/) ||
                (productData && productData.offers && productData.offers.price);
            let price: number | null = null;
            if (priceMatch) {
                if (typeof priceMatch === 'number') {
                    price = priceMatch;
                } else if (Array.isArray(priceMatch) && priceMatch[1]) {
                    price = parseFloat(priceMatch[1].replace(/,/g, ''));
                }
            }

            // Extract color variants
            const colors = this.extractColorVariants(html);

            // Extract size variants
            const sizes = this.extractSizeVariants(html);

            if (!name || !modelNumber) {
                console.warn(`Missing required fields for product at ${productUrl}`);
                return null;
            }

            return {
                modelNumber,
                name,
                description,
                imageUrl: imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`,
                officialUrl: productUrl,
                price,
                category: 'trail-running',
                colors,
                sizes,
            };
        } catch (error) {
            console.error('Error parsing product page:', error);
            return null;
        }
    }

    /**
     * Extract color variants from product page
     */
    private extractColorVariants(html: string): SalomonColorVariant[] {
        const colors: SalomonColorVariant[] = [];

        try {
            // Look for color selector elements
            // Pattern varies by Salomon's current frontend implementation
            const colorPattern = /<div[^>]*class="[^"]*color-swatch[^"]*"[^>]*data-color-name="([^"]+)"[^>]*data-color-code="([^"]+)"[^>]*data-image="([^"]+)"[^>]*data-in-stock="([^"]+)"/gi;
            const matches = [...html.matchAll(colorPattern)];

            for (const match of matches) {
                colors.push({
                    colorName: match[1],
                    colorCode: match[2],
                    imageUrl: match[3].startsWith('http') ? match[3] : `${this.baseUrl}${match[3]}`,
                    inStock: match[4] === 'true',
                });
            }

            // Fallback: try alternate pattern (JSON data in script tag)
            if (colors.length === 0) {
                const jsonMatch = html.match(/var\s+colors\s*=\s*(\[[\s\S]*?\]);/);
                if (jsonMatch) {
                    try {
                        const colorData = JSON.parse(jsonMatch[1]);
                        for (const color of colorData) {
                            colors.push({
                                colorCode: color.code || color.id || '',
                                colorName: color.name || '',
                                imageUrl: color.image || '',
                                inStock: color.inStock !== false,
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to parse color JSON:', e);
                    }
                }
            }
        } catch (error) {
            console.warn('Error extracting color variants:', error);
        }

        return colors;
    }

    /**
     * Extract size variants from product page
     */
    private extractSizeVariants(html: string): SalomonSizeVariant[] {
        const sizes: SalomonSizeVariant[] = [];

        try {
            // Look for size selector elements
            const sizePattern = /<option[^>]*value="([^"]+)"[^>]*data-size-eu="([^"]*)"[^>]*data-size-us="([^"]*)"[^>]*data-size-uk="([^"]*)"[^>]*data-in-stock="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
            const matches = [...html.matchAll(sizePattern)];

            for (const match of matches) {
                sizes.push({
                    sku: match[1],
                    sizeEU: match[2] || match[6].trim(),
                    sizeUS: match[3],
                    sizeUK: match[4],
                    size: match[6].trim(),
                    inStock: match[5] === 'true',
                });
            }

            // Fallback: try JSON data
            if (sizes.length === 0) {
                const jsonMatch = html.match(/var\s+sizes\s*=\s*(\[[\s\S]*?\]);/);
                if (jsonMatch) {
                    try {
                        const sizeData = JSON.parse(jsonMatch[1]);
                        for (const size of sizeData) {
                            sizes.push({
                                sku: size.sku || size.id || '',
                                size: size.size || size.label || '',
                                sizeEU: size.sizeEU || size.eu || '',
                                sizeUS: size.sizeUS || size.us || '',
                                sizeUK: size.sizeUK || size.uk || '',
                                inStock: size.inStock !== false,
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to parse size JSON:', e);
                    }
                }
            }
        } catch (error) {
            console.warn('Error extracting size variants:', error);
        }

        return sizes;
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

            await this.delay(delay);
            return this.retryOperation(operation, attempt + 1);
        }
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
