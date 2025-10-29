# E2E Testing Guide - トレイルランニング価格比較サイト

## 概要

このドキュメントは、Task 16（エンドツーエンド統合とテスト）の実行方法を説明します。

## 前提条件

### 必須

- AWS CLIがインストールされ、設定されていること
- Node.js 20.x以上がインストールされていること
- バックエンドがデプロイされていること（Task 1-7完了）
- フロントエンドがデプロイされていること（Task 8-14完了）
- 商品データがシードされていること（Task 15完了）

### 確認コマンド

```powershell
# AWS CLIの確認
aws --version

# Node.jsの確認
node --version

# スタックの確認
aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].StackStatus"
```

## Task 16.1: 完全なユーザーフローの手動テスト

### ステップ 1: 自動検証スクリプトの実行

まず、自動検証スクリプトを実行して、システムの基本的な動作を確認します。

#### Windows (PowerShell)

```powershell
# 依存関係のインストール（初回のみ）
npm install

# E2E検証スクリプトの実行
npm run verify:e2e

# または直接実行
.\scripts\verify-e2e.ps1
```

#### macOS/Linux (Bash)

```bash
# 依存関係のインストール（初回のみ）
npm install

# スクリプトに実行権限を付与
chmod +x scripts/verify-e2e.sh

# E2E検証スクリプトの実行
./scripts/verify-e2e.sh
```

#### TypeScript版（クロスプラットフォーム）

```bash
npm run verify:e2e
```

### ステップ 2: フロントエンドURLの取得

```powershell
# CloudFront URLを取得
aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text
```

### ステップ 3: 手動テストの実行

詳細な手動テスト手順は以下のドキュメントを参照してください：

📄 **[task-16-e2e-testing-guide.md](./task-16-e2e-testing-guide.md)**

#### 主要なテストシナリオ

1. **ホームページから商品一覧を表示**
   - ページが3秒以内に読み込まれる
   - 商品カードが正しく表示される
   - レスポンシブデザインが機能する

2. **商品詳細ページへの遷移**
   - スムーズに遷移する
   - 商品情報が正確に表示される
   - URLが正しい形式

3. **4つのプラットフォームの価格比較**
   - 全プラットフォームの価格が表示される
   - 最安値がハイライトされる
   - 節約額が計算される

4. **アフィリエイトリンクのクリック**
   - 新しいタブで開く
   - 正しいURLにアフィリエイトパラメータが含まれる
   - 商品ページに遷移する

### チェックリスト

- [ ] 自動検証スクリプトが全てパス
- [ ] ホームページが正常に表示される
- [ ] 商品一覧が表示される
- [ ] 商品詳細ページに遷移できる
- [ ] 価格比較が正しく表示される
- [ ] 最安値がハイライトされる
- [ ] アフィリエイトリンクが機能する
- [ ] レスポンシブデザインが機能する（モバイル、タブレット、デスクトップ）
- [ ] キーボードナビゲーションが機能する
- [ ] エラーがコンソールに表示されない

## Task 16.2: 価格更新フローのテスト

### ステップ 1: UpdatePricesFunction の手動トリガー

```powershell
# Lambda関数を直接呼び出し
aws lambda invoke --function-name PriceComparisonStack-UpdatePricesFunction --payload '{}' response.json

# レスポンスを確認
Get-Content response.json | ConvertFrom-Json
```

### ステップ 2: CloudWatch Logsの確認

```powershell
# 最新のログストリームを取得
$logStream = aws logs describe-log-streams --log-group-name /aws/lambda/PriceComparisonStack-UpdatePricesFunction --order-by LastEventTime --descending --max-items 1 --query "logStreams[0].logStreamName" --output text

# ログを表示
aws logs get-log-events --log-group-name /aws/lambda/PriceComparisonStack-UpdatePricesFunction --log-stream-name $logStream --limit 50
```

### ステップ 3: DynamoDBの価格データ確認

```powershell
# 特定商品の価格データを確認
aws dynamodb query --table-name PriceComparisonTable --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" --expression-attribute-values '{":pk":{"S":"PRODUCT#salomon-speedcross-6"},":sk":{"S":"PRICE#"}}'
```

### ステップ 4: フロントエンドで確認

1. ブラウザで商品詳細ページを開く
2. ページをリロード（Ctrl+F5 / Cmd+Shift+R）
3. 価格データが更新されていることを確認
4. 最終更新日時が最新になっていることを確認

### チェックリスト

- [ ] UpdatePricesFunction が正常に実行される
- [ ] CloudWatch Logsにエラーがない
- [ ] 全プラットフォームから価格が取得される
- [ ] DynamoDBに価格データが保存される
- [ ] lastUpdatedタイムスタンプが更新される
- [ ] フロントエンドに更新された価格が表示される
- [ ] エラーが発生した場合、適切にログに記録される

## Task 16.3: エラーシナリオのテスト

### シナリオ 1: ネットワークエラーのシミュレーション

1. ブラウザの開発者ツールを開く（F12）
2. Networkタブを選択
3. 「Offline」モードに設定
4. ページをリロード

**期待される動作:**

- エラーメッセージが表示される
- リトライボタンが表示される
- アプリケーションがクラッシュしない

### シナリオ 2: 商品が見つからないケース

```powershell
# 存在しない商品IDでアクセス
# ブラウザで以下のURLを開く
# https://<CloudFront-URL>/products/non-existent-product
```

**期待される動作:**

- 「商品が見つかりません」メッセージが表示される
- ホームページに戻るリンクが表示される
- 404ステータスコードが返される

### シナリオ 3: プラットフォームが利用できないケース

```powershell
# 特定プラットフォームの価格データを一時的に削除
aws dynamodb delete-item --table-name PriceComparisonTable --key '{
  "PK": {"S": "PRODUCT#salomon-speedcross-6"},
  "SK": {"S": "PRICE#amazon"}
}'
```

**期待される動作:**

- 利用できないプラットフォームに「取扱なし」と表示される
- 他のプラットフォームの価格は正常に表示される
- 最安値の判定が正しく動作する

### シナリオ 4: APIタイムアウト

開発者ツールのNetworkタブで「Slow 3G」を選択してテスト

**期待される動作:**

- ローディング状態が表示される
- タイムアウト後、エラーメッセージが表示される
- リトライオプションが提供される

### チェックリスト

- [ ] ネットワークエラーが適切に処理される
- [ ] 404エラーが適切に表示される
- [ ] プラットフォーム利用不可が適切に処理される
- [ ] タイムアウトが適切に処理される
- [ ] エラーメッセージがユーザーフレンドリー
- [ ] リトライ機能が動作する
- [ ] アプリケーションがクラッシュしない

## トラブルシューティング

### 問題: 自動検証スクリプトが失敗する

**解決策:**

1. AWS CLIの認証情報を確認

   ```powershell
   aws sts get-caller-identity
   ```

2. スタックがデプロイされているか確認

   ```powershell
   aws cloudformation describe-stacks --stack-name PriceComparisonStack
   ```

3. 依存関係を再インストール
   ```powershell
   npm install
   ```

### 問題: フロントエンドが表示されない

**解決策:**

1. CloudFront URLを確認

   ```powershell
   aws cloudformation describe-stacks --stack-name PriceComparisonStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" --output text
   ```

2. S3バケットにファイルがあるか確認

   ```powershell
   aws s3 ls s3://<bucket-name>/ --recursive
   ```

3. CloudFrontキャッシュを無効化
   ```powershell
   npm run deploy:frontend
   ```

### 問題: 価格データが表示されない

**解決策:**

1. DynamoDBに価格データがあるか確認

   ```powershell
   aws dynamodb scan --table-name PriceComparisonTable --filter-expression "begins_with(SK, :sk)" --expression-attribute-values '{":sk":{"S":"PRICE#"}}' --max-items 5
   ```

2. UpdatePricesFunction を実行

   ```powershell
   aws lambda invoke --function-name PriceComparisonStack-UpdatePricesFunction --payload '{}' response.json
   ```

3. CloudWatch Logsでエラーを確認
   ```powershell
   aws logs tail /aws/lambda/PriceComparisonStack-UpdatePricesFunction --follow
   ```

### 問題: アフィリエイトリンクが機能しない

**解決策:**

1. Parameter Storeにアフィリエイト設定があるか確認

   ```powershell
   aws ssm get-parameters-by-path --path "/price-comparison/affiliate" --recursive
   ```

2. アフィリエイト設定を再設定
   ```powershell
   # 設定手順は lambda/layers/shared/nodejs/AFFILIATE_SETUP.md を参照
   ```

## テスト結果の記録

テスト結果は以下のドキュメントに記録してください：

📄 **[task-16-e2e-testing-guide.md](./task-16-e2e-testing-guide.md)** の「テスト結果の記録」セクション

## 次のステップ

全てのテストが完了したら：

1. ✅ Task 16.1 を完了としてマーク
2. ✅ Task 16.2 を完了としてマーク
3. ✅ Task 16.3 を完了としてマーク
4. ✅ Task 16 全体を完了としてマーク
5. 📋 Task 17（モニタリングとロギング）に進む
6. 📋 Task 18（ドキュメント作成）に進む

## 参考資料

- **詳細テストガイド**: [task-16-e2e-testing-guide.md](./task-16-e2e-testing-guide.md)
- **デプロイメントガイド**: [DEPLOYMENT.md](../../../DEPLOYMENT.md)
- **シードデータ手順**: [scripts/SEED_INSTRUCTIONS.md](../../../scripts/SEED_INSTRUCTIONS.md)
- **アフィリエイト設定**: [lambda/layers/shared/nodejs/AFFILIATE_SETUP.md](../../../lambda/layers/shared/nodejs/AFFILIATE_SETUP.md)
- **要件定義**: [requirements.md](./requirements.md)
- **設計ドキュメント**: [design.md](./design.md)

## サポート

問題が発生した場合は、以下を確認してください：

1. CloudWatch Logs
2. ブラウザの開発者ツール（Console、Network）
3. AWS CloudFormation スタックのイベント
4. DynamoDB テーブルのデータ

---

**Task 16 完了条件:**

- [ ] 全ての自動テストがパス
- [ ] 全ての手動テストシナリオが完了
- [ ] 全てのエラーシナリオが検証済み
- [ ] テスト結果が記録されている
- [ ] 発見された問題が文書化されている
