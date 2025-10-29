/**
 * ALTRA製品の画像取得・表示をテストするスクリプト
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = 'PriceComparisonTable';
const API_BASE_URL = 'https://0k3yewd8c6.execute-api.ap-northeast-1.amazonaws.com/prod';
const CLOUDFRONT_DOMAIN = 'd2xsg94jabv11p.cloudfront.net';

interface Product {
    id: string;
    productName: string;
    brand: string;
    imageUrl?: string;
}

/**
 * DynamoDBから直接ALTRA製品を取得
 */
async function getAltraProductsFromDB(): Promise<Product[]> {
    const queryResult = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :brandKey',
        ExpressionAttributeValues: {
            ':brandKey': 'BRAND#ALTRA',
        },
        Limit: 10,
    }));

    return (queryResult.Items || []) as Product[];
}

/**
 * API経由でALTRA製品を取得
 */
async function getAltraProductsFromAPI(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/products?brand=ALTRA&limit=10`);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as { products: Product[] };
    return data.products || [];
}

/**
 * 画像URLの可用性をテスト
 */
async function testImageUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * メイン処理
 */
async function testAltraImages(): Promise<void> {
    console.log('🧪 ALTRA製品画像テスト\n');
    console.log('='.repeat(80));

    // 1. DynamoDBから直接取得
    console.log('\n📊 テスト1: DynamoDBから直接取得');
    console.log('-'.repeat(80));
    const dbProducts = await getAltraProductsFromDB();
    console.log(`✅ ${dbProducts.length}個の製品を取得\n`);

    let dbWithImage = 0;
    let dbCloudFrontImage = 0;

    for (const product of dbProducts.slice(0, 5)) {
        const hasImage = !!product.imageUrl;
        const isCloudFront = product.imageUrl?.includes(CLOUDFRONT_DOMAIN) || false;

        console.log(`📦 ${product.productName.substring(0, 40)}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   画像: ${hasImage ? '✅' : '❌'} ${isCloudFront ? '(CloudFront)' : ''}`);
        if (product.imageUrl) {
            console.log(`   URL: ${product.imageUrl.substring(0, 70)}...`);
        }
        console.log();

        if (hasImage) dbWithImage++;
        if (isCloudFront) dbCloudFrontImage++;
    }

    console.log(`📈 DB統計: ${dbWithImage}/${dbProducts.slice(0, 5).length}個に画像あり (CloudFront: ${dbCloudFrontImage})`);

    // 2. API経由で取得
    console.log('\n📊 テスト2: API経由で取得');
    console.log('-'.repeat(80));
    const apiProducts = await getAltraProductsFromAPI();
    console.log(`✅ ${apiProducts.length}個の製品を取得\n`);

    let apiWithImage = 0;
    let apiCloudFrontImage = 0;

    for (const product of apiProducts.slice(0, 5)) {
        const hasImage = !!product.imageUrl;
        const isCloudFront = product.imageUrl?.includes(CLOUDFRONT_DOMAIN) || false;
        const name = product.productName || product.id;

        console.log(`📦 ${name.substring(0, 40)}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   画像: ${hasImage ? '✅' : '❌'} ${isCloudFront ? '(CloudFront)' : ''}`);
        if (product.imageUrl) {
            console.log(`   URL: ${product.imageUrl.substring(0, 70)}...`);
        }
        console.log();

        if (hasImage) apiWithImage++;
        if (isCloudFront) apiCloudFrontImage++;
    }

    console.log(`📈 API統計: ${apiWithImage}/${apiProducts.slice(0, 5).length}個に画像あり (CloudFront: ${apiCloudFrontImage})`);

    // 3. 画像URLの可用性テスト
    console.log('\n📊 テスト3: 画像URLアクセステスト');
    console.log('-'.repeat(80));

    const testProducts = apiProducts.filter(p => p.imageUrl).slice(0, 3);
    let accessibleCount = 0;

    for (const product of testProducts) {
        if (!product.imageUrl) continue;
        const name = product.productName || product.id;

        console.log(`🔍 ${name.substring(0, 40)}`);
        console.log(`   URL: ${product.imageUrl}`);

        const isAccessible = await testImageUrl(product.imageUrl);
        console.log(`   ${isAccessible ? '✅ アクセス可能' : '❌ アクセス不可'}\n`);

        if (isAccessible) accessibleCount++;
    }

    console.log(`📈 アクセステスト: ${accessibleCount}/${testProducts.length}個がアクセス可能`);

    // 最終結果
    console.log('\n' + '='.repeat(80));
    console.log('📋 最終結果サマリー');
    console.log('='.repeat(80));
    console.log(`✅ DynamoDB: ${dbCloudFrontImage}/${dbProducts.slice(0, 5).length}個にCloudFront画像`);
    console.log(`✅ API: ${apiCloudFrontImage}/${apiProducts.slice(0, 5).length}個にCloudFront画像`);
    console.log(`✅ アクセステスト: ${accessibleCount}/${testProducts.length}個がアクセス可能`);
    console.log('='.repeat(80));

    const allTestsPassed =
        dbCloudFrontImage > 0 &&
        apiCloudFrontImage > 0 &&
        accessibleCount > 0;

    if (allTestsPassed) {
        console.log('\n🎉 すべてのテストに合格しました！');
        console.log('   ALTRA製品の画像が正常に取得・保存・配信されています。');
    } else {
        console.log('\n⚠️  一部のテストが失敗しました。');
        console.log('   詳細を確認してください。');
    }
}

// 実行
testAltraImages().catch(error => {
    console.error('❌ テストエラー:', error);
    process.exit(1);
});
