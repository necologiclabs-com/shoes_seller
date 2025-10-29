/**
 * ALTRA Footwear Catalog Service
 * 
 * ALTRAの公式サイト（Shopify）からトレイルランニングシューズの
 * 製品情報を取得します。
 */

export interface AltraProduct {
    handle: string;
    title: string;
    productType: string;
    vendor: string;
    tags: string[];
    images: string[];
    variants: Array<{
        id: number;
        title: string;
        price: string;
        sku: string;
        available: boolean;
    }>;
}

interface ShopifyProductsResponse {
    products: Array<{
        id: number;
        handle: string;
        title: string;
        product_type: string;
        vendor: string;
        tags: string[];
        images: Array<{
            src: string;
        }>;
        variants: Array<{
            id: number;
            title: string;
            price: string;
            sku: string;
            available: boolean;
        }>;
    }>;
}

export class AltraJpCatalogService {
    private readonly baseUrl = 'https://altrafootwear.jp';
    private readonly mensTrailCollection = '/collections/m-trail';
    private readonly womensTrailCollection = '/collections/l-trail';

    /**
     * メンズトレイルランニングシューズを取得
     */
    async getMensTrailProducts(): Promise<AltraProduct[]> {
        return this.getProductsFromCollection(this.mensTrailCollection);
    }

    /**
     * ウィメンズトレイルランニングシューズを取得
     */
    async getWomensTrailProducts(): Promise<AltraProduct[]> {
        return this.getProductsFromCollection(this.womensTrailCollection);
    }

    /**
     * すべてのトレイルランニングシューズを取得
     */
    async getAllTrailProducts(): Promise<{ mens: AltraProduct[]; womens: AltraProduct[] }> {
        const [mens, womens] = await Promise.all([
            this.getMensTrailProducts(),
            this.getWomensTrailProducts(),
        ]);

        return { mens, womens };
    }

    /**
     * コレクションから製品を取得
     */
    private async getProductsFromCollection(collectionPath: string): Promise<AltraProduct[]> {
        try {
            const url = `${this.baseUrl}${collectionPath}/products.json?limit=100`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
            }

            const data = (await response.json()) as ShopifyProductsResponse;

            return data.products.map(product => ({
                handle: product.handle,
                title: product.title,
                productType: product.product_type,
                vendor: product.vendor,
                tags: product.tags,
                images: product.images.map(img => img.src),
                variants: product.variants,
            }));
        } catch (error) {
            console.error(`Error fetching ALTRA products from ${collectionPath}:`, error);
            return [];
        }
    }

    /**
     * 製品詳細を取得
     */
    async getProductDetail(handle: string): Promise<AltraProduct | null> {
        try {
            const url = `${this.baseUrl}/products/${handle}.json`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch product: ${response.status} ${response.statusText}`);
            }

            const data = await response.json() as { product: ShopifyProductsResponse['products'][0] };
            const product = data.product;

            return {
                handle: product.handle,
                title: product.title,
                productType: product.product_type,
                vendor: product.vendor,
                tags: product.tags,
                images: product.images.map(img => img.src),
                variants: product.variants,
            };
        } catch (error) {
            console.error(`Error fetching ALTRA product detail for ${handle}:`, error);
            return null;
        }
    }
}
