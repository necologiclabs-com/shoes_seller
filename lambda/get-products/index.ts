import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductRepository } from '/opt/nodejs/repositories';
import { Product } from '/opt/nodejs/types';
import { createLogger } from '/opt/nodejs/logger';

const productRepository = new ProductRepository();

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const logger = createLogger(event.requestContext.requestId, {
        path: event.path,
        httpMethod: event.httpMethod,
    });

    logger.info('GetProducts invoked', {
        queryStringParameters: event.queryStringParameters,
    });

    try {
        const brand = event.queryStringParameters?.brand;
        const category = event.queryStringParameters?.category;
        const limit = event.queryStringParameters?.limit
            ? parseInt(event.queryStringParameters.limit, 10)
            : 200; // 全ブランドの製品を取得できるように増やす
        const nextToken = event.queryStringParameters?.nextToken;

        // Decode nextToken if provided
        let lastKey: Record<string, any> | undefined;
        if (nextToken) {
            try {
                lastKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
            } catch (error) {
                logger.error('Invalid nextToken provided', error);
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: {
                            code: 'INVALID_TOKEN',
                            message: 'Invalid pagination token',
                        },
                    }),
                };
            }
        }

        // Query products based on filters
        let result;
        if (brand) {
            // Query by brand using GSI1
            result = await productRepository.findByBrand(brand, limit, lastKey);

            // Apply category filter if provided
            if (category) {
                result.items = result.items.filter((product: Product) => product.category === category);
            }
        } else {
            // Scan all products
            result = await productRepository.findAll(limit, lastKey);

            // Apply category filter if provided
            if (category) {
                result.items = result.items.filter((product: Product) => product.category === category);
            }
        }

        // Encode lastEvaluatedKey as nextToken
        const responseNextToken = result.lastEvaluatedKey
            ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
            : undefined;

        logger.info('Products retrieved successfully', {
            count: result.items.length,
            hasMore: !!responseNextToken,
            brand,
            category,
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                products: result.items,
                nextToken: responseNextToken,
            }),
        };
    } catch (error) {
        logger.error('Error in GetProducts', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An error occurred while fetching products',
                    details: error instanceof Error ? error.message : 'Unknown error',
                },
            }),
        };
    }
};
