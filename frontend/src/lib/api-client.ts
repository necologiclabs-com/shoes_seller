// 末尾のスラッシュを削除
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export interface Product {
    id: string;
    name: string;
    modelNumber: string;
    brand: string;
    imageUrl: string;
    officialUrl: string;
    category: string;
    gender?: 'men' | 'women' | 'unisex';
    description?: string;
    officialPrice?: number;
    colors?: string[];
    sizes?: string[];
    variants?: Array<{
        id: number;
        sku: string;
        color: string;
        size: string;
        price: number;
        available: boolean;
        barcode: string;
    }>;
    inStock?: boolean;
}

export interface PriceData {
    platform: 'amazon' | 'rakuten' | 'yodobashi' | 'mercari';
    price: number | null;
    availability: 'in_stock' | 'out_of_stock' | 'not_found';
    productUrl: string;
    affiliateUrl: string;
    lastUpdated: string;
}

export interface ProductsResponse {
    products: Product[];
    nextToken?: string;
}

export interface ProductDetailResponse {
    product: Product;
}

export interface PricesResponse {
    productId: string;
    prices: PriceData[];
    lastUpdated: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error?.message || `HTTP error! status: ${response.status}`
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unknown error occurred');
        }
    }

    async getProducts(nextToken?: string, limit?: number): Promise<ProductsResponse> {
        const params = new URLSearchParams();
        // デフォルトで100件取得（全製品を取得するため）
        params.append('limit', (limit || 100).toString());
        if (nextToken) {
            params.append('nextToken', nextToken);
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<ProductsResponse>(`/products${query}`);
    }

    async getAllProducts(): Promise<Product[]> {
        const allProducts: Product[] = [];
        let nextToken: string | undefined;

        do {
            const response = await this.getProducts(nextToken, 100);
            allProducts.push(...response.products);
            nextToken = response.nextToken;
        } while (nextToken);

        return allProducts;
    }

    async getProductDetail(productId: string): Promise<ProductDetailResponse> {
        return this.request<ProductDetailResponse>(`/products/${productId}`);
    }

    async getPrices(productId: string): Promise<PricesResponse> {
        return this.request<PricesResponse>(`/products/${productId}/prices`);
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
