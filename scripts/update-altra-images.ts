/**
 * ALTRA製品にプレースホルダー画像URLを設定するスクリプト
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'PriceComparisonTable';
// SVG Data URI for ALTRA placeholder (works without external dependencies)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23E8505B'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='48' font-weight='bold' fill='white'%3EALTRA%3C/text%3E%3C/svg%3E";

async function updateAltraImages(): Promise<void> {
    console.log('🖼️  ALTRA製品に画像URLを設定中...\n');

    let updatedCount = 0;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
        // GSI1を使ってALTRA製品をクエリ
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

        // 画像URLがない、または古いプレースホルダーURLの製品を更新
        for (const item of queryResult.Items) {
            const needsImageUpdate = !item.imageUrl ||
                item.imageUrl.includes('via.placeholder.com');
            const needsEntityTypeUpdate = !item.entityType;

            if (needsImageUpdate || needsEntityTypeUpdate) {
                console.log(`🖼️  更新中: ${item.productName || item.modelNumber}`);

                const updateExpression = [];
                const expressionAttributeValues: Record<string, unknown> = {
                    ':updatedAt': new Date().toISOString(),
                };

                if (needsImageUpdate) {
                    updateExpression.push('imageUrl = :imageUrl');
                    expressionAttributeValues[':imageUrl'] = PLACEHOLDER_IMAGE;
                }

                if (needsEntityTypeUpdate) {
                    updateExpression.push('entityType = :entityType');
                    expressionAttributeValues[':entityType'] = 'product';
                }

                await docClient.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: item.PK,
                        SK: item.SK,
                    },
                    UpdateExpression: `SET ${updateExpression.join(', ')}, updatedAt = :updatedAt`,
                    ExpressionAttributeValues: expressionAttributeValues,
                }));

                updatedCount++;
            }
        }

        lastEvaluatedKey = queryResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n✅ 完了: ${updatedCount}個の製品に画像URLを設定しました`);
}

updateAltraImages()
    .then(() => {
        console.log('\n✅ 処理が完了しました');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
    });
