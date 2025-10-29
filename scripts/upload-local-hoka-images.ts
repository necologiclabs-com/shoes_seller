/**
 * ローカルの画像ファイルをS3にアップロードしてDynamoDBを更新
 * 
 * 使用方法:
 * 1. HOKA公式サイトから画像を手動でダウンロード
 * 2. scripts/images/hoka/ フォルダに配置
 *    - speedgoat-5-men.jpg
 *    - speedgoat-5-women.jpg
 *    - tecton-x2.jpg
 *    - zinal.jpg
 * 3. このスクリプトを実行
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// AWS設定
const AWS_PROFILE = process.env.AWS_PROFILE || 'hikaku-dev';
const AWS_REGION = 'ap-northeast-1';
const TABLE_NAME = 'PriceComparisonTable';
const IMAGES_BUCKET_NAME = `price-comparison-images-${process.env.AWS_ACCOUNT || '533267394861'}`;

// DynamoDB初期化
const dynamoClient = new DynamoDBClient({
    region: AWS_REGION,
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// S3初期化
const s3Client = new S3Client({ region: AWS_REGION });

interface ImageMapping {
    productId: string;
    name: string;
    localFile: string; // scripts/images/hoka/ 配下のファイル名
}

// 画像ファイルのマッピング
const imageMappings: ImageMapping[] = [
    {
        productId: 'HOKA-SPEEDGOAT5',
        name: 'Speedgoat 5 (Men)',
        localFile: 'speedgoat-5-men.jpg',
    },
    {
        productId: 'HOKA-SPEEDGOAT5W',
        name: 'Speedgoat 5 (Women)',
        localFile: 'speedgoat-5-women.jpg',
    },
    {
        productId: 'HOKA-TECTON-X2',
        name: 'Tecton X 2',
        localFile: 'tecton-x2.jpg',
    },
    {
        productId: 'HOKA-ZINAL',
        name: 'Zinal',
        localFile: 'zinal.jpg',
    },
];

/**
 * ローカル画像ファイルをS3にアップロード
 */
async function uploadImageToS3(
    localPath: string,
    productId: string
): Promise<{ success: boolean; s3Key?: string; imageUrl?: string; error?: string }> {
    try {
        // ファイルの存在確認
        if (!existsSync(localPath)) {
            return {
                success: false,
                error: `File not found: ${localPath}`,
            };
        }

        console.log(`📂 Reading file: ${localPath}`);

        // ファイルを読み込み
        const imageBuffer = readFileSync(localPath);
        const contentType = 'image/jpeg'; // JPEGと仮定
        const extension = '.jpg';

        // S3キーを生成（ハッシュベース）
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
                    'uploaded-at': new Date().toISOString(),
                },
            })
        );

        // S3 URLを生成
        const imageUrl = `https://${IMAGES_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

        console.log(`✅ Uploaded successfully: ${imageUrl}`);

        return { success: true, s3Key, imageUrl };
    } catch (error) {
        console.error(`❌ Failed to upload:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * DynamoDBの製品画像URLを更新
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

    console.log(`✅ Updated DynamoDB: ${productId}`);
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

    const imagesDir = join(__dirname, 'images', 'hoka');
    console.log('📁 Images directory:', imagesDir);
    console.log();

    console.log('📸 Uploading HOKA product images...\n');

    let successCount = 0;
    let failureCount = 0;

    for (const mapping of imageMappings) {
        console.log(`\n🖼️  Processing: ${mapping.name}`);
        console.log(`   Product ID: ${mapping.productId}`);
        console.log(`   Local file: ${mapping.localFile}`);

        const localPath = join(imagesDir, mapping.localFile);
        const result = await uploadImageToS3(localPath, mapping.productId);

        if (result.success && result.imageUrl) {
            await updateProductImageUrl(mapping.productId, result.imageUrl);
            successCount++;
        } else {
            console.log(`❌ Failed: ${result.error}`);
            failureCount++;
        }

        // レート制限
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Processing completed!');
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log('='.repeat(60));

    if (failureCount > 0) {
        console.log('\n📝 Missing images:');
        console.log('   Please download images from HOKA website and save them to:');
        console.log(`   ${imagesDir}`);
        console.log('\n   Required files:');
        imageMappings.forEach((m) => {
            console.log(`   - ${m.localFile}`);
        });
    }
}

// スクリプト実行
main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
