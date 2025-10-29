import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductRepository } from '/opt/nodejs/repositories';
import { createLogger } from '/opt/nodejs/logger';

const productRepository = new ProductRepository();

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const logger = createLogger(event.requestContext.requestId, {
        path: event.path,
        httpMethod: event.httpMethod,
    });

    const productId = event.pathParameters?.productId;

    logger.info('GetProductDetail invoked', { productId });

    try {
        if (!productId) {
            logger.warn('Product ID missing in request');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
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

        // Retrieve product from DynamoDB
        const product = await productRepository.findById(productId);

        if (!product) {
            logger.info('Product not found', { productId });
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'PRODUCT_NOT_FOUND',
                        message: `Product with ID '${productId}' not found`,
                    },
                }),
            };
        }

        logger.info('Product retrieved successfully', { productId });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                product,
            }),
        };
    } catch (error) {
        logger.error('Error in GetProductDetail', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An error occurred while fetching product details',
                    details: error instanceof Error ? error.message : 'Unknown error',
                },
            }),
        };
    }
};
