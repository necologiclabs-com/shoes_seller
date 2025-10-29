/**
 * SyncProductsFunction
 * 
 * Periodically syncs product catalog data from Salomon official website
 * and updates DynamoDB with the latest product information including:
 * - Product details (name, description, images)
 * - Color variants
 * - Size variants
 * - Stock availability
 * 
 * Triggered by EventBridge Scheduler daily.
 */

import { ProductRepository } from '/opt/nodejs/repositories';
import { SalomonJpCatalogService, SalomonJpProduct } from '/opt/nodejs/salomon-jp-catalog-service';
import { createLogger, Logger } from '/opt/nodejs/logger';
import { randomUUID } from 'crypto';

interface SyncResult {
    productId: string;
    modelNumber: string;
    productName: string;
    success: boolean;
    isNew: boolean;
    error?: string;
}

interface SyncSummary {
    totalProducts: number;
    newProducts: number;
    updatedProducts: number;
    failedProducts: number;
    results: SyncResult[];
}

interface ExtendedProductData {
    id: string;
    name: string;
    modelNumber: string;
    brand: string;
    imageUrl: string;
    officialUrl: string;
    category: string;
    gender: 'men' | 'women' | 'unisex';
    description: string;
    officialPrice: number;
    colors: string[]; // Array of color names
    sizes: string[]; // Array of size labels
    variants: Array<{
        id: number;
        sku: string;
        color: string;
        size: string;
        price: number;
        available: boolean;
        barcode: string;
    }>;
    inStock: boolean;
    lastSynced: string;
    createdAt: string;
    updatedAt: string;
}

export const handler = async (event: { id?: string; time?: string }): Promise<SyncSummary> => {
    const logger = createLogger(event.id || 'scheduled-event', {
        source: 'SyncProductsFunction',
        trigger: 'EventBridge',
    });

    logger.info('Starting Salomon catalog sync job', {
        eventTime: event.time,
    });

    const productRepo = new ProductRepository();
    const catalogService = new SalomonJpCatalogService();

    const summary: SyncSummary = {
        totalProducts: 0,
        newProducts: 0,
        updatedProducts: 0,
        failedProducts: 0,
        results: [],
    };

    try {
        // Fetch all trail running shoes from Salomon Japan catalog
        logger.info('Fetching products from Salomon Japan catalog');
        const catalogResult = await catalogService.fetchTrailRunningShoes();

        if (!catalogResult.success || !catalogResult.products) {
            throw new Error(catalogResult.error || 'Failed to fetch products');
        }

        const catalogProducts = catalogResult.products;
        summary.totalProducts = catalogProducts.length;

        logger.info('Products retrieved from catalog', {
            productCount: catalogProducts.length,
        });

        // Process each product
        for (const catalogProduct of catalogProducts) {
            const result = await syncProduct(catalogProduct, productRepo, logger);
            summary.results.push(result);

            if (result.success) {
                if (result.isNew) {
                    summary.newProducts++;
                } else {
                    summary.updatedProducts++;
                }
            } else {
                summary.failedProducts++;
            }

            // Rate limiting between products
            await delay(500);
        }

        logger.info('Catalog sync job completed', {
            totalProducts: summary.totalProducts,
            newProducts: summary.newProducts,
            updatedProducts: summary.updatedProducts,
            failedProducts: summary.failedProducts,
        });

        return summary;
    } catch (error) {
        logger.error('Fatal error in catalog sync job', error);
        throw error;
    }
};

/**
 * Sync a single product from catalog to DynamoDB
 */
async function syncProduct(
    catalogProduct: SalomonJpProduct,
    productRepo: ProductRepository,
    logger: Logger
): Promise<SyncResult> {
    try {
        // Check if product already exists by model number
        const existingProducts = await productRepo.findAll(1000);
        const existingProduct = existingProducts.items.find(
            (p: { modelNumber: string }) => p.modelNumber === catalogProduct.modelNumber
        );

        let productId: string;
        let isNew = false;

        if (existingProduct) {
            // Update existing product
            productId = existingProduct.id;
            logger.info('Updating existing product', {
                productId,
                modelNumber: catalogProduct.modelNumber,
            });
        } else {
            // Create new product
            productId = randomUUID();
            isNew = true;
            logger.info('Creating new product', {
                productId,
                modelNumber: catalogProduct.modelNumber,
            });
        }

        // Prepare product data with extended fields
        const productData: ExtendedProductData = {
            id: productId,
            name: catalogProduct.name,
            modelNumber: catalogProduct.modelNumber,
            brand: 'Salomon',
            imageUrl: catalogProduct.imageUrl,
            officialUrl: catalogProduct.officialUrl,
            category: catalogProduct.category,
            gender: catalogProduct.gender,
            description: catalogProduct.description,
            officialPrice: catalogProduct.price,
            colors: catalogProduct.colors,
            sizes: catalogProduct.sizes,
            variants: catalogProduct.variants,
            inStock: catalogProduct.inStock,
            lastSynced: new Date().toISOString(),
            createdAt: existingProduct?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Save to DynamoDB (this will require repository update to handle extended fields)
        await saveProductWithExtendedData(productData, productRepo, logger);

        logger.info('Product synced successfully', {
            productId,
            modelNumber: catalogProduct.modelNumber,
            isNew,
        });

        return {
            productId,
            modelNumber: catalogProduct.modelNumber,
            productName: catalogProduct.name,
            success: true,
            isNew,
        };
    } catch (error) {
        logger.error('Error syncing product', {
            modelNumber: catalogProduct.modelNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
            productId: '',
            modelNumber: catalogProduct.modelNumber,
            productName: catalogProduct.name,
            success: false,
            isNew: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Save product with extended data fields
 * This is a temporary implementation until ProductRepository is updated
 */
async function saveProductWithExtendedData(
    productData: ExtendedProductData,
    productRepo: ProductRepository,
    logger: Logger
): Promise<void> {
    try {
        // Use DynamoDB client directly for now
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');

        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);

        const item = {
            PK: `PRODUCT#${productData.id}`,
            SK: 'METADATA',
            GSI1PK: `BRAND#${productData.brand}`,
            GSI1SK: `PRODUCT#${productData.id}`,
            entityType: 'product',
            name: productData.name,
            modelNumber: productData.modelNumber,
            brand: productData.brand,
            imageUrl: productData.imageUrl,
            officialUrl: productData.officialUrl,
            category: productData.category,
            gender: productData.gender,
            description: productData.description,
            officialPrice: productData.officialPrice,
            colors: productData.colors,
            sizes: productData.sizes,
            variants: productData.variants,
            inStock: productData.inStock,
            lastSynced: productData.lastSynced,
            createdAt: productData.createdAt,
            updatedAt: productData.updatedAt,
        };

        logger.info('Saving product with variants', {
            productId: productData.id,
            modelNumber: productData.modelNumber,
            variantCount: productData.variants?.length || 0,
            hasVariants: !!productData.variants && productData.variants.length > 0,
        });

        await docClient.send(
            new PutCommand({
                TableName: process.env.TABLE_NAME || 'PriceComparisonTable',
                Item: item,
            })
        );

        logger.info('Product saved with extended data', {
            productId: productData.id,
        });
    } catch (error) {
        logger.error('Error saving product with extended data', error);
        throw error;
    }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
