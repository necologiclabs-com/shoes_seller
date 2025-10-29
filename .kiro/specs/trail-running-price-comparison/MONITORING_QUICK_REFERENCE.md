# モニタリング クイックリファレンス

## 🎯 クイックアクセス

### ダッシュボード

```bash
# ダッシュボード URL を取得
aws cloudformation describe-stacks --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='DashboardUrl'].OutputValue" \
  --output text
```

### ログの確認

```bash
# GetProducts のログ
aws logs tail /aws/lambda/PriceComparisonStack-GetProductsFunction --follow

# UpdatePrices のログ
aws logs tail /aws/lambda/PriceComparisonStack-UpdatePricesFunction --follow

# すべての Lambda 関数のログ
aws logs tail /aws/lambda/PriceComparisonStack- --follow
```

### アラームの状態確認

```bash
# すべてのアラームの状態
aws cloudwatch describe-alarms --alarm-name-prefix "PriceComparison-" \
  --query "MetricAlarms[*].[AlarmName,StateValue]" --output table

# アラーム中のもののみ
aws cloudwatch describe-alarms --state-value ALARM \
  --alarm-name-prefix "PriceComparison-"
```

## 📊 主要メトリクス

### Lambda 関数

| メトリクス  | 説明         | 正常範囲 |
| ----------- | ------------ | -------- |
| Invocations | 呼び出し回数 | -        |
| Errors      | エラー数     | < 5%     |
| Duration    | 実行時間     | < 3000ms |
| Throttles   | スロットル数 | 0        |

### API Gateway

| メトリクス | 説明               | 正常範囲      |
| ---------- | ------------------ | ------------- |
| Count      | リクエスト数       | -             |
| Latency    | レスポンス時間     | < 500ms (p95) |
| 4xxError   | クライアントエラー | < 10%         |
| 5xxError   | サーバーエラー     | < 1%          |

### DynamoDB

| メトリクス            | 説明           | 正常範囲 |
| --------------------- | -------------- | -------- |
| ConsumedReadCapacity  | 読み取り容量   | -        |
| ConsumedWriteCapacity | 書き込み容量   | -        |
| UserErrors            | ユーザーエラー | 0        |
| SystemErrors          | システムエラー | 0        |

## 🚨 アラーム一覧

| アラーム名                     | 条件            | 対応優先度 |
| ------------------------------ | --------------- | ---------- |
| UpdatePrices-Failed            | 1 エラー以上    | 🔴 最高    |
| API-High5xxErrors              | 10 エラー / 5分 | 🔴 高      |
| GetProducts-HighErrorRate      | 5 エラー / 5分  | 🟡 中      |
| GetProductDetail-HighErrorRate | 5 エラー / 5分  | 🟡 中      |
| GetPrices-HighErrorRate        | 5 エラー / 5分  | 🟡 中      |

## 🔍 便利な CloudWatch Logs Insights クエリ

### エラーログの検索

```
fields @timestamp, level, message, requestId, functionName
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

### 遅いリクエストの検索

```
fields @timestamp, @duration, path, httpMethod, requestId
| filter @duration > 1000
| sort @duration desc
| limit 20
```

### 価格更新ジョブのサマリー

```
fields @timestamp, totalProducts, successfulProducts, failedProducts
| filter message = "Price update job completed"
| sort @timestamp desc
| limit 10
```

### プラットフォーム別エラー率

```
fields @timestamp, platform, message
| filter message like /Failed to update/
| stats count() by platform
```

### リクエスト ID でトレース

```
fields @timestamp, level, message, data
| filter requestId = "your-request-id-here"
| sort @timestamp asc
```

## 🛠️ トラブルシューティング

### UpdatePrices 関数が失敗している

```bash
# 最新のエラーログを確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/PriceComparisonStack-UpdatePricesFunction \
  --filter-pattern "ERROR" \
  --max-items 10

# 手動で実行してテスト
aws lambda invoke \
  --function-name PriceComparisonStack-UpdatePricesFunction \
  --payload '{}' \
  response.json
```

### API が 5xx エラーを返している

```bash
# API Gateway のログを確認
aws logs tail /aws/apigateway/PriceComparisonApi --follow

# Lambda 関数のエラーを確認
aws logs filter-log-events \
  --log-group-name /aws/lambda/PriceComparisonStack-GetProductsFunction \
  --filter-pattern "ERROR"
```

### DynamoDB のスロットリング

```bash
# テーブルのメトリクスを確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=PriceComparisonTable \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## 📈 パフォーマンス最適化

### Lambda のコールドスタート削減

- Provisioned Concurrency の設定を検討
- Lambda レイヤーのサイズを最小化
- 不要な依存関係を削除

### API レスポンス時間の改善

- DynamoDB のクエリを最適化
- キャッシング戦略の見直し
- Lambda のメモリサイズを調整

### DynamoDB のコスト最適化

- アクセスパターンを分析
- GSI の使用状況を確認
- オンデマンドと Provisioned の比較

## 📞 エスカレーション

### 重大な問題（P0）

- UpdatePrices 関数が連続して失敗
- API が完全にダウン
- DynamoDB が利用不可

**対応:** 即座にオンコールエンジニアに連絡

### 高優先度の問題（P1）

- API の 5xx エラー率が 5% を超える
- Lambda 関数のエラー率が 10% を超える
- レスポンス時間が通常の 3 倍以上

**対応:** 1 時間以内に調査開始

### 中優先度の問題（P2）

- 一部のプラットフォームで価格取得が失敗
- API のレスポンス時間が遅い
- 散発的なエラー

**対応:** 営業時間内に調査

## 🔔 通知設定（推奨）

### SNS トピックの作成

```bash
# SNS トピックを作成
aws sns create-topic --name price-comparison-alarms

# メールアドレスをサブスクライブ
aws sns subscribe \
  --topic-arn arn:aws:sns:REGION:ACCOUNT:price-comparison-alarms \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### アラームに SNS を追加（CDK）

```typescript
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';

const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
  displayName: 'Price Comparison Alarms',
});

updatePricesErrorAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
```

## 📚 関連ドキュメント

- [Task 17 完了サマリー](./task-17-summary.md)
- [デプロイメントガイド](../../DEPLOYMENT.md)
- [README](../../README.md)
