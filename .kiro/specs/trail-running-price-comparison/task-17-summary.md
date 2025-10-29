# Task 17: モニタリングとロギングの設定 - 完了サマリー

## 概要

Task 17 では、システムの可観測性を向上させるために、CloudWatch ダッシュボード、アラーム、および構造化ロギングを実装しました。これにより、システムの健全性を監視し、問題を迅速に検出・対応できるようになります。

## 実装内容

### 17.1 CloudWatch ダッシュボードの作成 ✅

**実装場所:** `lib/price-comparison-stack.ts`

**追加されたメトリクス:**

#### Lambda 関数メトリクス

- **Invocations (呼び出し数)**: 各 Lambda 関数の呼び出し回数を 5 分間隔で集計
- **Errors (エラー数)**: 各 Lambda 関数のエラー発生回数
- **Duration (実行時間)**: 各 Lambda 関数の平均実行時間（ミリ秒）
- **Throttles (スロットル数)**: 同時実行制限によるスロットル発生回数

対象関数:

- GetProductsFunction
- GetProductDetailFunction
- GetPricesFunction
- UpdatePricesFunction

#### API Gateway メトリクス

- **Requests (リクエスト数)**: API への総リクエスト数
- **Latency (レイテンシ)**: API レスポンスの平均時間と p99 パーセンタイル
- **Errors (エラー数)**: 4xx クライアントエラーと 5xx サーバーエラーの発生回数

#### DynamoDB メトリクス

- **Read Capacity (読み取り容量)**: 消費された読み取り容量ユニット
- **Write Capacity (書き込み容量)**: 消費された書き込み容量ユニット
- **User Errors (ユーザーエラー)**: クライアント側のエラー（例: 無効なリクエスト）
- **System Errors (システムエラー)**: DynamoDB 側のエラー

**ダッシュボード名:** `PriceComparisonMonitoring`

**アクセス方法:**

```bash
# デプロイ後、CloudFormation の出力から DashboardUrl を確認
aws cloudformation describe-stacks --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" --output text
```

### 17.2 CloudWatch アラームの設定 ✅

**実装場所:** `lib/price-comparison-stack.ts`

**作成されたアラーム:**

#### 1. Lambda エラー率アラーム

各 Lambda 関数に対して、エラー率が 5% を超えた場合にアラートを発生させます。

- **GetProductsErrorAlarm**: GetProducts 関数のエラー監視
- **GetProductDetailErrorAlarm**: GetProductDetail 関数のエラー監視
- **GetPricesErrorAlarm**: GetPrices 関数のエラー監視

**設定:**

- 閾値: 5 エラー / 5 分間
- 評価期間: 2 回連続
- 統計: Sum

#### 2. UpdatePrices 関数エラーアラーム

価格更新処理の失敗を即座に検出します（最も重要なアラーム）。

- **UpdatePricesErrorAlarm**: UpdatePrices 関数の失敗監視

**設定:**

- 閾値: 1 エラー以上
- 評価期間: 1 回
- 統計: Sum
- 期間: 15 分間

#### 3. API Gateway 5xx エラーアラーム

API のサーバーエラーが 1% を超えた場合にアラートを発生させます。

- **ApiServerErrorAlarm**: API Gateway の 5xx エラー監視

**設定:**

- 閾値: 10 エラー / 5 分間
- 評価期間: 2 回連続
- 統計: Sum

**アラーム ARN の確認:**

```bash
# デプロイ後、CloudFormation の出力から確認
aws cloudformation describe-stacks --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?contains(OutputKey, 'Alarm')].{Key:OutputKey,Value:OutputValue}" \
  --output table
```

**SNS 通知の設定（オプション）:**
アラームに SNS トピックを追加することで、メール通知や Slack 通知を設定できます。

```typescript
// 例: SNS トピックの追加
const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
  displayName: 'Price Comparison Alarms',
});

updatePricesErrorAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
```

### 17.3 構造化ロギングの実装 ✅

**実装場所:**

- `lambda/layers/shared/nodejs/logger.ts` (新規作成)
- `lambda/get-products/index.ts` (更新)
- `lambda/get-product-detail/index.ts` (更新)
- `lambda/get-prices/index.ts` (更新)
- `lambda/update-prices/index.ts` (更新)

#### Logger ユーティリティ

**機能:**

- JSON 形式の構造化ログ出力
- ログレベル管理（DEBUG, INFO, WARN, ERROR）
- リクエスト ID とタイムスタンプの自動付与
- コンテキスト情報の追加
- エラーオブジェクトの適切なシリアライズ

**使用例:**

```typescript
import { createLogger } from '/opt/nodejs/logger';

// Lambda ハンドラー内でロガーを作成
const logger = createLogger(event.requestContext.requestId, {
  path: event.path,
  httpMethod: event.httpMethod,
});

// 情報ログ
logger.info('Processing request', {
  productId: 'prod-123',
  userId: 'user-456',
});

// エラーログ
logger.error('Failed to fetch data', error);

// コンテキストを追加した新しいロガー
const productLogger = logger.addContext({
  productId: product.id,
  productName: product.name,
});
```

**ログ出力形式:**

```json
{
  "timestamp": "2025-10-26T12:34:56.789Z",
  "level": "INFO",
  "message": "Products retrieved successfully",
  "requestId": "abc-123-def-456",
  "functionName": "GetProductsFunction",
  "path": "/products",
  "httpMethod": "GET",
  "data": {
    "count": 10,
    "hasMore": false,
    "brand": "Salomon",
    "category": "trail-running"
  }
}
```

#### 各 Lambda 関数への適用

**GetProductsFunction:**

- リクエスト開始時のログ
- 商品取得成功時のログ（件数、フィルター情報）
- nextToken エラー時のログ
- 一般エラー時のログ

**GetProductDetailFunction:**

- リクエスト開始時のログ
- 商品 ID 欠落時の警告ログ
- 商品未発見時の情報ログ
- 商品取得成功時のログ
- 一般エラー時のログ

**GetPricesFunction:**

- リクエスト開始時のログ
- 商品 ID 欠落時の警告ログ
- 商品未発見時の情報ログ
- 価格取得時のログ（プラットフォーム数）
- レスポンス準備完了時のログ
- 一般エラー時のログ

**UpdatePricesFunction:**

- ジョブ開始時のログ
- 商品ページ取得時のデバッグログ
- 各商品の価格更新開始時のログ
- プラットフォーム別の更新成功/失敗ログ
- ジョブ完了時のサマリーログ
- 致命的エラー時のログ

## デプロイ手順

### 1. CDK スタックのデプロイ

```bash
# ビルド
npm run build

# デプロイ（ダッシュボードとアラームが作成されます）
cdk deploy
```

### 2. デプロイ後の確認

```bash
# ダッシュボード URL の取得
aws cloudformation describe-stacks --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" \
  --output text

# アラーム一覧の確認
aws cloudwatch describe-alarms --alarm-name-prefix "PriceComparison-"
```

### 3. ログの確認

```bash
# GetProducts 関数のログを確認
aws logs tail /aws/lambda/PriceComparisonStack-GetProductsFunction --follow

# UpdatePrices 関数のログを確認
aws logs tail /aws/lambda/PriceComparisonStack-UpdatePricesFunction --follow

# 構造化ログのクエリ例（CloudWatch Logs Insights）
fields @timestamp, level, message, requestId, data
| filter level = "ERROR"
| sort @timestamp desc
| limit 20
```

## CloudWatch Logs Insights クエリ例

### エラーログの検索

```
fields @timestamp, level, message, requestId, functionName, data
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

### 特定の商品の処理ログ

```
fields @timestamp, level, message, productId, productName
| filter productId = "salomon-speedcross-5"
| sort @timestamp asc
```

### API レスポンス時間の分析

```
fields @timestamp, @duration, path, httpMethod
| filter path like /products/
| stats avg(@duration), max(@duration), min(@duration) by path
```

### 価格更新ジョブのサマリー

```
fields @timestamp, message, totalProducts, successfulProducts, failedProducts
| filter message = "Price update job completed"
| sort @timestamp desc
```

### プラットフォーム別の更新成功率

```
fields @timestamp, platform, message
| filter message = "Platform price updated successfully" or message = "Failed to update platform price"
| stats count() by platform, message
```

## 監視のベストプラクティス

### 1. ダッシュボードの定期確認

- 毎日、ダッシュボードを確認してシステムの健全性をチェック
- 異常なスパイクやトレンドの変化に注意

### 2. アラームへの対応

- **UpdatePricesErrorAlarm**: 最優先で対応。価格データが更新されていない可能性
- **Lambda エラーアラーム**: ユーザー体験に影響。早急に調査
- **API 5xx エラーアラーム**: システム障害の可能性。即座に対応

### 3. ログの活用

- エラー発生時は、requestId でログを追跡
- 定期的に ERROR レベルのログを確認
- パフォーマンス問題は duration メトリクスとログで分析

### 4. アラート通知の設定

- SNS トピックを作成し、アラームに追加
- メール、Slack、PagerDuty などに通知を送信
- オンコール体制の構築

## トラブルシューティング

### ダッシュボードが表示されない

```bash
# ダッシュボードの存在確認
aws cloudwatch list-dashboards

# ダッシュボードの詳細確認
aws cloudwatch get-dashboard --dashboard-name PriceComparisonMonitoring
```

### アラームが発火しない

```bash
# アラームの状態確認
aws cloudwatch describe-alarms --alarm-names PriceComparison-UpdatePrices-Failed

# アラームの履歴確認
aws cloudwatch describe-alarm-history --alarm-name PriceComparison-UpdatePrices-Failed
```

### ログが出力されない

- Lambda 関数の IAM ロールに CloudWatch Logs への書き込み権限があることを確認
- Lambda 関数のログ保持期間設定を確認（現在: 30 日）

## 次のステップ

### Task 18: ドキュメントとデプロイメントガイドの作成

- プロジェクト全体のドキュメント作成
- アーキテクチャ図の追加
- デプロイメント手順の詳細化
- アフィリエイト ID 設定ガイド
- ローカル開発環境のセットアップガイド

## 参考リンク

- [AWS CloudWatch ダッシュボード](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html)
- [AWS CloudWatch アラーム](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
- [CloudWatch Logs Insights クエリ構文](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [Lambda 関数のモニタリング](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions.html)

## まとめ

Task 17 の完了により、システムの可観測性が大幅に向上しました：

✅ **CloudWatch ダッシュボード**: Lambda、API Gateway、DynamoDB の主要メトリクスを一元管理
✅ **CloudWatch アラーム**: エラー率と重要な処理の失敗を自動検出
✅ **構造化ロギング**: JSON 形式の一貫したログで、問題の追跡と分析が容易に

これにより、本番環境でのシステム運用が安全かつ効率的に行えるようになりました。
