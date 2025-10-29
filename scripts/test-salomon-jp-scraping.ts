/**
 * Test script to analyze Salomon JP website structure
 * URL: https://salomon.jp/collections/men-shoes-trail-running
 */

async function testSalomonJpScraping() {
    const url = 'https://salomon.jp/collections/men-shoes-trail-running';

    console.log(`Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br',
            },
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            return;
        }

        const html = await response.text();
        console.log(`\n=== HTML Length: ${html.length} characters ===\n`);

        // Extract product links
        console.log('=== Looking for product links ===');
        const productLinkPatterns = [
            /\/products\/([^"'\s]+)/g,
            /href="([^"]*\/products\/[^"]+)"/g,
            /<a[^>]+href="([^"]*\/collections\/[^"]+\/products\/[^"]+)"/g,
        ];

        for (const pattern of productLinkPatterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
                console.log(`\nPattern ${pattern} found ${matches.length} matches:`);
                const uniqueUrls = [...new Set(matches.map(m => m[1] || m[0]))];
                console.log(uniqueUrls.slice(0, 5).join('\n'));
            }
        }

        // Look for JSON data
        console.log('\n=== Looking for JSON data ===');
        const jsonPatterns = [
            /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g,
            /<script[^>]*id="[^"]*product[^"]*"[^>]*>([\s\S]*?)<\/script>/gi,
            /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/g,
            /var\s+products\s*=\s*(\[[\s\S]*?\]);/g,
        ];

        for (const pattern of jsonPatterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
                console.log(`\nPattern found ${matches.length} JSON blocks`);
                for (let i = 0; i < Math.min(matches.length, 2); i++) {
                    const jsonStr = matches[i][1] || matches[i][0];
                    console.log(`\nJSON block ${i + 1} (first 500 chars):`);
                    console.log(jsonStr.substring(0, 500));
                }
            }
        }

        // Look for product cards/items
        console.log('\n=== Looking for product cards ===');
        const cardPatterns = [
            /<div[^>]*class="[^"]*product[^"]*"[^>]*>/gi,
            /<article[^>]*class="[^"]*product[^"]*"[^>]*>/gi,
            /<li[^>]*class="[^"]*product[^"]*"[^>]*>/gi,
        ];

        for (const pattern of cardPatterns) {
            const matches = [...html.matchAll(pattern)];
            if (matches.length > 0) {
                console.log(`\nPattern ${pattern} found ${matches.length} product cards`);
                console.log('First card HTML (first 300 chars):');
                console.log(matches[0][0].substring(0, 300));
            }
        }

        // Save a sample of HTML for manual inspection
        const sampleHtml = html.substring(0, 5000);
        console.log('\n=== First 5000 characters of HTML ===');
        console.log(sampleHtml);

    } catch (error) {
        console.error('Error:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
    }
}

// Run the test
testSalomonJpScraping().catch(console.error);
