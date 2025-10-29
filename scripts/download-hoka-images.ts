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

// AWS設定
const AWS_PROFILE = process.env.AWS_PROFILE || 'hikaku-dev';
const AWS_REGION = 'ap-northeast-1';
const TABLE_NAME = 'PriceComparisonTable';
const IMAGES_BUCKET_NAME = `price-comparison-images-${process.env.AWS_ACCOUNT || '533267394861'}`;

// DynamoDB初期化
const dynamoClient = new DynamoDBClient({
    region: AWS_REGION,
    ...(AWS_PROFILE && { credentials: undefined }), // プロファイルを使用
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// S3初期化
const s3Client = new S3Client({ region: AWS_REGION });

interface HokaImageMapping {
    productId: string;
    name: string;
    sourceUrl: string;
}

// HOKA製品の画像URL
const hokaImageMappings: HokaImageMapping[] = [
    {
        productId: 'HOKA-SPEEDGOAT5',
        name: 'Speedgoat 5 (Men)',
        sourceUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1123157-BBLC_1_1200x1200.jpg',
    },
    {
        productId: 'HOKA-SPEEDGOAT5W',
        name: 'Speedgoat 5 (Women)',
        sourceUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1123158-CGRN_1_1200x1200.jpg',
    },
    {
        productId: 'HOKA-TECTON-X2',
        name: 'Tecton X 2',
        sourceUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1127894-BWHT_1_1200x1200.jpg',
    },
    {
        productId: 'HOKA-ZINAL',
        name: 'Zinal',
        sourceUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1119394-BSLM_1_1200x1200.jpg',
    },
];

/**
 * 画像をダウンロードしてS3にアップロード
 */
async function downloadAndUploadImage(
    sourceUrl: string,
    productId: string
): Promise<{ success: boolean; s3Key?: string; cloudFrontUrl?: string; error?: string }> {
    try {
        console.log(`📥 Downloading image from: ${sourceUrl}`);

        // 画像をダウンロード
        const response = await axios.get(sourceUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const imageBuffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const extension = getExtensionFromContentType(contentType);

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
                    'source-url': sourceUrl,
                },
            })
        );

        // CloudFront URLを生成（後でCloudFront作成後に更新）
        // 一旦S3 URLを使用
        const imageUrl = `https://${IMAGES_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

        console.log(`✅ Uploaded successfully: ${imageUrl}`);

        return { success: true, s3Key, cloudFrontUrl: imageUrl };
    } catch (error) {
        console.error(`❌ Failed to process image:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Content-Typeからファイル拡張子を取得
 */
function getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
    };
    return typeMap[contentType.toLowerCase()] || '.jpg';
}

/**
 * DynamoDBの製品画像URLを更新
 */
async function updateProductImageUrl(productId: string, imageUrl: string): Promise<void> {
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
}

/**
 * メイン処理
 */
async function main() {
    console.log('🔑 Using AWS Profile:', AWS_PROFILE);
    console.log('📦 S3 Bucket:', IMAGES_BUCKET_NAME);
    console.log('📊 DynamoDB Table:', TABLE_NAME);
    console.log('🌏 Region:', AWS_REGION);
    console.log();

    console.log('🏃 Downloading and uploading HOKA product images...\n');

    let successCount = 0;
    let failureCount = 0;

    for (const mapping of hokaImageMappings) {
        console.log(`\n📸 Processing: ${mapping.name}`);
        console.log(`   Product ID: ${mapping.productId}`);
        console.log(`   Source: ${mapping.sourceUrl}`);

        const result = await downloadAndUploadImage(mapping.sourceUrl, mapping.productId);

        if (result.success && result.cloudFrontUrl) {
            console.log(`\n🔄 Updating DynamoDB...`);
            await updateProductImageUrl(mapping.productId, result.cloudFrontUrl);
            console.log(`✅ Updated product: ${mapping.productId}`);
            successCount++;
        } else {
            console.log(`❌ Failed: ${result.error}`);
            failureCount++;
        }

        // レート制限
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Processing completed!');
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
}

// スクリプト実行
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
