# GitHub Actions CI/CD Setup

このプロジェクトはGitHub Actionsを使用して自動テストとデプロイを行います。

## 必要なGitHub Secrets

以下のSecretsをGitHubリポジトリに設定してください：

### AWS認証情報
- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWSシークレットアクセスキー
- `AWS_ACCOUNT_ID`: AWSアカウントID（12桁の数字）

### フロントエンド設定
- `VITE_API_BASE_URL`: API GatewayのURL（例: `https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod/`）

## Secretsの設定方法

1. GitHubリポジトリのページに移動
2. **Settings** > **Secrets and variables** > **Actions**
3. **New repository secret** をクリック
4. 各Secretを追加

## ワークフロー

### CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

#### トリガー
- `main`または`develop`ブランチへのプッシュ
- `main`ブランチへのプルリクエスト

#### ジョブ

1. **test**: コードのテストとビルド
   - リンター実行
   - TypeScriptビルド
   - テスト実行

2. **build-frontend**: フロントエンドのビルド
   - 依存関係のインストール
   - Viteビルド実行
   - ビルド成果物をアーティファクトとして保存

3. **deploy-infrastructure**: インフラストラクチャのデプロイ（mainブランチのみ）
   - CDK Synth
   - CDK Deploy
   - Lambda関数とAPI Gatewayをデプロイ

4. **deploy-frontend**: フロントエンドのデプロイ（mainブランチのみ）
   - ビルド成果物をS3にアップロード
   - CloudFrontキャッシュを無効化

## ローカル開発

ローカルで開発する場合は、以下の手順を実行してください：

```bash
# 依存関係のインストール
npm install
cd frontend && npm install

# TypeScriptビルド
cd ..
npm run build

# CDKデプロイ（初回のみ）
npm run deploy

# フロントエンドデプロイ
npm run deploy:frontend
```

## デプロイフロー

### mainブランチへのプッシュ時
1. テスト実行
2. フロントエンドビルド
3. CDKでインフラストラクチャをデプロイ
4. フロントエンドをS3にデプロイ
5. CloudFrontキャッシュを無効化

### プルリクエスト時
1. テスト実行
2. フロントエンドビルド
3. デプロイはスキップ

## トラブルシューティング

### デプロイが失敗する場合

1. **AWS認証情報の確認**
   - Secretsが正しく設定されているか確認
   - IAMユーザーに適切な権限があるか確認

2. **CDK Bootstrap**
   - 初回デプロイ前に、AWS環境でCDK Bootstrapが必要
   ```bash
   npx cdk bootstrap aws://ACCOUNT_ID/REGION
   ```

3. **CloudFormationスタックの状態確認**
   - AWSコンソールでCloudFormationスタックの状態を確認
   - エラーがある場合は、スタックをロールバックまたは削除

### ビルドが失敗する場合

1. **依存関係の確認**
   ```bash
   npm ci
   cd frontend && npm ci
   ```

2. **TypeScriptエラー**
   ```bash
   npm run build
   ```

## モニタリング

- GitHub Actions: 各ワークフローの実行状況を確認
- AWS CloudWatch: Lambda関数のログとメトリクスを確認
- CloudFormation: スタックのデプロイ状況を確認
