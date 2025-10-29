/**
 * UpdatePricesFunction
 * 
 * Periodically fetches prices from all platforms for all products
 * and updates DynamoDB with the latest price data.
 * 
 * Triggered by EventBridge Scheduler every 6 hours.
 */

import { Handler } from 'aws-lambda';
import { ProductRepository, PriceRepository } from '/opt/nodejs/repositories';
import { fetchAllPrices } from '/opt/nodejs/price-services';
import { Product, Price, Platform } from '/opt/nodejs/types';
import { createLogger, Logger } from '/opt/nodejs/logger';

interface UpdateResult {
    productId: string;
    productName: string;
    success: boolean;
    platformResults: Record<Platform, PlatformUpdateResult>;
}

interface PlatformUpdateResult {
    success: boolean;
    error?: string;
}

interface UpdateSummary {
    totalProducts: number;
    successfulProducts: number;
    failedProducts: number;
    results: UpdateResult[];
}

export const handler: Handler = async (event): Promise<UpdateSummary> => {
    const logger = createLogger(event.id || 'scheduled-event', {
        source: 'UpdatePricesFunction',
        trigger: 'EventBridge',
    });

    logger.info('Starting price update job', {
        eventTime: event.time,
    });

    const productRepo = new ProductRepository();
    const priceRepo = new PriceRepository();

    const summary: UpdateSummary = {
        totalProducts: 0,
        successfulProducts: 0,
        failedProducts: 0,
        results: [],
    };

    try {
        // Fetch all products from DynamoDB
        const products = await getAllProducts(productRepo, logger);
        summary.totalProducts = products.length;

        logger.info('Products retrieved for update', {
            productCount: products.length,
        });

        // Process each product
        for (const product of products) {
            const result = await updateProductPrices(product, priceRepo, logger);
            summary.results.push(result);

            if (result.success) {
                summary.successfulProducts++;
            } else {
                summary.failedProducts++;
            }
        }

        logger.info('Price update job completed', {
            totalProducts: summary.totalProducts,
            successfulProducts: summary.successfulProducts,
            failedProducts: summary.failedProducts,
        });

        return summary;
    } catch (error) {
        logger.error('Fatal error in price update job', error);
        throw error;
    }
};

/**
 * Fetch all products from DynamoDB with pagination
 */
async function getAllProducts(productRepo: ProductRepository, logger: Logger): Promise<Product[]> {
    const products: Product[] = [];
    let lastKey: Record<string, any> | undefined;
    let pageCount = 0;

    do {
        const result = await productRepo.findAll(100, lastKey);
        products.push(...result.items);
        lastKey = result.lastEvaluatedKey;
        pageCount++;

        logger.debug('Fetched product page', {
            pageNumber: pageCount,
            itemsInPage: result.items.length,
            hasMore: !!lastKey,
        });
    } while (lastKey);

    return products;
}

/**
 * Update prices for a single product across all platforms
 */
async function updateProductPrices(
    product: Product,
    priceRepo: PriceRepository,
    logger: Logger
): Promise<UpdateResult> {
    const productLogger = logger.addContext({
        productId: product.id,
        productName: product.name,
    });

    productLogger.info('Starting price update for product');

    const result: UpdateResult = {
        productId: product.id,
        productName: product.name,
        success: true,
        platformResults: {} as Record<Platform, PlatformUpdateResult>,
    };

    try {
        // Fetch prices from all platforms in parallel
        const priceData = await fetchAllPrices(product.name, product.modelNumber);

        const platforms: Platform[] = ['amazon', 'rakuten', 'yodobashi', 'mercari'];

        // 画像URLを取得（製品に画像がない場合）
        let productImageUrl: string | undefined = product.imageUrl;
        if (!productImageUrl) {
            // 各プラットフォームから画像URLを探す（優先順位: Amazon > Rakuten）
            productImageUrl = priceData.amazon?.imageUrl || priceData.rakuten?.imageUrl;

            if (productImageUrl) {
                productLogger.info('Product image URL found from price service', {
                    imageUrl: productImageUrl,
                    source: priceData.amazon?.imageUrl ? 'amazon' : 'rakuten'
                });

                // 製品の画像URLを更新
                try {
                    const productRepo = new ProductRepository();
                    await productRepo.update(product.id, { imageUrl: productImageUrl });
                    productLogger.info('Product image URL updated successfully');
                } catch (error) {
                    productLogger.error('Failed to update product image URL', error);
                }
            }
        }

        // Update DynamoDB for each platform
        await Promise.allSettled(
            platforms.map(async (platform) => {
                try {
                    const platformData = priceData[platform];
                    const now = new Date().toISOString();

                    const price: Price = {
                        productId: product.id,
                        platform,
                        price: platformData.price,
                        availability: platformData.availability,
                        productUrl: platformData.productUrl,
                        lastUpdated: now,
                        lastChecked: now,
                        errorMessage: platformData.errorMessage,
                    };

                    await priceRepo.save(price);

                    result.platformResults[platform] = {
                        success: true,
                    };

                    productLogger.info('Platform price updated successfully', {
                        platform,
                        price: platformData.price,
                        availability: platformData.availability,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.platformResults[platform] = {
                        success: false,
                        error: errorMessage,
                    };
                    result.success = false;

                    productLogger.error('Failed to update platform price', {
                        platform,
                        error: errorMessage,
                    });
                }
            })
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.success = false;

        // Mark all platforms as failed
        const platforms: Platform[] = ['amazon', 'rakuten', 'yodobashi', 'mercari'];
        platforms.forEach((platform) => {
            result.platformResults[platform] = {
                success: false,
                error: errorMessage,
            };
        });

        productLogger.error('Failed to fetch prices for product', error);
    }

    return result;
}
