# ✅ Task 17 完了: モニタリングとロギングの設定

## 実装完了日

2025年10月26日

## 実装内容

### ✅ 17.1 CloudWatch ダッシュボードの作成

**ファイル:** `lib/price-comparison-stack.ts`

**実装内容:**

- Lambda 関数のメトリクス（呼び出し、エラー、期間、スロットル）を追加
- API Gateway のメトリクス（リクエスト、レイテンシ、エラー）を追加
- DynamoDB のメトリクス（読み取り/書き込み容量、エラー）を追加
- ダッシュボード名: `PriceComparisonMonitoring`

**監視対象:**

- GetProductsFunction
- GetProductDetailFunction
- GetPricesFunction
- UpdatePricesFunction
- API Gateway (PriceComparisonApi)
- DynamoDB (PriceComparisonTable)

### ✅ 17.2 CloudWatch アラームの設定

**ファイル:** `lib/price-comparison-stack.ts`

**実装内容:**

- Lambda 関数のエラー率アラーム（> 5%）を作成
  - GetProductsErrorAlarm
  - GetProductDetailErrorAlarm
  - GetPricesErrorAlarm
- UpdatePrices 関数の失敗アラーム（≥ 1 エラー）を作成
  - UpdatePricesErrorAlarm
- API Gateway 5xx エラーアラーム（> 10 エラー/5分）を作成
  - ApiServerErrorAlarm

**アラーム設定:**

- 評価期間: 2 回連続（UpdatePrices は 1 回）
- 欠損データの扱い: NOT_BREACHING
- CloudFormation 出力に ARN を追加

### ✅ 17.3 構造化ロギングの実装

**新規ファイル:**

- `lambda/layers/shared/nodejs/logger.ts` - Logger ユーティリティ

**更新ファイル:**

- `lambda/get-products/index.ts`
- `lambda/get-product-detail/index.ts`
- `lambda/get-prices/index.ts`
- `lambda/update-prices/index.ts`

**Logger 機能:**

- JSON 形式の構造化ログ出力
- ログレベル管理（DEBUG, INFO, WARN, ERROR）
- リクエスト ID とタイムスタンプの自動付与
- コンテキスト情報の追加機能
- エラーオブジェクトの適切なシリアライズ

**ログ出力例:**

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
    "hasMore": false
  }
}
```

## 変更されたファイル

```
lib/price-comparison-stack.ts                      (更新)
lambda/layers/shared/nodejs/logger.ts              (新規)
lambda/get-products/index.ts                       (更新)
lambda/get-product-detail/index.ts                 (更新)
lambda/get-prices/index.ts                         (更新)
lambda/update-prices/index.ts                      (更新)
.kiro/specs/.../task-17-summary.md                 (新規)
.kiro/specs/.../MONITORING_QUICK_REFERENCE.md      (新規)
.kiro/specs/.../TASK_17_COMPLETE.md                (新規)
```

## デプロイ手順

### 1. ビルド

```bash
npm run build
```

### 2. デプロイ

```bash
cdk deploy
```

### 3. 確認

```bash
# ダッシュボード URL を取得
aws cloudformation describe-stacks --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" \
  --output text

# アラーム一覧を確認
aws cloudwatch describe-alarms --alarm-name-prefix "PriceComparison-"

# ログを確認
aws logs tail /aws/lambda/PriceComparisonStack-GetProductsFunction --follow
```

## テスト方法

### ダッシュボードの確認

1. AWS コンソールにログイン
2. CloudWatch > ダッシュボード > PriceComparisonMonitoring を開く
3. すべてのウィジェットが表示されることを確認

### アラームの確認

1. CloudWatch > アラーム を開く
2. "PriceComparison-" で始まるアラームが 5 つあることを確認
3. すべてのアラームが "OK" 状態であることを確認

### 構造化ログの確認

```bash
# Lambda 関数を実行
aws lambda invoke \
  --function-name PriceComparisonStack-GetProductsFunction \
  --payload '{"httpMethod":"GET","path":"/products","requestContext":{"requestId":"test-123"}}' \
  response.json

# ログを確認（JSON 形式で出力されているか）
aws logs tail /aws/lambda/PriceComparisonStack-GetProductsFunction --format short
```

### CloudWatch Logs Insights でクエリ

```
fields @timestamp, level, message, requestId
| filter level = "INFO"
| sort @timestamp desc
| limit 20
```

## 検証結果

✅ **ビルド成功**: TypeScript コンパイルエラーなし
✅ **CDK 構文チェック**: 問題なし
✅ **ダッシュボード定義**: 正常に作成
✅ **アラーム定義**: 正常に作成
✅ **Logger ユーティリティ**: 実装完了
✅ **全 Lambda 関数**: 構造化ロギング適用完了

## 関連ドキュメント

- [Task 17 完了サマリー](./task-17-summary.md) - 詳細な実装内容と使用方法
- [モニタリング クイックリファレンス](./MONITORING_QUICK_REFERENCE.md) - 日常的な監視作業のガイド
- [デプロイメントガイド](../../DEPLOYMENT.md) - システム全体のデプロイ手順

## 次のタスク

### Task 18: ドキュメントとデプロイメントガイドの作成

- プロジェクト全体の README 更新
- アーキテクチャ図の追加
- デプロイメント手順の詳細化
- アフィリエイト ID 設定ガイド
- ローカル開発環境のセットアップガイド

## 備考

### SNS 通知の追加（オプション）

アラームが発火した際にメールや Slack に通知を送るには、SNS トピックを作成してアラームに追加してください。

```typescript
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';

const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
  displayName: 'Price Comparison Alarms',
});

// メールサブスクリプションを追加
new sns.Subscription(this, 'EmailSubscription', {
  topic: alarmTopic,
  protocol: sns.SubscriptionProtocol.EMAIL,
  endpoint: 'your-email@example.com',
});

// アラームに追加
updatePricesErrorAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
apiServerErrorAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
```

### ログ保持期間の調整

現在、ログ保持期間は 30 日に設定されています。コスト削減のために短縮するか、コンプライアンス要件に応じて延長してください。

```typescript
logRetention: logs.RetentionDays.ONE_WEEK,  // 7 日間
// または
logRetention: logs.RetentionDays.SIX_MONTHS,  // 6 ヶ月
```

## まとめ

Task 17 の実装により、システムの可観測性が大幅に向上しました。CloudWatch ダッシュボードで主要メトリクスを一元管理でき、アラームにより問題を自動検出し、構造化ロギングにより詳細な調査が可能になりました。

これで本番環境での安全な運用が可能になります！ 🎉
