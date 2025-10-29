/**
 * Test the new Salomon JP Catalog Service
 */

import { SalomonJpCatalogService } from '../lambda/layers/shared/nodejs/salomon-jp-catalog-service';

async function testService() {
    console.log('=== Testing Salomon JP Catalog Service ===\n');

    const service = new SalomonJpCatalogService();

    try {
        console.log('Fetching trail running shoes from salomon.jp...\n');
        const result = await service.fetchTrailRunningShoes();

        if (!result.success) {
            console.error('Failed to fetch products:', result.error);
            return;
        }

        const products = result.products || [];
        console.log(`✅ Successfully fetched ${products.length} products\n`);

        // Display first 3 products
        for (let i = 0; i < Math.min(3, products.length); i++) {
            const p = products[i];
            console.log(`\n=== Product ${i + 1} ===`);
            console.log(`Model: ${p.modelNumber}`);
            console.log(`Name: ${p.name}`);
            console.log(`Price: ¥${p.price.toLocaleString()}`);
            console.log(`In Stock: ${p.inStock ? 'Yes' : 'No'}`);
            console.log(`Colors: ${p.colors.join(', ')}`);
            console.log(`Sizes: ${p.sizes.join(', ')}`);
            console.log(`Variants: ${p.variants.length}`);
            console.log(`URL: ${p.officialUrl}`);
            console.log(`Description: ${p.description.substring(0, 100)}...`);

            if (p.variants.length > 0) {
                console.log(`\nFirst 3 variants:`);
                for (let j = 0; j < Math.min(3, p.variants.length); j++) {
                    const v = p.variants[j];
                    console.log(`  - ${v.color} / ${v.size}: ¥${v.price.toLocaleString()} (${v.available ? '在庫あり' : '在庫なし'}) - SKU: ${v.sku}`);
                }
            }
        }

        // Summary statistics
        console.log('\n\n=== Summary ===');
        console.log(`Total products: ${products.length}`);
        console.log(`Products in stock: ${products.filter(p => p.inStock).length}`);
        console.log(`Unique colors: ${[...new Set(products.flatMap(p => p.colors))].length}`);
        console.log(`Total variants: ${products.reduce((sum, p) => sum + p.variants.length, 0)}`);

        const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
        console.log(`Average price: ¥${Math.round(avgPrice).toLocaleString()}`);

    } catch (error) {
        console.error('Error testing service:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
    }
}

testService();
