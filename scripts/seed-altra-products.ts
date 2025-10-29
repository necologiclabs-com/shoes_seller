/**
 * ALTRAの製品カタログをDynamoDBに登録
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { getAllAltraProducts } from '../lambda/layers/shared/nodejs/altra-catalog';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'PriceComparisonTable';

async function seedAltraProducts() {
    console.log('🏃 Seeding ALTRA trail running shoes to DynamoDB...\n');

    const products = getAllAltraProducts();
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const catalogProduct of products) {
        try {
            // 既存の製品を確認（modelNumberで検索）
            const existingProducts = await findProductByModelNumber(catalogProduct.modelNumber);

            if (existingProducts.length > 0) {
                // 既存製品を更新
                const existingProduct = existingProducts[0] as {
                    PK: string;
                    SK: string;
                    imageUrl?: string;
                    createdAt?: string;
                };
                console.log(`📝 Updating: ${catalogProduct.name} (${catalogProduct.modelNumber})`);

                await docClient.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK: existingProduct.PK,
                        SK: existingProduct.SK,
                        GSI1PK: 'BRAND#ALTRA',
                        GSI1SK: `PRODUCT#${existingProduct.PK.replace('PRODUCT#', '')}`,
                        entityType: 'product', // 必須：スキャンフィルタで使用
                        id: existingProduct.PK.replace('PRODUCT#', ''),
                        brand: 'ALTRA',
                        productName: `ALTRA ${catalogProduct.name}`,
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
                        GSI1PK: 'BRAND#ALTRA',
                        GSI1SK: `PRODUCT#${productId}`,
                        entityType: 'product', // 必須：スキャンフィルタで使用
                        id: productId,
                        brand: 'ALTRA',
                        productName: `ALTRA ${catalogProduct.name}`,
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

        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Summary:');
    console.log(`   Total: ${products.length}`);
    console.log(`   New: ${newCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
}

/**
 * モデル番号で製品を検索
 */
async function findProductByModelNumber(modelNumber: string): Promise<Record<string, unknown>[]> {
    const rawClient = new DynamoDBClient({ region: 'ap-northeast-1' });

    const result = await rawClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'modelNumber = :modelNumber AND SK = :sk',
        ExpressionAttributeValues: {
            ':modelNumber': { S: modelNumber },
            ':sk': { S: 'METADATA' }
        }
    }));

    return (result.Items || []).map(item => unmarshall(item));
}

seedAltraProducts().catch(console.error);
