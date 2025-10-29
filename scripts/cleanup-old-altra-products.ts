/**
 * 古い文字化けしたALTRA製品を削除するスクリプト
 * 
 * 作成日が2025-10-28T13:51より前のALTRA製品を削除します
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'PriceComparisonTable';
const CUTOFF_DATE = '2025-10-28T13:51:00.000Z'; // 新しいseedより前

async function cleanupOldAltraProducts(): Promise<void> {
    console.log('🧹 古いALTRA製品を検索中...\n');

    let deletedCount = 0;
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

        // 古い製品を削除
        for (const item of queryResult.Items) {
            const createdAt = item.createdAt as string;

            if (createdAt < CUTOFF_DATE) {
                console.log(`🗑️  削除: ${item.productName || item.modelNumber} (作成日: ${createdAt})`);

                await docClient.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: item.PK,
                        SK: item.SK,
                    },
                }));

                deletedCount++;
            }
        }

        lastEvaluatedKey = queryResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n✅ 削除完了: ${deletedCount}個の古いALTRA製品を削除しました`);
}

cleanupOldAltraProducts()
    .then(() => {
        console.log('\n✅ クリーンアップが完了しました');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
    });
