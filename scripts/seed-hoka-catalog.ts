/**
 * HOKAの製品カタログをDynamoDBに登録
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { HOKA_TRAIL_CATALOG } from '../lambda/layers/shared/nodejs/hoka-catalog';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'PriceComparisonTable';

async function seedHokaProducts() {
    console.log('🏃 Seeding HOKA trail running shoes to DynamoDB...\n');

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const catalogProduct of HOKA_TRAIL_CATALOG) {
        try {
            // 既存の製品を確認（modelNumberで検索）
            const existingProducts = await findProductByModelNumber(catalogProduct.modelNumber);

            if (existingProducts.length > 0) {
                // 既存製品を更新
                const existingProduct = existingProducts[0] as { PK: string; SK: string; imageUrl?: string; createdAt?: string };
                console.log(`📝 Updating: ${catalogProduct.name} (${catalogProduct.modelNumber})`);

                await docClient.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK: existingProduct.PK,
                        SK: existingProduct.SK,
                        GSI1PK: 'BRAND#HOKA',
                        GSI1SK: `PRODUCT#${existingProduct.PK.replace('PRODUCT#', '')}`,
                        id: existingProduct.PK.replace('PRODUCT#', ''),
                        brand: 'HOKA',
                        productName: `HOKA ${catalogProduct.name}`,
                        modelNumber: catalogProduct.modelNumber,
                        category: catalogProduct.category,
                        gender: catalogProduct.gender,
                        description: catalogProduct.description,
                        officialUrl: catalogProduct.officialUrl,
                        imageUrl: existingProduct.imageUrl, // 既存の画像URLを保持
                        updatedAt: new Date().toISOString(),
                        createdAt: existingProduct.createdAt || new Date().toISOString(),
                    }
                }));

                updatedCount++;
                console.log(`   ✅ Updated successfully`);
            } else {
                // 新規製品を作成
                const productId = randomUUID();
                console.log(`➕ Creating: ${catalogProduct.name} (${catalogProduct.modelNumber})`);

                await docClient.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK: `PRODUCT#${productId}`,
                        SK: 'METADATA',
                        GSI1PK: 'BRAND#HOKA',
                        GSI1SK: `PRODUCT#${productId}`,
                        id: productId,
                        brand: 'HOKA',
                        productName: `HOKA ${catalogProduct.name}`,
                        modelNumber: catalogProduct.modelNumber,
                        category: catalogProduct.category,
                        gender: catalogProduct.gender,
                        description: catalogProduct.description,
                        officialUrl: catalogProduct.officialUrl,
                        // imageUrlは価格更新時に自動取得される
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }
                }));

                newCount++;
                console.log(`   ✅ Created with ID: ${productId}`);
            }

        } catch (error) {
            console.error(`❌ Error processing ${catalogProduct.name}:`, error);
            skippedCount++;
        }

        console.log();
    }

    console.log('📊 Summary:');
    console.log(`   Total: ${HOKA_TRAIL_CATALOG.length}`);
    console.log(`   New: ${newCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
}

/**
 * モデル番号で製品を検索
 */
async function findProductByModelNumber(modelNumber: string): Promise<Record<string, unknown>[]> {
    // 全製品をスキャンしてmodelNumberが一致するものを探す
    // （本番環境ではGSIを使うべきだが、ここではシンプルに実装）
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { ScanCommand } = await import('@aws-sdk/client-dynamodb');
    const { unmarshall } = await import('@aws-sdk/util-dynamodb');

    const client = new DynamoDBClient({ region: 'ap-northeast-1' });

    const result = await client.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'modelNumber = :modelNumber AND SK = :sk',
        ExpressionAttributeValues: {
            ':modelNumber': { S: modelNumber },
            ':sk': { S: 'METADATA' }
        }
    }));

    return (result.Items || []).map(item => unmarshall(item));
}

seedHokaProducts().catch(console.error);
