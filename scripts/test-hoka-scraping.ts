import axios from 'axios';
import * as cheerio from 'cheerio';

const HOKA_BASE_URL = 'https://www.hoka.com/jp';

interface HokaProduct {
    handle: string;
    title: string;
    url: string;
    gender?: 'men' | 'women' | 'unisex';
}

async function testHokaScraping() {
    console.log('🔍 Testing HOKA website structure...\n');

    try {
        // Test different possible structures
        console.log('📋 Testing HOKA API endpoints...\n');

        // Test 1: GraphQL API (common for modern e-commerce)
        console.log('Test 1: GraphQL API...');
        try {
            const graphqlResponse = await axios.post(
                `${HOKA_BASE_URL}/api/graphql`,
                {
                    query: `{ products { edges { node { id title } } } }`,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0',
                    },
                    timeout: 10000,
                }
            );
            console.log('✅ GraphQL API found!');
            console.log(JSON.stringify(graphqlResponse.data, null, 2));
        } catch {
            console.log('❌ No GraphQL API\n');
        }

        // Test 2: REST API
        console.log('Test 2: REST API endpoints...');
        const apiPaths = [
            '/api/products',
            '/api/catalog/products',
            '/api/v1/products',
            '/products.json',
            '/catalog/products.json',
        ];

        for (const path of apiPaths) {
            try {
                const response = await axios.get(`${HOKA_BASE_URL}${path}`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Accept': 'application/json',
                    },
                    timeout: 10000,
                });
                console.log(`✅ Found API at: ${path}`);
                console.log('Response keys:', Object.keys(response.data));
                break;
            } catch {
                // continue
            }
        }
        console.log('❌ No standard REST API found\n');

        // Test 3: Check HTML structure
        console.log('Test 3: Analyzing HTML structure...');
        try {
            const response = await axios.get(`${HOKA_BASE_URL}/trail-running-shoes/mens/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'text/html',
                },
                timeout: 15000,
                maxRedirects: 5,
            });

            const html = response.data;

            // Check for common e-commerce platforms
            const platforms = [
                { name: 'Shopify', pattern: /Shopify/i },
                { name: 'Magento', pattern: /Magento/i },
                { name: 'WooCommerce', pattern: /woocommerce/i },
                { name: 'Salesforce Commerce Cloud', pattern: /salesforce.*commerce/i },
                { name: 'Adobe Commerce', pattern: /adobe.*commerce/i },
                { name: 'BigCommerce', pattern: /bigcommerce/i },
                { name: 'Custom/React', pattern: /__NEXT_DATA__|__REACT_/i },
            ];

            console.log('Platform detection:');
            for (const platform of platforms) {
                if (platform.pattern.test(html)) {
                    console.log(`✅ Detected: ${platform.name}`);
                }
            }

            // Check for JSON data in HTML
            console.log('\nLooking for embedded JSON data...');
            const jsonMatches = html.match(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi);
            if (jsonMatches) {
                console.log(`✅ Found ${jsonMatches.length} JSON script tags`);

                // Try to find product data
                for (const match of jsonMatches.slice(0, 3)) {
                    try {
                        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '');
                        const data = JSON.parse(jsonContent);
                        if (data.products || data.items || data.catalog) {
                            console.log('✅ Found product data in JSON!');
                            console.log('Keys:', Object.keys(data).slice(0, 10));
                        }
                    } catch {
                        // Not parseable JSON
                    }
                }
            }

            // Look for data attributes
            console.log('\nChecking for data attributes...');
            const dataMatches = html.match(/data-product[^=]*=["']({[^"']*})["']/gi);
            if (dataMatches && dataMatches.length > 0) {
                console.log(`✅ Found ${dataMatches.length} products in data attributes`);
            }

            console.log('\n✅ HTML structure analyzed');
            console.log('\n⚠️  HOKA does not use Shopify API like Salomon.');
            console.log('⚠️  Will need custom scraping logic for HOKA.');

        } catch (htmlError) {
            console.log('❌ Could not fetch HTML:', htmlError instanceof Error ? htmlError.message : htmlError);
        }

        console.log('\n📝 Recommendation:');
        console.log('   HOKA requires different approach than Salomon.');
        console.log('   Options:');
        console.log('   1. Use web scraping with Cheerio/Puppeteer');
        console.log('   2. Investigate if HOKA has a partner API');
        console.log('   3. Start with manual data entry for popular models');

    } catch (error) {
        console.error('❌ Error during testing:', error instanceof Error ? error.message : error);
    }
} testHokaScraping().catch(console.error);
