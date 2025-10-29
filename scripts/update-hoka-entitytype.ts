import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'PriceComparisonTable';
const AWS_REGION = 'ap-northeast-1';

const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function updateHokaEntityType() {
    console.log('🔄 HOKAの製品にentityTypeを設定中...\n');

    try {
        // GSI1でHOKAの製品を検索
        const response = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :brand',
            ExpressionAttributeValues: {
                ':brand': 'BRAND#HOKA'
            }
        }));

        console.log(`📊 見つかった製品数: ${response.Items?.length || 0}\n`);

        let updatedCount = 0;

        if (response.Items) {
            for (const item of response.Items) {
                // entityTypeが未設定の場合のみ更新
                if (!item.entityType) {
                    console.log(`🔄 更新中: ${item.name || item.PK}`);

                    await docClient.send(new UpdateCommand({
                        TableName: TABLE_NAME,
                        Key: {
                            PK: item.PK,
                            SK: item.SK
                        },
                        UpdateExpression: 'SET entityType = :entityType',
                        ExpressionAttributeValues: {
                            ':entityType': 'product'
                        }
                    }));

                    updatedCount++;
                }
            }
        }

        console.log(`\n✅ 完了: ${updatedCount}個の製品にentityTypeを設定しました`);

    } catch (error) {
        console.error('❌ エラー:', error);
        throw error;
    }
}

updateHokaEntityType().catch(console.error);
