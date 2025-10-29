/**
 * Price Service Integrations
 * 
 * This module provides price fetching services for different e-commerce platforms.
 * Each service implements error handling, retry logic, and returns standardized results.
 */

export { AmazonPriceService, PriceServiceResult } from './amazon-service';
export { RakutenPriceService } from './rakuten-service';
export { YodobashiPriceService, YodobashiPuppeteerService } from './yodobashi-service';
export { MercariPriceService } from './mercari-service';

import { AmazonPriceService } from './amazon-service';
import { RakutenPriceService } from './rakuten-service';
import { YodobashiPriceService } from './yodobashi-service';
import { MercariPriceService } from './mercari-service';
import { Platform } from '../types';
import { PriceServiceResult } from './amazon-service';

/**
 * Factory function to get the appropriate price service for a platform
 */
export function getPriceService(platform: Platform, config?: any): PriceServiceInterface {
    switch (platform) {
        case 'amazon':
            return new AmazonPriceService(config?.amazon);
        case 'rakuten':
            return new RakutenPriceService(config?.rakuten);
        case 'yodobashi':
            return new YodobashiPriceService();
        case 'mercari':
            return new MercariPriceService();
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}

/**
 * Common interface for all price services
 */
export interface PriceServiceInterface {
    fetchPrice(productName: string, modelNumber: string): Promise<PriceServiceResult>;
}

/**
 * Fetch prices from all platforms in parallel
 */
export async function fetchAllPrices(
    productName: string,
    modelNumber: string,
    config?: any
): Promise<Record<Platform, PriceServiceResult>> {
    const platforms: Platform[] = ['amazon', 'rakuten', 'yodobashi', 'mercari'];

    const results = await Promise.allSettled(
        platforms.map(async (platform) => {
            const service = getPriceService(platform, config);
            const result = await service.fetchPrice(productName, modelNumber);
            return { platform, result };
        })
    );

    const priceData: Record<string, PriceServiceResult> = {};

    results.forEach((result, index) => {
        const platform = platforms[index];

        if (result.status === 'fulfilled') {
            priceData[platform] = result.value.result;
        } else {
            // If service failed, return error result
            priceData[platform] = {
                platform,
                price: null,
                availability: 'not_found',
                productUrl: '',
                errorMessage: result.reason?.message || 'Service failed'
            };
        }
    });

    return priceData as Record<Platform, PriceServiceResult>;
}
