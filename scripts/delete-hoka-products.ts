import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'PriceComparisonTable';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';

const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function deleteHokaProducts() {
    console.log('🗑️  Deleting existing HOKA products...\n');
    console.log(`📊 Table: ${TABLE_NAME}`);
    console.log(`🌏 Region: ${AWS_REGION}\n`);

    try {
        // Scan for HOKA products
        const scanResult = await docClient.send(
            new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'brand = :brand',
                ExpressionAttributeValues: {
                    ':brand': 'HOKA',
                },
            })
        );

        if (!scanResult.Items || scanResult.Items.length === 0) {
            console.log('❌ No HOKA products found');
            return;
        }

        console.log(`✅ Found ${scanResult.Items.length} HOKA products to delete\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const item of scanResult.Items) {
            try {
                console.log(`Deleting: ${item.name} (${item.id})`);
                console.log(`  PK: ${item.PK}, SK: ${item.SK}`);

                await docClient.send(
                    new DeleteCommand({
                        TableName: TABLE_NAME,
                        Key: {
                            PK: item.PK,
                            SK: item.SK,
                        },
                    })
                );

                console.log('  ✅ Deleted\n');
                successCount++;
            } catch (error) {
                console.error(`  ❌ Failed to delete ${item.id}:`, error);
                errorCount++;
            }
        }

        console.log('🎉 Deletion completed!');
        console.log(`✅ Successfully deleted: ${successCount} products`);
        console.log(`❌ Failed: ${errorCount} products`);
    } catch (error) {
        console.error('❌ Error during deletion:', error);
        process.exit(1);
    }
}

if (process.env.AWS_PROFILE) {
    console.log(`🔑 Using AWS Profile: ${process.env.AWS_PROFILE}\n`);
}

deleteHokaProducts().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
