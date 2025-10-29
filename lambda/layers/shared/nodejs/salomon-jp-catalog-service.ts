/**
 * Salomon Japan Catalog Service
 * 
 * Fetches product catalog data from Salomon Japan official website (salomon.jp)
 * Uses Shopify's JSON API for reliable data extraction.
 */

export interface SalomonJpProduct {
    modelNumber: string; // SKU from first variant
    name: string;
    description: string;
    imageUrl: string;
    officialUrl: string;
    price: number;
    category: string;
    gender: 'men' | 'women' | 'unisex';
    colors: string[];
    sizes: string[];
    inStock: boolean;
    variants: SalomonJpVariant[];
}

export interface SalomonJpVariant {
    id: number;
    sku: string;
    color: string;
    size: string;
    price: number;
    available: boolean;
    barcode: string;
}

export interface SalomonJpCatalogResult {
    success: boolean;
    products?: SalomonJpProduct[];
    error?: string;
}

/**
 * Salomon Japan Catalog Service
 * 
 * Uses Shopify's JSON API endpoints to fetch product data from salomon.jp
 * Much more reliable than HTML scraping.
 */
export class SalomonJpCatalogService {
    private baseUrl = 'https://salomon.jp';
    private collections = {
        men: 'men-shoes-trail-running',
        women: 'women-shoes-trail-running',
    };
    private maxRetries = 3;
    private retryDelay = 2000; // ms
    private timeout = 30000; // 30 seconds

    /**
     * Fetch all trail running shoes from Salomon Japan catalog (both men and women)
     */
    async fetchTrailRunningShoes(): Promise<SalomonJpCatalogResult> {
        try {
            const allProducts: SalomonJpProduct[] = [];

            // Fetch men's products
            const menProducts = await this.fetchProductsByGender('men');
            allProducts.push(...menProducts);

            // Fetch women's products
            const womenProducts = await this.fetchProductsByGender('women');
            allProducts.push(...womenProducts);

            console.log(`Successfully fetched ${allProducts.length} total products (${menProducts.length} men, ${womenProducts.length} women)`);

            return {
                success: true,
                products: allProducts,
            };
        } catch (error) {
            console.error('Error fetching Salomon Japan catalog:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Fetch products for a specific gender
     */
    private async fetchProductsByGender(gender: 'men' | 'women'): Promise<SalomonJpProduct[]> {
        const collectionHandle = this.collections[gender];
        console.log(`Fetching ${gender}'s trail running shoes from ${collectionHandle}...`);

        // Step 1: Get collection page to extract product handles
        const handles = await this.fetchProductHandles(collectionHandle);
        console.log(`Found ${handles.length} ${gender}'s products in collection`);

        // Step 2: Fetch details for each product using Shopify JSON API
        const products: SalomonJpProduct[] = [];

        for (const handle of handles) {
            try {
                const product = await this.fetchProductByHandle(handle, gender);
                if (product) {
                    products.push(product);
                }

                // Rate limiting: wait between requests to be polite
                await this.delay(500);
            } catch (error) {
                console.error(`Failed to fetch product ${handle}:`, error);
                // Continue with other products
            }
        }

        console.log(`Successfully fetched ${products.length} out of ${handles.length} ${gender}'s products`);
        return products;
    }

    /**
     * Fetch product handles from collection page
     */
    private async fetchProductHandles(collectionHandle: string): Promise<string[]> {
        return await this.retryOperation(async () => {
            const collectionUrl = `${this.baseUrl}/collections/${collectionHandle}`;

            const response = await fetch(collectionUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                },
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch collection page: ${response.status}`);
            }

            const html = await response.text();

            // Extract product handles from links
            // Pattern: /products/{handle} or /collections/{collection}/products/{handle}
            const handlePattern = /\/products\/([a-z0-9-]+)/g;
            const matches = [...html.matchAll(handlePattern)];
            const handles = [...new Set(matches.map(m => m[1]))];

            return handles;
        });
    }

    /**
     * Fetch product details using Shopify JSON API
     */
    private async fetchProductByHandle(handle: string, gender: 'men' | 'women'): Promise<SalomonJpProduct | null> {
        return await this.retryOperation(async () => {
            // Shopify provides a JSON endpoint for each product
            const productUrl = `${this.baseUrl}/products/${handle}.json`;

            const response = await fetch(productUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(this.timeout),
            });

            if (!response.ok) {
                console.warn(`Failed to fetch product ${handle}: ${response.status}`);
                return null;
            }

            const data = await response.json() as {
                product: {
                    title: string;
                    body_html?: string;
                    handle: string;
                    images?: Array<{ src: string }>;
                    variants: Array<{
                        id: number;
                        sku: string;
                        option1?: string;
                        option2?: string;
                        price: string;
                        available?: boolean;
                        barcode?: string;
                    }>;
                };
            };
            const product = data.product;

            if (!product || !product.variants || product.variants.length === 0) {
                console.warn(`Product ${handle} has no variants`);
                return null;
            }

            // Extract data from Shopify product object
            const variants: SalomonJpVariant[] = product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                color: v.option1 || '',
                size: v.option2 || '',
                price: parseInt(v.price, 10),
                available: v.available !== false,
                barcode: v.barcode || '',
            }));

            // Extract unique colors and sizes
            const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
            const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

            // Get the first available variant or just the first variant
            const firstVariant = variants.find(v => v.available) || variants[0];
            const price = firstVariant.price;

            // Check if any variant is in stock
            const inStock = variants.some(v => v.available);

            // Get main image
            const imageUrl = product.images && product.images.length > 0
                ? product.images[0].src
                : '';

            // Model number is typically the SKU of the first variant (without size suffix)
            // Example: L49128800022 -> L491288
            const modelNumber = this.extractModelNumber(firstVariant.sku) || handle;

            return {
                modelNumber,
                name: product.title,
                description: this.stripHtml(product.body_html || ''),
                imageUrl,
                officialUrl: `${this.baseUrl}/products/${handle}`,
                price,
                category: 'trail-running',
                gender,
                colors,
                sizes,
                inStock,
                variants,
            };
        });
    }

    /**
     * Extract model number from SKU
     * Example: L49128800022 -> L491288
     */
    private extractModelNumber(sku: string): string | null {
        // Salomon SKUs typically have format: L{6 digits}{size digits}
        const match = sku.match(/^(L\d{6})/);
        return match ? match[1] : null;
    }

    /**
     * Strip HTML tags from text
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
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
