# ALTRA画像ダウンロード・管理ガイド

## 概要

ALTRAシューズの製品画像を公式Shopifyサイトから自動取得し、S3に保存してCloudFront経由で配信します。

## アーキテクチャ

```
Shopify公式サイト
  ↓ (スクレイピング)
  ↓
DynamoDBに保存
  ↓
S3バケット (price-comparison-images-034362042455)
  ↓
CloudFront配信 (d2xsg94jabv11p.cloudfront.net)
  ↓
Webサイト表示
```

## スクリプト

### 1. 画像ダウンロード

```powershell
$env:AWS_PROFILE="hikaku-dev"
npm run download:altra-images
```

**機能:**
- DynamoDBからALTRA製品を取得（GSI1でブランド検索）
- 各製品の公式URL（Shopify）から画像URLを取得
- 画像をダウンロード
- S3にアップロード（製品IDをファイル名として保存）
- DynamoDBのimageUrlフィールドを更新

**処理フロー:**
1. GSI1（BRAND#ALTRA）でALTRA製品をクエリ
2. 既にCloudFront URLが設定されている製品はスキップ
3. officialUrlがない製品はスキップ
4. Shopify APIから画像URLを取得（`.json`エンドポイント使用）
5. 画像をダウンロード（HTTPSプロトコル）
6. S3に`products/{productId}.jpg`としてアップロード
7. DynamoDBを更新（imageUrl、updatedAt）
8. レート制限対策（500ms待機）

### 2. 画像テスト

```powershell
$env:AWS_PROFILE="hikaku-dev"
npm run test:altra-images
```

**テスト項目:**
- ✅ **テスト1**: DynamoDBから直接取得
  - ALTRA製品の取得確認
  - imageUrlフィールドの存在確認
  - CloudFront URLの確認
  
- ✅ **テスト2**: API経由で取得
  - GET /products?brand=ALTRA の動作確認
  - レスポンスのimageUrl確認
  
- ✅ **テスト3**: 画像URLアクセステスト
  - CloudFront経由で画像にアクセス可能か確認
  - HTTP HEADリクエストで200 OKを確認

## 実行結果例

```
🖼️  ALTRA製品の画像をダウンロード中...

📦 処理中: 118個の製品

🔄 ALTRA Olympus 5 Hike Low Gtx
   ID: 4a13a1ab-845b-4c17-96fb-ba9e157003ec
   📥 Shopifyから画像URL取得中...
   📥 画像ダウンロード中: https://cdn.shopify.com/s/files/1/...
   ✅ ダウンロード完了 (56.4 KB)
   ☁️  S3にアップロード中...
   ✅ アップロード完了: https://d2xsg94jabv11p.cloudfront.net/products/...
   ✅ DB更新完了

============================================================
📊 処理結果:
   ✅ 成功: 45個
   ⏭️  スキップ: 70個
   ❌ 失敗: 3個
============================================================
```

## トラブルシューティング

### 画像が取得できない

**原因1**: officialUrlが設定されていない
```
⚠️  公式URLなし - プレースホルダー維持
```
→ 製品マスタ（altra-catalog.ts）にofficialUrlを追加

**原因2**: Shopify APIからのレスポンスエラー
```
❌ Shopify API error: Failed to fetch
```
→ レート制限または一時的なネットワークエラー。500ms待機後に再実行

**原因3**: 画像URLが見つからない
```
⚠️  画像URLが見つかりません
```
→ Shopify製品ページに画像が存在しない。手動で画像を確認

### S3アップロードエラー

**権限エラー:**
```powershell
# IAMポリシーを確認
$env:AWS_PROFILE="hikaku-dev"
aws s3 ls s3://price-comparison-images-034362042455/products/
```

**バケットが存在しない:**
```powershell
# CDKでインフラをデプロイ
npm run deploy
```

### CloudFront配信エラー

**キャッシュクリア:**
```powershell
$env:AWS_PROFILE="hikaku-dev"
aws cloudfront create-invalidation \
  --distribution-id E2X7NVQCWT7SSV \
  --paths "/products/*"
```

## データ構造

### DynamoDB製品アイテム

```typescript
{
  PK: "PRODUCT#018fbe2c-64db-4437-84eb-7e275393a4ee",
  SK: "METADATA",
  GSI1PK: "BRAND#ALTRA",
  GSI1SK: "PRODUCT#018fbe2c-64db-4437-84eb-7e275393a4ee",
  id: "018fbe2c-64db-4437-84eb-7e275393a4ee",
  productName: "ALTRA Mont Blanc Carbon X Soar",
  brand: "ALTRA",
  officialUrl: "https://altrafootwear.jp/products/al0a856s-mont-blanc-carbon-x-soar",
  imageUrl: "https://d2xsg94jabv11p.cloudfront.net/products/018fbe2c-64db-4437-84eb-7e275393a4ee.jpg",
  updatedAt: "2025-10-29T10:09:08.123Z"
}
```

### Shopify製品JSONレスポンス

```json
{
  "product": {
    "id": 8123456789,
    "handle": "al0a856s-mont-blanc-carbon-x-soar",
    "title": "ALTRA Mont Blanc Carbon X Soar",
    "product_type": "Trail Running Shoes",
    "vendor": "ALTRA",
    "images": [
      {
        "src": "https://cdn.shopify.com/s/files/1/0560/0283/8685/files/AL0A856S_001_1.jpg"
      }
    ]
  }
}
```

## パフォーマンス

- **ダウンロード速度**: 約500ms/製品（レート制限含む）
- **バッチサイズ**: 制限なし（ページネーション対応）
- **画像サイズ**: 平均200KB（範囲: 50KB～1.2MB）
- **S3保存形式**: JPEG（Content-Type: image/jpeg）
- **キャッシュ**: max-age=31536000（1年）

## 定期実行

### 手動実行（推奨）

新製品が追加されたときに手動実行：

```powershell
$env:AWS_PROFILE="hikaku-dev"
npm run download:altra-images
npm run test:altra-images
```

### 自動実行（オプション）

EventBridgeで定期実行する場合:

```typescript
// lib/price-comparison-stack.ts に追加
new events.Rule(this, 'AltraImageDownloadSchedule', {
  schedule: events.Schedule.rate(Duration.days(7)), // 週1回
  targets: [new targets.LambdaFunction(downloadAltraImagesLambda)],
});
```

## 関連ファイル

- **スクリプト**:
  - `scripts/download-altra-images.ts` - 画像ダウンロード
  - `scripts/test-altra-images.ts` - テストスクリプト
  
- **共有レイヤ**:
  - `lambda/layers/shared/nodejs/altra-jp-catalog-service.ts` - Shopify API
  - `lambda/layers/shared/nodejs/altra-catalog.ts` - 製品マスタ

- **インフラ**:
  - `lib/price-comparison-stack.ts` - S3/CloudFront定義

## 参考

- [Shopify Products JSON API](https://shopify.dev/docs/api/liquid/objects/product)
- [AWS S3 PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html)
- [CloudFront Distribution](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Distribution.html)
