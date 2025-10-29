/**
 * ALTRA製品の画像をShopifyからダウンロードしてS3にアップロードするスクリプト
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as https from 'https';
import * as http from 'http';

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: 'ap-northeast-1' });

const TABLE_NAME = 'PriceComparisonTable';
const BUCKET_NAME = 'price-comparison-images-034362042455';
const CLOUDFRONT_DOMAIN = 'd2xsg94jabv11p.cloudfront.net'; // 画像配信用CloudFront

interface AltraProduct {
    PK: string;
    SK: string;
    id: string;
    productName: string;
    modelNumber: string;
    officialUrl?: string;
    imageUrl?: string;
}

/**
 * URLから画像をダウンロード
 */
async function downloadImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            const chunks: Buffer[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * S3に画像をアップロード
 */
async function uploadToS3(imageBuffer: Buffer, productId: string): Promise<string> {
    const key = `products/${productId}.jpg`;

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
    }));

    return `https://${CLOUDFRONT_DOMAIN}/${key}`;
}

/**
 * Shopify製品ページから画像URLを取得
 */
async function getShopifyImageUrl(productUrl: string): Promise<string | null> {
    try {
        // Shopify製品JSONエンドポイント
        const jsonUrl = productUrl.endsWith('.json') ? productUrl : `${productUrl}.json`;

        const response = await fetch(jsonUrl);
        if (!response.ok) {
            return null;
        }

        const data = await response.json() as any;

        // 最初の画像を取得
        if (data.product?.images?.[0]?.src) {
            return data.product.images[0].src;
        }

        return null;
    } catch (error) {
        console.error(`  ❌ Shopify API error: ${error instanceof Error ? error.message : 'Unknown'}`);
        return null;
    }
}

/**
 * メイン処理
 */
async function downloadAltraImages(): Promise<void> {
    console.log('🖼️  ALTRA製品の画像をダウンロード中...\n');

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        // GSI1でALTRA製品を取得
        const queryResult = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :brandKey',
            ExpressionAttributeValues: {
                ':brandKey': 'BRAND#ALTRA',
            },
            ExclusiveStartKey: lastEvaluatedKey,
        }));

        if (!queryResult.Items || queryResult.Items.length === 0) {
            break;
        }

        console.log(`📦 処理中: ${queryResult.Items.length}個の製品\n`);

        for (const item of queryResult.Items as AltraProduct[]) {
            const productName = item.productName || item.modelNumber;
            console.log(`\n🔄 ${productName}`);
            console.log(`   ID: ${item.id}`);

            // 既にCloudFrontのURLが設定されている場合はスキップ
            if (item.imageUrl && item.imageUrl.includes(CLOUDFRONT_DOMAIN)) {
                console.log('   ⏭️  既に画像あり - スキップ');
                skipCount++;
                continue;
            }

            // officialUrlがない場合はスキップ
            if (!item.officialUrl) {
                console.log('   ⚠️  公式URLなし - プレースホルダー維持');
                skipCount++;
                continue;
            }

            try {
                // Shopify APIから画像URLを取得
                console.log('   📥 Shopifyから画像URL取得中...');
                const imageUrl = await getShopifyImageUrl(item.officialUrl);

                if (!imageUrl) {
                    console.log('   ⚠️  画像URLが見つかりません');
                    failCount++;
                    continue;
                }

                console.log(`   📥 画像ダウンロード中: ${imageUrl.substring(0, 60)}...`);
                const imageBuffer = await downloadImage(imageUrl);
                console.log(`   ✅ ダウンロード完了 (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

                // S3にアップロード
                console.log('   ☁️  S3にアップロード中...');
                const s3Url = await uploadToS3(imageBuffer, item.id);
                console.log(`   ✅ アップロード完了: ${s3Url}`);

                // DynamoDBを更新
                await docClient.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: item.PK,
                        SK: item.SK,
                    },
                    UpdateExpression: 'SET imageUrl = :imageUrl, updatedAt = :updatedAt',
                    ExpressionAttributeValues: {
                        ':imageUrl': s3Url,
                        ':updatedAt': new Date().toISOString(),
                    },
                }));

                console.log('   ✅ DB更新完了');
                successCount++;

                // レート制限対策
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`   ❌ エラー: ${error instanceof Error ? error.message : 'Unknown'}`);
                failCount++;
            }
        }

        lastEvaluatedKey = queryResult.LastEvaluatedKey;

    } while (lastEvaluatedKey);

    console.log('\n' + '='.repeat(60));
    console.log('📊 処理結果:');
    console.log(`   ✅ 成功: ${successCount}個`);
    console.log(`   ⏭️  スキップ: ${skipCount}個`);
    console.log(`   ❌ 失敗: ${failCount}個`);
    console.log('='.repeat(60));
}

// 実行
downloadAltraImages().catch(error => {
    console.error('❌ 致命的エラー:', error);
    process.exit(1);
});
