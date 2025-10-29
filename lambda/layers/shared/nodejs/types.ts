// Entity Types for DynamoDB Single Table Design

export interface ProductVariant {
    id: number;
    sku: string;
    color: string;
    size: string;
    price: number;
    available: boolean;
    barcode: string;
}

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
    variants?: ProductVariant[];
    inStock?: boolean;
    createdAt: string;
    updatedAt: string;
}

export type PriceAvailability = 'in_stock' | 'out_of_stock' | 'not_found';
export type Platform = 'amazon' | 'rakuten' | 'yodobashi' | 'mercari';

export interface Price {
    productId: string;
    platform: Platform;
    price: number | null;
    availability: PriceAvailability;
    productUrl: string;
    lastUpdated: string;
    lastChecked: string;
    errorMessage?: string;
}

export interface AffiliateConfig {
    platform: Platform;
    affiliateId: string;
    trackingTag: string;
    urlTemplate: string;
    isActive: boolean;
}

// DynamoDB Item Types
export interface DynamoDBItem {
    PK: string;
    SK: string;
    GSI1PK?: string;
    GSI1SK?: string;
    entityType: string;
    [key: string]: any;
}

export interface ProductItem extends DynamoDBItem {
    entityType: 'product';
    name: string;
    productName?: string;  // Support ALTRA products that use productName field
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
    variants?: ProductVariant[];
    inStock?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PriceItem extends DynamoDBItem {
    entityType: 'price';
    platform: Platform;
    price: number | null;
    availability: PriceAvailability;
    productUrl: string;
    lastUpdated: string;
    lastChecked: string;
    errorMessage?: string;
}

export interface AffiliateConfigItem extends DynamoDBItem {
    entityType: 'affiliateConfig';
    platform: Platform;
    affiliateId: string;
    trackingTag: string;
    urlTemplate: string;
    isActive: boolean;
}
