import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PriceRepository, ProductRepository } from '/opt/nodejs/repositories';
import { Price, Platform } from '/opt/nodejs/types';
import { getAffiliateConfig } from '/opt/nodejs/affiliate-config';
import { generateAffiliateUrl } from '/opt/nodejs/affiliate-utils';
import { createLogger } from '/opt/nodejs/logger';

interface PriceData {
    platform: string;
    price: number | null;
    availability: string;
    productUrl: string;
    affiliateUrl: string;
    lastUpdated: string;
}

interface PricesResponse {
    productId: string;
    prices: PriceData[];
    lastUpdated: string;
}

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const logger = createLogger(event.requestContext.requestId, {
        path: event.path,
        httpMethod: event.httpMethod,
    });

    const productId = event.pathParameters?.productId;

    logger.info('GetPrices invoked', { productId });

    try {
        if (!productId) {
            logger.warn('Product ID missing in request');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'Product ID is required',
                    },
                }),
            };
        }

        // Verify product exists
        const productRepository = new ProductRepository();
        const product = await productRepository.findById(productId);

        if (!product) {
            logger.info('Product not found', { productId });
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'PRODUCT_NOT_FOUND',
                        message: `Product with ID ${productId} not found`,
                    },
                }),
            };
        }

        // Fetch all prices for the product
        const priceRepository = new PriceRepository();
        const prices = await priceRepository.findByProductId(productId);

        logger.info('Prices retrieved', {
            productId,
            priceCount: prices.length,
        });

        // Format prices for response with affiliate URLs
        const formattedPrices: PriceData[] = await Promise.all(
            prices.map(async (price: Price) => {
                // Get affiliate configuration for this platform
                const affiliateConfig = await getAffiliateConfig(price.platform as Platform);

                // Generate affiliate URL if config exists
                const affiliateUrl = affiliateConfig
                    ? generateAffiliateUrl(
                        price.platform as Platform,
                        price.productUrl,
                        affiliateConfig
                    )
                    : price.productUrl;

                return {
                    platform: price.platform,
                    price: price.price,
                    availability: price.availability,
                    productUrl: price.productUrl,
                    affiliateUrl,
                    lastUpdated: price.lastUpdated,
                };
            })
        );

        // Calculate the most recent update timestamp
        const lastUpdated = prices.length > 0
            ? prices.reduce((latest: string, price: Price) => {
                return price.lastUpdated > latest ? price.lastUpdated : latest;
            }, prices[0].lastUpdated)
            : new Date().toISOString();

        const response: PricesResponse = {
            productId,
            prices: formattedPrices,
            lastUpdated,
        };

        logger.info('Prices response prepared', {
            productId,
            platformCount: formattedPrices.length,
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
    } catch (error) {
        logger.error('Error in GetPrices', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An error occurred while fetching prices',
                    details: error instanceof Error ? error.message : 'Unknown error',
                },
            }),
        };
    }
};
