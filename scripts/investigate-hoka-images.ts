/**
 * HOKA製品ページのHTMLを取得して画像URLパターンを調査
 * 
 * Puppeteerを使ってブラウザ経由でアクセスし、
 * 実際にレンダリングされた画像URLを取得します。
 */

import axios from 'axios';
import { writeFileSync } from 'fs';
import { join } from 'path';

const products = [
    {
        name: 'Speedgoat 5 (Men)',
        url: 'https://www.hoka.com/en/us/mens-trail/speedgoat-5/195719270445.html',
    },
    {
        name: 'Speedgoat 5 (Women)',
        url: 'https://www.hoka.com/en/us/womens-trail/speedgoat-5/195719270605.html',
    },
    {
        name: 'Tecton X 2',
        url: 'https://www.hoka.com/en/us/mens-trail/tecton-x-2/195719757892.html',
    },
    {
        name: 'Zinal',
        url: 'https://www.hoka.com/en/us/mens-trail/zinal/195719270063.html',
    },
];

async function fetchProductPage(url: string): Promise<string | null> {
    try {
        console.log(`📥 Fetching: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
            },
            timeout: 30000,
        });

        console.log(`✅ Status: ${response.status}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`❌ HTTP Error: ${error.response?.status} - ${error.message}`);
        } else {
            console.error(`❌ Error:`, error);
        }
        return null;
    }
}

function extractImageUrls(html: string): string[] {
    const imageUrls: string[] = [];

    // さまざまなパターンで画像URLを抽出
    const patterns = [
        // <img src="..." >
        /<img[^>]+src=["']([^"']+)["']/gi,
        // data-src="..."
        /data-src=["']([^"']+)["']/gi,
        // srcset="..."
        /srcset=["']([^"']+)["']/gi,
        // JSON内のURL
        /"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))"/gi,
    ];

    patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const url = match[1];
            if (url && url.includes('hoka') && /\.(jpg|jpeg|png|webp)/i.test(url)) {
                imageUrls.push(url);
            }
        }
    });

    return [...new Set(imageUrls)]; // 重複削除
}

async function main() {
    console.log('🔍 Investigating HOKA product image URLs...\n');

    for (const product of products) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📦 ${product.name}`);
        console.log(`🔗 ${product.url}`);
        console.log('='.repeat(70));

        const html = await fetchProductPage(product.url);

        if (html) {
            const imageUrls = extractImageUrls(html);

            if (imageUrls.length > 0) {
                console.log(`\n📸 Found ${imageUrls.length} image URLs:`);
                imageUrls.forEach((url, index) => {
                    console.log(`   ${index + 1}. ${url}`);
                });

                // HTMLをファイルに保存（デバッグ用）
                const filename = product.name.toLowerCase().replace(/\s+/g, '-') + '.html';
                const filepath = join(__dirname, 'images', 'hoka', filename);
                writeFileSync(filepath, html, 'utf-8');
                console.log(`\n💾 Saved HTML to: ${filepath}`);
            } else {
                console.log('\n❌ No image URLs found');
            }
        }

        // レート制限
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Investigation completed!');
    console.log('='.repeat(70));
    console.log('\n📝 Next steps:');
    console.log('1. Review the extracted URLs above');
    console.log('2. Manually download images from HOKA website');
    console.log('3. Save them to scripts/images/hoka/');
    console.log('4. Run: npx ts-node scripts/upload-local-hoka-images.ts');
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
