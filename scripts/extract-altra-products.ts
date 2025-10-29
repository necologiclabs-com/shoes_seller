/**
 * ALTRAの製品をJPサイトから取得してカタログを作成
 */

import { AltraJpCatalogService } from '../lambda/layers/shared/nodejs/altra-jp-catalog-service';
import * as fs from 'fs';

async function extractAltraProducts() {
    console.log('🔍 Fetching ALTRA trail running shoes from JP site...\n');

    const service = new AltraJpCatalogService();

    try {
        const { mens, womens } = await service.getAllTrailProducts();

        console.log(`\n📊 Found ${mens.length} mens products`);
        console.log(`📊 Found ${womens.length} womens products`);
        console.log(`📊 Total: ${mens.length + womens.length} products\n`);

        // カタログ形式に変換
        const catalog = [];

        // メンズ製品を追加
        for (const product of mens) {
            const modelNumber = generateModelNumber(product.handle);
            catalog.push({
                modelNumber,
                name: cleanProductName(product.title),
                gender: 'MENS',
                category: 'trail',
                description: `${product.title} - ALTRAのトレイルランニングシューズ`,
                officialUrl: `https://altrafootwear.jp/products/${product.handle}`,
                handle: product.handle,
                shopifyTitle: product.title,
            });
        }

        // ウィメンズ製品を追加
        for (const product of womens) {
            const modelNumber = generateModelNumber(product.handle) + 'W';
            catalog.push({
                modelNumber,
                name: cleanProductName(product.title),
                gender: 'WOMENS',
                category: 'trail',
                description: `${product.title} - ALTRAのトレイルランニングシューズ`,
                officialUrl: `https://altrafootwear.jp/products/${product.handle}`,
                handle: product.handle,
                shopifyTitle: product.title,
            });
        }

        // カタログファイルを出力
        const catalogContent = `/**
 * ALTRA製品カタログ（自動生成）
 * 
 * Generated on: ${new Date().toISOString()}
 * Source: https://altrafootwear.jp/
 */

export interface AltraProduct {
    modelNumber: string;
    name: string;
    gender: 'MENS' | 'WOMENS' | 'UNISEX';
    category: 'trail' | 'road' | 'hike';
    description: string;
    officialUrl: string;
}

export const ALTRA_TRAIL_CATALOG: AltraProduct[] = ${JSON.stringify(
            catalog.map(({ handle: _handle, shopifyTitle: _shopifyTitle, ...rest }) => rest),
            null,
            4
        )};

export function getAltraProduct(modelNumber: string): AltraProduct | undefined {
    return ALTRA_TRAIL_CATALOG.find(p => p.modelNumber === modelNumber);
}

export function getAllAltraProducts(): AltraProduct[] {
    return ALTRA_TRAIL_CATALOG;
}
`;

        fs.writeFileSync('lambda/layers/shared/nodejs/altra-catalog.ts', catalogContent, 'utf-8');
        console.log('✅ Catalog file created: lambda/layers/shared/nodejs/altra-catalog.ts');

        // デバッグ用に完全なデータも保存
        fs.writeFileSync('altra-catalog-full.json', JSON.stringify(catalog, null, 2), 'utf-8');
        console.log('✅ Full data saved: altra-catalog-full.json');

        console.log('\n📝 Sample products:');
        catalog.slice(0, 5).forEach(p => {
            console.log(`  - ${p.name} (${p.modelNumber}) [${p.gender}]`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * ハンドルからモデル番号を生成
 */
function generateModelNumber(handle: string): string {
    // ハンドルを大文字に変換してモデル番号として使用
    // 例: "lone-peak-8" -> "LONE-PEAK-8"
    return handle.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
}

/**
 * 製品名をクリーンアップ
 */
function cleanProductName(title: string): string {
    // "M LONE PEAK 8" -> "Lone Peak 8"
    // "W OLYMPUS 5" -> "Olympus 5"
    return title
        .replace(/^[MW]\s+/i, '') // 先頭のM/Wを削除
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

extractAltraProducts().catch(console.error);
