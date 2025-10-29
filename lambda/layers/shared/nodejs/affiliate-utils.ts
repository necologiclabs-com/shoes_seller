import { Platform } from './types';

export interface AffiliateLinkConfig {
    affiliateId: string;
    trackingTag?: string;
}

/**
 * Generate Amazon affiliate URL
 * Format: https://www.amazon.co.jp/dp/{ASIN}?tag={affiliateId}
 */
export function generateAmazonAffiliateUrl(
    productUrl: string,
    config: AffiliateLinkConfig
): string {
    try {
        const url = new URL(productUrl);

        // Add affiliate tag as query parameter
        url.searchParams.set('tag', config.affiliateId);

        return url.toString();
    } catch (error) {
        console.error('Error generating Amazon affiliate URL:', error);
        return productUrl;
    }
}

/**
 * Generate Rakuten affiliate URL
 * Format: https://hb.afl.rakuten.co.jp/hgc/{affiliateId}/?pc={productUrl}
 */
export function generateRakutenAffiliateUrl(
    productUrl: string,
    config: AffiliateLinkConfig
): string {
    try {
        const encodedUrl = encodeURIComponent(productUrl);
        return `https://hb.afl.rakuten.co.jp/hgc/${config.affiliateId}/?pc=${encodedUrl}`;
    } catch (error) {
        console.error('Error generating Rakuten affiliate URL:', error);
        return productUrl;
    }
}

/**
 * Generate Yodobashi affiliate URL
 * Format: https://www.yodobashi.com/?word={productUrl}&affiliate_id={affiliateId}
 */
export function generateYodobashiAffiliateUrl(
    productUrl: string,
    config: AffiliateLinkConfig
): string {
    try {
        const url = new URL(productUrl);

        // Add affiliate ID as query parameter
        url.searchParams.set('affiliate_id', config.affiliateId);

        return url.toString();
    } catch (error) {
        console.error('Error generating Yodobashi affiliate URL:', error);
        return productUrl;
    }
}

/**
 * Generate Mercari affiliate URL
 * Format: https://mercari.com/jp/items/{itemId}?afid={affiliateId}
 */
export function generateMercariAffiliateUrl(
    productUrl: string,
    config: AffiliateLinkConfig
): string {
    try {
        const url = new URL(productUrl);

        // Add affiliate ID as query parameter
        url.searchParams.set('afid', config.affiliateId);

        return url.toString();
    } catch (error) {
        console.error('Error generating Mercari affiliate URL:', error);
        return productUrl;
    }
}

/**
 * Generate affiliate URL for any platform
 */
export function generateAffiliateUrl(
    platform: Platform,
    productUrl: string,
    config: AffiliateLinkConfig
): string {
    if (!config.affiliateId) {
        return productUrl;
    }

    switch (platform) {
        case 'amazon':
            return generateAmazonAffiliateUrl(productUrl, config);
        case 'rakuten':
            return generateRakutenAffiliateUrl(productUrl, config);
        case 'yodobashi':
            return generateYodobashiAffiliateUrl(productUrl, config);
        case 'mercari':
            return generateMercariAffiliateUrl(productUrl, config);
        default:
            console.warn(`Unknown platform: ${platform}`);
            return productUrl;
    }
}
