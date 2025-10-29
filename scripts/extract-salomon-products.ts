/**
 * Extract product JSON data from Salomon JP website
 */

async function extractProductData() {
    // Shopify collections have a JSON endpoint
    const collectionUrl = 'https://salomon.jp/collections/men-shoes-trail-running';
    const jsonUrl = `${collectionUrl}?view=json`;

    console.log('Trying Shopify JSON API endpoint...\n');

    try {
        // Try JSON endpoint first
        const jsonResponse = await fetch(jsonUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
        });

        if (jsonResponse.ok) {
            const data = await jsonResponse.json();
            console.log('JSON API response:', JSON.stringify(data, null, 2).substring(0, 1000));
        }
    } catch (e) {
        console.log('JSON API not available, trying HTML scraping...\n');
    }

    // Scrape HTML page
    try {
        const response = await fetch(collectionUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'ja,en;q=0.9',
            },
        });

        const html = await response.text();

        // Extract product handles from links
        const productLinks = [...html.matchAll(/\/products\/([a-z0-9-]+)/g)];
        const uniqueHandles = [...new Set(productLinks.map(m => m[1]))];

        console.log(`\nFound ${uniqueHandles.length} unique product handles\n`);
        console.log('First 10 handles:');
        uniqueHandles.slice(0, 10).forEach(h => console.log(`  - ${h}`));

        // Fetch details for first product using Shopify product JSON endpoint
        if (uniqueHandles.length > 0) {
            const productHandle = uniqueHandles[0];
            const productJsonUrl = `https://salomon.jp/products/${productHandle}.json`;

            console.log(`\n\nFetching product details: ${productJsonUrl}\n`);

            const productResponse = await fetch(productJsonUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
            });

            if (productResponse.ok) {
                const productData = await productResponse.json();
                console.log('=== Product JSON Structure ===');
                console.log(JSON.stringify(productData, null, 2));
            } else {
                console.log(`Product JSON endpoint returned: ${productResponse.status}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

extractProductData();
