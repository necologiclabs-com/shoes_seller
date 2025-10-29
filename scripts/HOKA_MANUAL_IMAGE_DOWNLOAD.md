# HOKA 画像 手動ダウンロードガイド

Puppeteer を使った自動取得が困難なため、手動でHOKA製品画像をダウンロードする手順を説明します。

## 必要な作業時間

約 10 分

## 手順

### 1. 画像保存用フォルダを作成

```powershell
New-Item -ItemType Directory -Path "scripts/images/hoka" -Force
```

### 2. 各製品ページをブラウザで開き、画像を保存

以下の製品ページをブラウザで開き、メインの製品画像を右クリックして「名前を付けて保存」:

#### Speedgoat 5 (Men's)
- **URL**: https://www.hoka.com/en/us/mens-trail/speedgoat-5/195719270445.html
- **保存名**: `scripts/images/hoka/HOKA-SPEEDGOAT5.jpg`

#### Speedgoat 5 (Women's)
- **URL**: https://www.hoka.com/en/us/womens-trail/speedgoat-5/195719270605.html
- **保存名**: `scripts/images/hoka/HOKA-SPEEDGOAT5W.jpg`

#### Tecton X 2
- **URL**: https://www.hoka.com/en/us/mens-trail/tecton-x-2/195719757892.html
- **保存名**: `scripts/images/hoka/HOKA-TECTON-X2.jpg`

#### Zinal
- **URL**: https://www.hoka.com/en/us/mens-trail/zinal/195719270063.html
- **保存名**: `scripts/images/hoka/HOKA-ZINAL.jpg`

### 3. 画像をS3にアップロード

```powershell
$env:AWS_PROFILE="hikaku-dev"
npx ts-node scripts/upload-local-hoka-images.ts
```

このスクリプトは：
- ✅ `scripts/images/hoka/` 内の画像を S3 にアップロード
- ✅ DynamoDB の `imageUrl` フィールドを更新
- ✅ CloudFront 経由でアクセス可能な URL を設定

### 4. 確認

S3 バケットに画像がアップロードされたか確認:

```powershell
aws s3 ls s3://price-comparison-images-533267394861/hoka/ --recursive --profile hikaku-dev
```

DynamoDB を確認（AWS Console または CLI）:

```powershell
aws dynamodb query \
  --table-name PriceComparisonTable \
  --key-condition-expression "PK = :pk AND SK = :sk" \
  --expression-attribute-values '{":pk":{"S":"PRODUCT#HOKA-SPEEDGOAT5"},":sk":{"S":"METADATA"}}' \
  --profile hikaku-dev
```

### 5. フロントエンドで確認

https://d20dyv94x2mgkq.cloudfront.net にアクセスして画像が表示されることを確認

## トラブルシューティング

### 画像が保存できない

HOKA のサイトは外部からのダウンロードをブロックしている場合があります。以下を試してください：

1. ブラウザで画像を右クリック → 「新しいタブで画像を開く」
2. 開いたタブで画像を右クリック → 「名前を付けて保存」
3. または、ブラウザのデベロッパーツール（F12）→ Network タブ → 画像URLをコピーしてブラウザで開く

### アップロードスクリプトがエラーになる

```powershell
# AWS認証情報を確認
aws sts get-caller-identity --profile hikaku-dev

# S3バケットへのアクセス権限を確認
aws s3 ls s3://price-comparison-images-533267394861/ --profile hikaku-dev
```

### フロントエンドに画像が表示されない

1. ブラウザのキャッシュをクリア（Ctrl + Shift + Delete）
2. S3の画像URLに直接アクセスして確認
3. CloudFront のキャッシュが原因の場合は15分ほど待機

## 参考: 画像ファイル名とProduct IDの対応

| Product ID | ファイル名 | 製品名 |
|---|---|---|
| HOKA-SPEEDGOAT5 | HOKA-SPEEDGOAT5.jpg | Speedgoat 5 (Men) |
| HOKA-SPEEDGOAT5W | HOKA-SPEEDGOAT5W.jpg | Speedgoat 5 (Women) |
| HOKA-TECTON-X2 | HOKA-TECTON-X2.jpg | Tecton X 2 |
| HOKA-ZINAL | HOKA-ZINAL.jpg | Zinal |

## 将来の自動化について

HOKA のサイトはbot検出とCloudflare保護が強力なため、完全自動化は困難です。将来的には以下の方法を検討できます：

- 🔄 Playwright + Stealth Plugin の使用
- 🔄 実際のブラウザプロファイルを使用した Puppeteer Extra
- 🔄 HOKA API（存在する場合）への直接アクセス
- 🔄 手動ダウンロードを定期タスクとして実施
