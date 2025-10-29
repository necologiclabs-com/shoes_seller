import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { Platform } from './types';
import { AffiliateLinkConfig } from './affiliate-utils';

const ssmClient = new SSMClient({});

// Cache for affiliate configurations
interface ConfigCache {
    [platform: string]: {
        config: AffiliateLinkConfig;
        timestamp: number;
    };
}

const configCache: ConfigCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get affiliate configuration for a specific platform from Parameter Store
 */
export async function getAffiliateConfig(platform: Platform): Promise<AffiliateLinkConfig | null> {
    // Check cache first
    const cached = configCache[platform];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log(`Using cached affiliate config for ${platform}`);
        return cached.config;
    }

    try {
        const parameterName = `/price-comparison/affiliate/${platform}/id`;

        const command = new GetParameterCommand({
            Name: parameterName,
            WithDecryption: true,
        });

        const response = await ssmClient.send(command);

        if (!response.Parameter?.Value) {
            console.warn(`No affiliate config found for ${platform}`);
            return null;
        }

        const config: AffiliateLinkConfig = {
            affiliateId: response.Parameter.Value,
        };

        // Try to get tracking tag if it exists
        try {
            const trackingTagParam = `/price-comparison/affiliate/${platform}/tracking-tag`;
            const trackingCommand = new GetParameterCommand({
                Name: trackingTagParam,
                WithDecryption: true,
            });
            const trackingResponse = await ssmClient.send(trackingCommand);

            if (trackingResponse.Parameter?.Value) {
                config.trackingTag = trackingResponse.Parameter.Value;
            }
        } catch (error) {
            // Tracking tag is optional, continue without it
            console.log(`No tracking tag found for ${platform}`);
        }

        // Cache the configuration
        configCache[platform] = {
            config,
            timestamp: Date.now(),
        };

        console.log(`Loaded affiliate config for ${platform}`);
        return config;
    } catch (error) {
        console.error(`Error loading affiliate config for ${platform}:`, error);
        return null;
    }
}

/**
 * Get all affiliate configurations from Parameter Store
 */
export async function getAllAffiliateConfigs(): Promise<Map<Platform, AffiliateLinkConfig>> {
    const configs = new Map<Platform, AffiliateLinkConfig>();

    try {
        const command = new GetParametersByPathCommand({
            Path: '/price-comparison/affiliate/',
            Recursive: true,
            WithDecryption: true,
        });

        const response = await ssmClient.send(command);

        if (!response.Parameters) {
            console.warn('No affiliate configurations found');
            return configs;
        }

        // Parse parameters and group by platform
        const platformConfigs: { [key: string]: Partial<AffiliateLinkConfig> } = {};

        for (const param of response.Parameters) {
            if (!param.Name || !param.Value) continue;

            // Extract platform and config type from parameter name
            // Format: /price-comparison/affiliate/{platform}/{type}
            const parts = param.Name.split('/');
            if (parts.length < 5) continue;

            const platform = parts[4] as Platform;
            const configType = parts[5];

            if (!platformConfigs[platform]) {
                platformConfigs[platform] = {};
            }

            if (configType === 'id') {
                platformConfigs[platform].affiliateId = param.Value;
            } else if (configType === 'tracking-tag') {
                platformConfigs[platform].trackingTag = param.Value;
            }
        }

        // Convert to Map and cache
        for (const [platform, config] of Object.entries(platformConfigs)) {
            if (config.affiliateId) {
                const affiliateConfig: AffiliateLinkConfig = {
                    affiliateId: config.affiliateId,
                    trackingTag: config.trackingTag,
                };

                configs.set(platform as Platform, affiliateConfig);

                // Cache the configuration
                configCache[platform] = {
                    config: affiliateConfig,
                    timestamp: Date.now(),
                };
            }
        }

        console.log(`Loaded ${configs.size} affiliate configurations`);
        return configs;
    } catch (error) {
        console.error('Error loading all affiliate configs:', error);
        return configs;
    }
}

/**
 * Clear the configuration cache (useful for testing)
 */
export function clearConfigCache(): void {
    Object.keys(configCache).forEach(key => delete configCache[key]);
}
