/**
 * Puppeteerを使ってHOKA公式サイトから画像を自動取得
 * ヘッドレスブラウザでアクセスすることでbot検出を回避
 */

import puppeteer from 'puppeteer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { createHash } from 'crypto';

// グローバルエラーハンドラ
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});
// AWS設定
const AWS_PROFILE = process.env.AWS_PROFILE || 'hikaku-dev';
const AWS_REGION = 'ap-northeast-1';
const TABLE_NAME = 'PriceComparisonTable';
const IMAGES_BUCKET_NAME = `price-comparison-images-${process.env.AWS_ACCOUNT || '533267394861'}`;

// DynamoDB初期化
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// S3初期化
const s3Client = new S3Client({ region: AWS_REGION });

interface ProductMapping {
    productId: string;
    name: string;
    url: string;
}

// HOKA製品のマッピング
const products: ProductMapping[] = [
    {
        productId: 'HOKA-SPEEDGOAT5',
        name: 'Speedgoat 5 (Men)',
        url: 'https://www.hoka.com/en/us/mens-trail/speedgoat-5/195719270445.html',
    },
    {
        productId: 'HOKA-SPEEDGOAT5W',
        name: 'Speedgoat 5 (Women)',
        url: 'https://www.hoka.com/en/us/womens-trail/speedgoat-5/195719270605.html',
    },
    {
        productId: 'HOKA-TECTON-X2',
        name: 'Tecton X 2',
        url: 'https://www.hoka.com/en/us/mens-trail/tecton-x-2/195719757892.html',
    },
    {
        productId: 'HOKA-ZINAL',
        name: 'Zinal',
        url: 'https://www.hoka.com/en/us/mens-trail/zinal/195719270063.html',
    },
];

/**
 * Puppeteerでページにアクセスして画像URLを取得
 */
async function getImageUrlFromPage(url: string): Promise<string | null> {
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({
        headless: true, // ヘッドレスモード（UIなし）
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
        ],
    });
    console.log('✅ Browser launched successfully');

    try {
        console.log('📄 Creating new page...');
        const page = await browser.newPage();
        console.log('✅ New page created');

        // User-Agentを設定（通常のブラウザに偽装）
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // ビューポートを設定
        await page.setViewport({ width: 1920, height: 1080 });

        console.log(`📄 Loading page: ${url}`);

        // ページを読み込み（DOMコンテンツがロードされるまで待機）
        try {
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 90000,
            });
            console.log('✅ Page loaded (DOM ready)');

            // 追加で5秒待機（JavaScriptが画像をレンダリングする時間）
            console.log('⏳ Waiting 5 seconds for images to load...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('✅ Additional wait complete');
        } catch (navError) {
            console.error('❌ Navigation error:', navError instanceof Error ? navError.message : navError);
            console.error('Error stack:', navError instanceof Error ? navError.stack : 'N/A');
            // スクリーンショットを撮って状況確認
            try {
                await page.screenshot({ path: 'debug-navigation-error.png' });
                console.log('📸 Screenshot saved to debug-navigation-error.png');
            } catch (screenshotError) {
                console.error('Failed to take screenshot:', screenshotError);
            }
            throw navError;
        }

        // 少し待機（画像の遅延読み込み対策） - この行は削除
        // await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🔍 Searching for image...');

        // メイン画像を取得（このコードはブラウザ内で実行される）
        const imageUrl: string | null = await page.evaluate((selectorList) => {
            type BrowserImage = {
                src?: string;
                srcset?: string;
                naturalWidth?: number;
            };

            const doc = (globalThis as unknown as {
                document?: {
                    querySelector: (selector: string) => BrowserImage | null;
                    querySelectorAll: (selector: string) => ArrayLike<BrowserImage>;
                };
            }).document;
            if (!doc) {
                return null;
            }

            const selectors = selectorList;
            for (const selector of selectors) {
                const img = doc.querySelector(selector);
                if (img?.src?.startsWith('http')) {
                    if (typeof img.srcset === 'string') {
                        const urls = img.srcset
                            .split(',')
                            .map((entry) => entry.trim().split(' ')[0])
                            .filter(Boolean);
                        if (urls.length > 0) {
                            return urls[urls.length - 1];
                        }
                    }

                    return img.src;
                }
            }

            const allImages = doc.querySelectorAll('img');
            const validImages = Array.from(allImages)
                .filter((candidate) => candidate?.src?.startsWith('http'))
                .filter((candidate) => Number(candidate?.naturalWidth ?? 0) > 400)
                .sort((a, b) => Number(b?.naturalWidth ?? 0) - Number(a?.naturalWidth ?? 0));

            const fallback = validImages[0];
            return fallback?.src ?? null;
        }, [
            '.product-image-wrapper img',
            '.product-primary-image img',
            '.pdp-main-image img',
            'img[data-testid="pdp-image"]',
            '.slick-active img',
            '[class*="ProductImage"] img',
            'picture img',
            'main img',
        ]);

        if (!imageUrl) {
            console.error('❌ No image URL found on page');
            return null;
        }

        console.log(`📸 Found image: ${imageUrl}`);
        return imageUrl;
    } catch (error) {
        console.error('❌ Puppeteer error:', error);
        return null;
    } finally {
        await browser.close();
    }
}

/**
 * 画像をダウンロードしてS3にアップロード
 */
async function downloadAndUploadImage(
    imageUrl: string,
    productId: string
): Promise<{ success: boolean; s3Url?: string; error?: string }> {
    try {
        console.log(`📥 Downloading image: ${imageUrl}`);

        // 画像をダウンロード
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.hoka.com/',
            },
        });

        const imageBuffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // ファイル拡張子を決定
        const extension = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';

        // S3キーを生成
        const imageHash = createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
        const s3Key = `hoka/${productId}/${imageHash}${extension}`;

        console.log(`📤 Uploading to S3: ${s3Key} (${imageBuffer.length} bytes)`);

        // S3にアップロード
        await s3Client.send(
            new PutObjectCommand({
                Bucket: IMAGES_BUCKET_NAME,
                Key: s3Key,
                Body: imageBuffer,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000',
                Metadata: {
                    'product-id': productId,
                    'brand': 'HOKA',
                    'source-url': imageUrl,
                    'uploaded-at': new Date().toISOString(),
                },
            })
        );

        const s3Url = `https://${IMAGES_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

        console.log(`✅ Uploaded: ${s3Url}`);

        return { success: true, s3Url };
    } catch (error) {
        console.error('❌ Upload failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * DynamoDBを更新
 */
async function updateProductImageUrl(productId: string, imageUrl: string): Promise<void> {
    console.log(`🔄 Updating DynamoDB: ${productId}`);

    await docClient.send(
        new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `PRODUCT#${productId}`,
                SK: 'METADATA',
            },
            UpdateExpression: 'SET imageUrl = :imageUrl, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':imageUrl': imageUrl,
                ':updatedAt': new Date().toISOString(),
            },
        })
    );

    console.log(`✅ Updated DynamoDB`);
}

/**
 * メイン処理
 */
async function main() {
    console.log('🤖 Starting automated HOKA image download...\n');
    console.log('🔑 Using AWS Profile:', AWS_PROFILE);
    console.log('📦 S3 Bucket:', IMAGES_BUCKET_NAME);
    console.log('📊 DynamoDB Table:', TABLE_NAME);
    console.log('🌏 Region:', AWS_REGION);
    console.log();

    let successCount = 0;
    let failureCount = 0;

    for (const product of products) {
        console.log('\n' + '='.repeat(70));
        console.log(`📦 Processing: ${product.name}`);
        console.log(`🔗 URL: ${product.url}`);
        console.log(`🆔 Product ID: ${product.productId}`);
        console.log('='.repeat(70));

        try {
            // 1. Puppeteerで画像URLを取得
            const imageUrl = await getImageUrlFromPage(product.url);

            if (!imageUrl) {
                console.log('❌ Failed to get image URL');
                failureCount++;
                continue;
            }

            // 2. 画像をダウンロードしてS3にアップロード
            const uploadResult = await downloadAndUploadImage(imageUrl, product.productId);

            if (!uploadResult.success) {
                console.log(`❌ Failed to upload: ${uploadResult.error}`);
                failureCount++;
                continue;
            }

            // 3. DynamoDBを更新
            await updateProductImageUrl(product.productId, uploadResult.s3Url!);

            successCount++;
            console.log('✅ Completed successfully!');
        } catch (error) {
            console.error('❌ Error processing product:', error);
            failureCount++;
        }

        // レート制限（次の製品処理まで5秒待機）
        if (products.indexOf(product) < products.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next product...');
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Processing completed!');
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log('='.repeat(70));

    if (successCount > 0) {
        console.log('\n📝 Next steps:');
        console.log('1. Verify images in S3 bucket:');
        console.log(`   aws s3 ls s3://${IMAGES_BUCKET_NAME}/hoka/ --recursive`);
        console.log('2. Check DynamoDB for updated imageUrl fields');
        console.log('3. Visit frontend to see the images:');
        console.log('   https://d20dyv94x2mgkq.cloudfront.net');
    }
}

// スクリプト実行
main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
