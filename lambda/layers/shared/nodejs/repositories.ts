// Repository Layer: High-level data access functions

import {
    Product,
    Price,
    AffiliateConfig,
    ProductItem,
    PriceItem,
    AffiliateConfigItem,
    Platform,
} from './types';
import {
    productToItem,
    itemToProduct,
    priceToItem,
    itemToPrice,
    affiliateConfigToItem,
    itemToAffiliateConfig,
} from './entity-mapper';
import { putItem, getItem, queryItems, scanItems, QueryResult } from './dynamodb-client';

// Product Repository
export class ProductRepository {
    async save(product: Product): Promise<void> {
        const item = productToItem(product);
        await putItem(item);
    }

    async findById(productId: string): Promise<Product | null> {
        const item = await getItem<ProductItem>(`PRODUCT#${productId}`, 'METADATA');
        return item ? itemToProduct(item) : null;
    }

    async findAll(limit?: number, lastKey?: Record<string, any>): Promise<QueryResult<Product>> {
        const result = await scanItems<ProductItem>({
            filterExpression: '#entityType = :entityType',
            expressionAttributeNames: {
                '#entityType': 'entityType',
            },
            expressionAttributeValues: {
                ':entityType': 'product',
            },
            limit,
            exclusiveStartKey: lastKey,
        });

        return {
            items: result.items.map(itemToProduct),
            lastEvaluatedKey: result.lastEvaluatedKey,
        };
    }

    async findByBrand(
        brand: string,
        limit?: number,
        lastKey?: Record<string, any>
    ): Promise<QueryResult<Product>> {
        const result = await queryItems<ProductItem>(
            '#GSI1PK = :brandKey',
            {
                '#GSI1PK': 'GSI1PK',
            },
            {
                ':brandKey': `BRAND#${brand}`,
            },
            {
                indexName: 'GSI1',
                limit,
                exclusiveStartKey: lastKey,
            }
        );

        return {
            items: result.items.map(itemToProduct),
            lastEvaluatedKey: result.lastEvaluatedKey,
        };
    }
}

// Price Repository
export class PriceRepository {
    async save(price: Price): Promise<void> {
        const item = priceToItem(price);
        await putItem(item);
    }

    async findByProductId(productId: string): Promise<Price[]> {
        const result = await queryItems<PriceItem>(
            '#PK = :productKey AND begins_with(#SK, :pricePrefix)',
            {
                '#PK': 'PK',
                '#SK': 'SK',
            },
            {
                ':productKey': `PRODUCT#${productId}`,
                ':pricePrefix': 'PRICE#',
            }
        );

        return result.items.map(itemToPrice);
    }

    async findByProductIdAndPlatform(
        productId: string,
        platform: Platform
    ): Promise<Price | null> {
        const item = await getItem<PriceItem>(`PRODUCT#${productId}`, `PRICE#${platform}`);
        return item ? itemToPrice(item) : null;
    }

    async findByPlatform(
        platform: Platform,
        limit?: number,
        lastKey?: Record<string, any>
    ): Promise<QueryResult<Price>> {
        const result = await queryItems<PriceItem>(
            '#GSI1PK = :platformKey',
            {
                '#GSI1PK': 'GSI1PK',
            },
            {
                ':platformKey': `PLATFORM#${platform}`,
            },
            {
                indexName: 'GSI1',
                limit,
                exclusiveStartKey: lastKey,
            }
        );

        return {
            items: result.items.map(itemToPrice),
            lastEvaluatedKey: result.lastEvaluatedKey,
        };
    }

    async findStalePrices(
        platform: Platform,
        beforeTimestamp: string
    ): Promise<Price[]> {
        const result = await queryItems<PriceItem>(
            '#GSI1PK = :platformKey AND #GSI1SK < :timestamp',
            {
                '#GSI1PK': 'GSI1PK',
                '#GSI1SK': 'GSI1SK',
            },
            {
                ':platformKey': `PLATFORM#${platform}`,
                ':timestamp': `UPDATED#${beforeTimestamp}`,
            },
            {
                indexName: 'GSI1',
            }
        );

        return result.items.map(itemToPrice);
    }
}

// AffiliateConfig Repository
export class AffiliateConfigRepository {
    async save(config: AffiliateConfig): Promise<void> {
        const item = affiliateConfigToItem(config);
        await putItem(item);
    }

    async findByPlatform(platform: Platform): Promise<AffiliateConfig | null> {
        const item = await getItem<AffiliateConfigItem>('CONFIG', `AFFILIATE#${platform}`);
        return item ? itemToAffiliateConfig(item) : null;
    }

    async findAll(): Promise<AffiliateConfig[]> {
        const result = await queryItems<AffiliateConfigItem>(
            '#PK = :configKey AND begins_with(#SK, :affiliatePrefix)',
            {
                '#PK': 'PK',
                '#SK': 'SK',
            },
            {
                ':configKey': 'CONFIG',
                ':affiliatePrefix': 'AFFILIATE#',
            }
        );

        return result.items.map(itemToAffiliateConfig);
    }

    async findActive(): Promise<AffiliateConfig[]> {
        const all = await this.findAll();
        return all.filter((config) => config.isActive);
    }
}
