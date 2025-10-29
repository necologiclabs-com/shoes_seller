/**
 * 楽天市場からHOKAのトレイルランニングシューズを検索してカタログを作成
 */

import { RakutenPriceService } from '../lambda/layers/shared/nodejs/price-services/rakuten-service';

// 人気のHOKAトレイルランニングモデル
const popularModels = [
    { name: 'Speedgoat 5', modelNumber: 'SPEEDGOAT5', gender: 'MENS' },
    { name: 'Speedgoat 5', modelNumber: 'SPEEDGOAT5W', gender: 'WOMENS' },
    { name: 'Tecton X 2', modelNumber: 'TECTON-X2', gender: 'MENS' },
    { name: 'Tecton X 3', modelNumber: 'TECTON-X3', gender: 'MENS' },
    { name: 'Zinal', modelNumber: 'ZINAL', gender: 'MENS' },
    { name: 'Zinal 2', modelNumber: 'ZINAL2', gender: 'MENS' },
    { name: 'Challenger 7', modelNumber: 'CHALLENGER7', gender: 'MENS' },
    { name: 'Challenger ATR 7', modelNumber: 'CHALLENGER-ATR7', gender: 'MENS' },
    { name: 'Mafate Speed 4', modelNumber: 'MAFATE-SPEED4', gender: 'MENS' },
    { name: 'Torrent 3', modelNumber: 'TORRENT3', gender: 'MENS' },
    { name: 'Evo Mafate 2', modelNumber: 'EVO-MAFATE2', gender: 'MENS' },
    { name: 'Sky Arkali', modelNumber: 'SKY-ARKALI', gender: 'MENS' },
];

async function searchHokaProducts() {
    console.log('🔍 Searching HOKA trail running shoes on Rakuten...\n');

    // 楽天のアプリケーションIDを取得（SSMから）
    const rakutenAppId = process.env.RAKUTEN_APP_ID;

    if (!rakutenAppId) {
        console.error('❌ RAKUTEN_APP_ID environment variable not set');
        console.log('Set it with: $env:RAKUTEN_APP_ID="your-app-id"');
        return;
    }

    const rakutenService = new RakutenPriceService({
        applicationId: rakutenAppId
    });

    const results = [];

    for (const model of popularModels) {
        try {
            console.log(`Searching: HOKA ${model.name} (${model.gender})...`);

            const result = await rakutenService.fetchPrice(`HOKA ${model.name}`, model.modelNumber);

            if (result.price && result.productUrl) {
                console.log(`  ✅ Found: ¥${result.price.toLocaleString()}`);
                console.log(`     URL: ${result.productUrl.substring(0, 80)}...`);
                if (result.imageUrl) {
                    console.log(`     Image: ${result.imageUrl.substring(0, 80)}...`);
                }

                results.push({
                    brand: 'HOKA',
                    name: model.name,
                    modelNumber: model.modelNumber,
                    gender: model.gender,
                    price: result.price,
                    productUrl: result.productUrl,
                    imageUrl: result.imageUrl,
                    availability: result.availability
                });
            } else {
                console.log(`  ⚠️  Not found or no price`);
            }

            // レート制限対策
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }

        console.log();
    }

    console.log('\n📊 Summary:');
    console.log(`Found ${results.length}/${popularModels.length} products`);

    // 結果をJSON形式で出力
    console.log('\n📄 Products JSON:');
    console.log(JSON.stringify(results, null, 2));
}

searchHokaProducts().catch(console.error);
