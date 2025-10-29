# HOKA製品画像 - 手動ダウンロード手順

## なぜ手動ダウンロードが必要か？

HOKA公式サイトは以下のセキュリティ対策により、自動的な画像取得を防止しています：

1. **ホットリンク防止**: 外部サイトから画像URLに直接アクセスできない
2. **Bot検出**: 自動スクレイピングツールをブロック
3. **Cloudflare保護**: 高度なbot対策を実装

そのため、**ブラウザで手動ダウンロードする必要があります**。

---

## 📥 画像ダウンロード手順

### 1. Speedgoat 5 (Men)

1. ブラウザで開く: https://www.hoka.com/en/us/mens-trail/speedgoat-5/195719270445.html
2. メイン製品画像（大きい画像）を右クリック
3. 「名前を付けて画像を保存」を選択
4. 保存先: `D:\dev\compare\scripts\images\hoka\speedgoat-5-men.jpg`

### 2. Speedgoat 5 (Women)

1. ブラウザで開く: https://www.hoka.com/en/us/womens-trail/speedgoat-5/195719270605.html
2. メイン製品画像を右クリック → 保存
3. 保存先: `D:\dev\compare\scripts\images\hoka\speedgoat-5-women.jpg`

### 3. Tecton X 2

1. ブラウザで開く: https://www.hoka.com/en/us/mens-trail/tecton-x-2/195719757892.html
2. メイン製品画像を右クリック → 保存
3. 保存先: `D:\dev\compare\scripts\images\hoka\tecton-x2.jpg`

### 4. Zinal

1. ブラウザで開く: https://www.hoka.com/en/us/mens-trail/zinal/195719270063.html
2. メイン製品画像を右クリック → 保存
3. 保存先: `D:\dev\compare\scripts\images\hoka\zinal.jpg`

---

## 🚀 アップロードスクリプト実行

画像を4つダウンロードしたら、以下のコマンドを実行してS3にアップロードしてDynamoDBを更新します：

```powershell
# 1. AWS認証情報を設定
$env:AWS_PROFILE="hikaku-dev"

# 2. スクリプト実行
cd D:\dev\compare
npx ts-node scripts/upload-local-hoka-images.ts
```

### 期待される出力

```
🔑 Using AWS Profile: hikaku-dev
📦 S3 Bucket: price-comparison-images-533267394861
📊 DynamoDB Table: PriceComparisonTable
🌏 Region: ap-northeast-1

📁 Images directory: D:\dev\compare\scripts\images\hoka

📸 Uploading HOKA product images...

🖼️  Processing: Speedgoat 5 (Men)
   Product ID: HOKA-SPEEDGOAT5
   Local file: speedgoat-5-men.jpg
📂 Reading file: D:\dev\compare\scripts\images\hoka\speedgoat-5-men.jpg
📤 Uploading to S3: hoka/HOKA-SPEEDGOAT5/abc12345.jpg (245678 bytes)
✅ Uploaded successfully: https://...
🔄 Updating DynamoDB: HOKA-SPEEDGOAT5
✅ Updated DynamoDB: HOKA-SPEEDGOAT5

...（他の製品も同様）

============================================================
🎉 Processing completed!
✅ Successfully processed: 4
❌ Failed: 0
============================================================
```

---

## ✅ 確認

1. **S3を確認**:
   ```powershell
   $env:AWS_PROFILE="hikaku-dev"
   aws s3 ls s3://price-comparison-images-533267394861/hoka/ --recursive
   ```

2. **DynamoDBを確認**:
   ```powershell
   aws dynamodb get-item `
     --table-name PriceComparisonTable `
     --key '{"PK":{"S":"PRODUCT#HOKA-SPEEDGOAT5"},"SK":{"S":"METADATA"}}' `
     --query 'Item.imageUrl.S'
   ```

3. **フロントエンドで確認**:
   - ブラウザで開く: https://d20dyv94x2mgkq.cloudfront.net
   - ブランドフィルタで「HOKA」を選択
   - 実際のシューズ画像が表示されるはず

---

## 🔧 トラブルシューティング

### ファイルが見つからないエラー

```
❌ Failed: File not found: D:\dev\compare\scripts\images\hoka\speedgoat-5-men.jpg
```

**解決策**: ファイル名とパスが正しいか確認してください。

### S3アップロードエラー

```
❌ Failed to upload: AccessDenied
```

**解決策**: AWS認証情報を確認：
```powershell
$env:AWS_PROFILE="hikaku-dev"
aws sts get-caller-identity
```

### 画像が表示されない

**解決策**:
1. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）
2. S3バケットのURLが正しいか確認
3. S3バケットのCORS設定を確認

---

## 📝 画像要件

- **形式**: JPEG推奨（PNG/WebPも可）
- **サイズ**: 推奨 800x800px 以上
- **ファイル名**: 上記の通り（ハイフン区切り、小文字）
- **背景**: できれば白背景の製品画像

---

## 💡 今後の改善案

将来的には以下の方法で自動化できる可能性があります：

1. **Puppeteer/Playwright**: ヘッドレスブラウザで画像を取得
2. **公式API**: HOKAが提供する可能性のあるProduct API
3. **パートナー契約**: HOKA公式とのデータ連携
4. **代替画像ソース**: Amazon/楽天の商品画像を使用
