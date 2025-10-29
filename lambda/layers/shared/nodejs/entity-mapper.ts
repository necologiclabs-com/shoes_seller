// Entity Mappers: Convert between domain entities and DynamoDB items

import {
    Product,
    Price,
    AffiliateConfig,
    ProductItem,
    PriceItem,
    AffiliateConfigItem,
} from './types';

// Product Mappers
export function productToItem(product: Product): ProductItem {
    const productId = product.id;
    const item: ProductItem = {
        PK: `PRODUCT#${productId}`,
        SK: 'METADATA',
        GSI1PK: `BRAND#${product.brand}`,
        GSI1SK: `PRODUCT#${productId}`,
        entityType: 'product',
        name: product.name,
        modelNumber: product.modelNumber,
        brand: product.brand,
        imageUrl: product.imageUrl,
        officialUrl: product.officialUrl,
        category: product.category,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };

    // Add optional fields if present
    if (product.description !== undefined) item.description = product.description;
    if (product.officialPrice !== undefined) item.officialPrice = product.officialPrice;
    if (product.gender !== undefined) item.gender = product.gender;
    if (product.colors !== undefined) item.colors = product.colors;
    if (product.sizes !== undefined) item.sizes = product.sizes;
    if (product.variants !== undefined) item.variants = product.variants;
    if (product.inStock !== undefined) item.inStock = product.inStock;

    return item;
}

export function itemToProduct(item: ProductItem): Product {
    const productId = item.PK.replace('PRODUCT#', '');
    const product: Product = {
        id: productId,
        name: item.name || item.productName || '',  // Support both name and productName fields
        modelNumber: item.modelNumber,
        brand: item.brand,
        imageUrl: item.imageUrl,
        officialUrl: item.officialUrl,
        category: item.category,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };

    // Add optional fields if present
    if (item.description !== undefined) product.description = item.description;
    if (item.officialPrice !== undefined) product.officialPrice = item.officialPrice;
    if (item.gender !== undefined) product.gender = item.gender;
    if (item.colors !== undefined) product.colors = item.colors;
    if (item.sizes !== undefined) product.sizes = item.sizes;
    if (item.variants !== undefined) product.variants = item.variants;
    if (item.inStock !== undefined) product.inStock = item.inStock;

    return product;
}

// Price Mappers
export function priceToItem(price: Price): PriceItem {
    return {
        PK: `PRODUCT#${price.productId}`,
        SK: `PRICE#${price.platform}`,
        GSI1PK: `PLATFORM#${price.platform}`,
        GSI1SK: `UPDATED#${price.lastUpdated}`,
        entityType: 'price',
        platform: price.platform,
        price: price.price,
        availability: price.availability,
        productUrl: price.productUrl,
        lastUpdated: price.lastUpdated,
        lastChecked: price.lastChecked,
        errorMessage: price.errorMessage,
    };
}

export function itemToPrice(item: PriceItem): Price {
    const productId = item.PK.replace('PRODUCT#', '');
    return {
        productId,
        platform: item.platform,
        price: item.price,
        availability: item.availability,
        productUrl: item.productUrl,
        lastUpdated: item.lastUpdated,
        lastChecked: item.lastChecked,
        errorMessage: item.errorMessage,
    };
}

// AffiliateConfig Mappers
export function affiliateConfigToItem(config: AffiliateConfig): AffiliateConfigItem {
    return {
        PK: 'CONFIG',
        SK: `AFFILIATE#${config.platform}`,
        entityType: 'affiliateConfig',
        platform: config.platform,
        affiliateId: config.affiliateId,
        trackingTag: config.trackingTag,
        urlTemplate: config.urlTemplate,
        isActive: config.isActive,
    };
}

export function itemToAffiliateConfig(item: AffiliateConfigItem): AffiliateConfig {
    return {
        platform: item.platform,
        affiliateId: item.affiliateId,
        trackingTag: item.trackingTag,
        urlTemplate: item.urlTemplate,
        isActive: item.isActive,
    };
}
