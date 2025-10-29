import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = process.env.TABLE_NAME || 'PriceComparisonStack-ProductTable';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';

const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

interface HokaProductSeed {
    modelNumber: string;
    name: string;
    gender: 'men' | 'women' | 'unisex';
    imageUrl: string;
    officialUrl: string;
    officialPrice: number;
    category: string;
    description?: string;
    variants: Array<{
        sku: string;
        color: string;
        size: string;
        price: number;
        available: boolean;
        barcode: string;
    }>;
}

// HOKA ONE ONE トレイルランニングシューズの代表的なモデル
const hokaProducts: HokaProductSeed[] = [
    {
        modelNumber: 'SPEEDGOAT5',
        name: 'Speedgoat 5',
        gender: 'men',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1123157-BBLC_1_1200x1200.jpg',
        officialUrl: 'https://www.hoka.com/en/us/mens-trail/speedgoat-5/195719270445.html',
        officialPrice: 19800,
        category: 'トレイルランニング',
        description: '技術的なトレイルに最適化された、Speedgoatシリーズの最新モデル',
        variants: [
            { sku: 'SPEEDGOAT5-BBLC-25', color: 'BLACK/BLUE', size: '25.0', price: 19800, available: true, barcode: '195719700000' },
            { sku: 'SPEEDGOAT5-BBLC-26', color: 'BLACK/BLUE', size: '26.0', price: 19800, available: true, barcode: '195719700001' },
            { sku: 'SPEEDGOAT5-BBLC-27', color: 'BLACK/BLUE', size: '27.0', price: 19800, available: true, barcode: '195719700002' },
            { sku: 'SPEEDGOAT5-BBLC-28', color: 'BLACK/BLUE', size: '28.0', price: 19800, available: true, barcode: '195719700003' },
            { sku: 'SPEEDGOAT5-BBLC-29', color: 'BLACK/BLUE', size: '29.0', price: 19800, available: true, barcode: '195719700004' },
        ],
    },
    {
        modelNumber: 'SPEEDGOAT5W',
        name: 'Speedgoat 5',
        gender: 'women',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1123158-CGRN_1_1200x1200.jpg',
        officialUrl: 'https://www.hoka.com/en/us/womens-trail/speedgoat-5/195719270605.html',
        officialPrice: 19800,
        category: 'トレイルランニング',
        description: '技術的なトレイルに最適化された、Speedgoatシリーズの最新モデル（ウィメンズ）',
        variants: [
            { sku: 'SPEEDGOAT5W-CGRN-22', color: 'CORAL/GREEN', size: '22.0', price: 19800, available: true, barcode: '195719700100' },
            { sku: 'SPEEDGOAT5W-CGRN-23', color: 'CORAL/GREEN', size: '23.0', price: 19800, available: true, barcode: '195719700101' },
            { sku: 'SPEEDGOAT5W-CGRN-24', color: 'CORAL/GREEN', size: '24.0', price: 19800, available: true, barcode: '195719700102' },
            { sku: 'SPEEDGOAT5W-CGRN-25', color: 'CORAL/GREEN', size: '25.0', price: 19800, available: true, barcode: '195719700103' },
        ],
    },
    {
        modelNumber: 'TECTON-X2',
        name: 'Tecton X 2',
        gender: 'men',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1127894-BWHT_1_1200x1200.jpg',
        officialUrl: 'https://www.hoka.com/en/us/mens-trail/tecton-x-2/195719757892.html',
        officialPrice: 33000,
        category: 'トレイルランニング',
        description: 'カーボンプレート搭載のハイパフォーマンストレイルシューズ',
        variants: [
            { sku: 'TECTONX2-BWHT-26', color: 'BLACK/WHITE', size: '26.0', price: 33000, available: true, barcode: '195719800000' },
            { sku: 'TECTONX2-BWHT-27', color: 'BLACK/WHITE', size: '27.0', price: 33000, available: true, barcode: '195719800001' },
            { sku: 'TECTONX2-BWHT-28', color: 'BLACK/WHITE', size: '28.0', price: 33000, available: true, barcode: '195719800002' },
        ],
    },
    {
        modelNumber: 'ZINAL',
        name: 'Zinal',
        gender: 'men',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0153/8863/products/1119394-BSLM_1_1200x1200.jpg',
        officialUrl: 'https://www.hoka.com/en/us/mens-trail/zinal/195719270063.html',
        officialPrice: 17600,
        category: 'トレイルランニング',
        description: '軽量で反応性の高い、テクニカルトレイルランニング用シューズ',
        variants: [
            { sku: 'ZINAL-BSLM-25', color: 'BLACK/SILVER', size: '25.0', price: 17600, available: true, barcode: '195719900000' },
            { sku: 'ZINAL-BSLM-26', color: 'BLACK/SILVER', size: '26.0', price: 17600, available: true, barcode: '195719900001' },
            { sku: 'ZINAL-BSLM-27', color: 'BLACK/SILVER', size: '27.0', price: 17600, available: true, barcode: '195719900002' },
            { sku: 'ZINAL-BSLM-28', color: 'BLACK/SILVER', size: '28.0', price: 17600, available: true, barcode: '195719900003' },
        ],
    },
];

async function seedHokaProducts() {
    console.log('🏃 Starting HOKA ONE ONE product seeding...\n');
    console.log(`📊 Target table: ${TABLE_NAME}`);
    console.log(`🌏 Region: ${AWS_REGION}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const productSeed of hokaProducts) {
        try {
            const productId = `HOKA-${productSeed.modelNumber}`;
            const now = new Date().toISOString();

            // Extract unique colors and sizes
            const colors = [...new Set(productSeed.variants.map(v => v.color))];
            const sizes = [...new Set(productSeed.variants.map(v => v.size))].sort();

            const product = {
                PK: `PRODUCT#${productId}`,
                SK: `METADATA`,
                GSI1PK: `BRAND#HOKA`,
                GSI1SK: `PRODUCT#${productSeed.modelNumber}`,
                entityType: 'product',
                id: productId,
                name: productSeed.name,
                modelNumber: productSeed.modelNumber,
                brand: 'HOKA',
                imageUrl: productSeed.imageUrl,
                officialUrl: productSeed.officialUrl,
                category: productSeed.category,
                gender: productSeed.gender,
                description: productSeed.description,
                officialPrice: productSeed.officialPrice,
                colors,
                sizes,
                variants: productSeed.variants.map((v, index) => ({
                    id: index + 1,
                    sku: v.sku,
                    color: v.color,
                    size: v.size,
                    price: v.price,
                    available: v.available,
                    barcode: v.barcode,
                })),
                inStock: productSeed.variants.some(v => v.available),
                createdAt: now,
                updatedAt: now,
            };

            await docClient.send(
                new PutCommand({
                    TableName: TABLE_NAME,
                    Item: product,
                })
            );

            console.log(`✅ Added: ${productSeed.name} (${productSeed.gender})`);
            console.log(`   Model: ${productSeed.modelNumber}`);
            console.log(`   Variants: ${productSeed.variants.length}`);
            console.log(`   Price: ¥${productSeed.officialPrice.toLocaleString()}\n`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to add ${productSeed.name}:`, error);
            errorCount++;
        }
    }

    console.log('🎉 Seeding completed!');
    console.log(`✅ Successfully added: ${successCount} products`);
    console.log(`❌ Failed: ${errorCount} products`);
    console.log(`📊 Total variants: ${hokaProducts.reduce((sum, p) => sum + p.variants.length, 0)}`);
}

// Set AWS Profile if needed
if (process.env.AWS_PROFILE) {
    console.log(`🔑 Using AWS Profile: ${process.env.AWS_PROFILE}\n`);
}

seedHokaProducts().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
