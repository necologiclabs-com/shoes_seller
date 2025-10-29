import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'PriceComparisonTable';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';

const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// プレースホルダー画像URL
// Data URI SVGを使用（確実に表示される）
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%234F46E5'/%3E%3Ctext x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='48' font-weight='bold' fill='white'%3EHOKA%3C/text%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='32' fill='white' opacity='0.9'%3EONE ONE%3C/text%3E%3C/svg%3E`;

const PLACEHOLDER_IMAGE_URL = PLACEHOLDER_SVG;

async function updateHokaImages() {
    console.log('🔄 Updating HOKA product images...\n');
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

        console.log(`✅ Found ${scanResult.Items.length} HOKA products\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const item of scanResult.Items) {
            try {
                console.log(`Updating: ${item.name} (${item.id})`);
                console.log(`  Old URL: ${item.imageUrl}`);
                console.log(`  New URL: ${PLACEHOLDER_IMAGE_URL}`);

                await docClient.send(
                    new UpdateCommand({
                        TableName: TABLE_NAME,
                        Key: {
                            PK: item.PK,
                            SK: item.SK,
                        },
                        UpdateExpression: 'SET imageUrl = :url, updatedAt = :updatedAt',
                        ExpressionAttributeValues: {
                            ':url': PLACEHOLDER_IMAGE_URL,
                            ':updatedAt': new Date().toISOString(),
                        },
                    })
                );

                console.log('  ✅ Updated\n');
                successCount++;
            } catch (error) {
                console.error(`  ❌ Failed to update ${item.id}:`, error);
                errorCount++;
            }
        }

        console.log('🎉 Update completed!');
        console.log(`✅ Successfully updated: ${successCount} products`);
        console.log(`❌ Failed: ${errorCount} products`);
    } catch (error) {
        console.error('❌ Error during update:', error);
        process.exit(1);
    }
}

// Set AWS Profile if needed
if (process.env.AWS_PROFILE) {
    console.log(`🔑 Using AWS Profile: ${process.env.AWS_PROFILE}\n`);
}

updateHokaImages().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
