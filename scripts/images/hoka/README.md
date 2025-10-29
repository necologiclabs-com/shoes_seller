# HOKA製品画像アップロード手順

## 概要

HOKA公式サイトは外部からの画像ホットリンクを防止しているため、画像を手動でダウンロードしてS3にアップロードする必要があります。

## 手順

### 1. HOKA公式サイトから画像をダウンロード

以下の製品ページから画像を手動でダウンロードしてください：

#### Speedgoat 5 (Men)
- URL: https://www.hoka.com/en/us/mens-trail/speedgoat-5/195719270445.html
- 保存ファイル名: `speedgoat-5-men.jpg`
- 保存先: `scripts/images/hoka/speedgoat-5-men.jpg`

**ダウンロード方法**:
1. ブラウザで上記URLを開く
2. メイン製品画像を右クリック → 「名前を付けて画像を保存」
3. `scripts/images/hoka/` に保存

#### Speedgoat 5 (Women)
- URL: https://www.hoka.com/en/us/womens-trail/speedgoat-5/195719270605.html
- 保存ファイル名: `speedgoat-5-women.jpg`
- 保存先: `scripts/images/hoka/speedgoat-5-women.jpg`

#### Tecton X 2
- URL: https://www.hoka.com/en/us/mens-trail/tecton-x-2/195719757892.html
- 保存ファイル名: `tecton-x2.jpg`
- 保存先: `scripts/images/hoka/tecton-x2.jpg`

#### Zinal
- URL: https://www.hoka.com/en/us/mens-trail/zinal/195719270063.html
- 保存ファイル名: `zinal.jpg`
- 保存先: `scripts/images/hoka/zinal.jpg`

### 2. スクリプトを実行してS3にアップロード

```powershell
# AWS認証情報を設定
$env:AWS_PROFILE="hikaku-dev"

# スクリプトを実行
cd d:\dev\compare
npx ts-node scripts/upload-local-hoka-images.ts
```

### 3. 結果確認

スクリプトは以下を実行します：

1. ローカル画像ファイルを読み込み
2. S3バケット (`price-comparison-images-533267394861`) にアップロード
3. DynamoDBの各製品の `imageUrl` フィールドを更新

アップロード後、画像URLは以下の形式になります：
```
https://price-comparison-images-533267394861.s3.ap-northeast-1.amazonaws.com/hoka/HOKA-SPEEDGOAT5/[hash].jpg
```

### 4. フロントエンドで確認

ブラウザで以下にアクセスして画像が表示されることを確認：
```
https://d20dyv94x2mgkq.cloudfront.net
```

ブランドフィルタで「HOKA」を選択して、実際の製品画像が表示されるか確認してください。

## トラブルシューティング

### 画像ファイルが見つからない

```
❌ Failed: File not found: D:\dev\compare\scripts\images\hoka\speedgoat-5-men.jpg
```

→ 画像を正しいディレクトリに保存してください。

### S3アップロードエラー

```
❌ Failed to upload: AccessDenied
```

→ AWS認証情報を確認してください：
```powershell
$env:AWS_PROFILE="hikaku-dev"
aws s3 ls s3://price-comparison-images-533267394861/
```

### DynamoDB更新エラー

→ テーブル名とリージョンが正しいか確認してください。

## 代替方法：直接S3にアップロード

スクリプトを使わずに直接アップロードすることもできます：

```powershell
$env:AWS_PROFILE="hikaku-dev"

# 画像をS3にアップロード
aws s3 cp scripts/images/hoka/speedgoat-5-men.jpg `
  s3://price-comparison-images-533267394861/hoka/HOKA-SPEEDGOAT5/main.jpg `
  --content-type "image/jpeg" `
  --cache-control "public, max-age=31536000"

# DynamoDBを手動で更新（AWS Consoleから）
# または update-hoka-images.ts を修正して実行
```

## 今後の改善案

1. **CloudFront Distribution**: S3の直URLではなくCloudFront経由で配信
2. **画像最適化**: アップロード時にリサイズ・圧縮
3. **自動スクレイピング**: Puppeteerを使用してブラウザ経由で画像取得
