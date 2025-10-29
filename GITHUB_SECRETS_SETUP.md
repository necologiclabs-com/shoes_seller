# GitHub Secrets 設定ガイド

GitHub ActionsでAWSにデプロイするために必要なSecretsを設定します。

## 必要なSecrets

### 1. AWS_ACCESS_KEY_ID
**説明**: AWSアクセスキーID

**取得方法**:
1. AWS IAMコンソールにログイン
2. ユーザー > セキュリティ認証情報
3. アクセスキーを作成
4. アクセスキーIDをコピー

**必要な権限**:
- CloudFormation: フルアクセス
- Lambda: フルアクセス
- API Gateway: フルアクセス
- DynamoDB: フルアクセス
- S3: フルアクセス
- CloudFront: フルアクセス
- IAM: ロール作成・管理

### 2. AWS_SECRET_ACCESS_KEY
**説明**: AWSシークレットアクセスキー

**取得方法**:
1. アクセスキー作成時に表示される
2. シークレットアクセスキーをコピー
3. **注意**: 作成時にしか確認できないため、必ず保存してください

### 3. AWS_ACCOUNT_ID
**説明**: AWSアカウントID（12桁の数字）

**取得方法**:
1. AWSコンソール右上のアカウント名をクリック
2. アカウントIDをコピー（例: 123456789012）

### 4. VITE_API_BASE_URL
**説明**: API GatewayのエンドポイントURL

**取得方法**:
```bash
# CDKデプロイ後に取得
aws cloudformation describe-stacks \
  --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

または、CloudFormationコンソールの「出力」タブから確認

**形式**: `https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/`
（最後の`/`を含める）

## GitHub SecretsへのADD方法

### ステップ1: GitHubリポジトリに移動
```
https://github.com/necologiclabs-com/shoes_seller/settings/secrets/actions
```

### ステップ2: 各Secretを追加

1. **New repository secret** ボタンをクリック
2. **Name** に Secret名を入力（大文字・小文字を正確に）
3. **Value** に値を入力
4. **Add secret** をクリック

各Secretについて繰り返します：

```
Name: AWS_ACCESS_KEY_ID
Value: AKIA...（あなたのアクセスキーID）

Name: AWS_SECRET_ACCESS_KEY
Value: xxxxx...（あなたのシークレットキー）

Name: AWS_ACCOUNT_ID
Value: 123456789012（あなたのアカウントID）

Name: VITE_API_BASE_URL
Value: https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
```

## CDK Bootstrapの実行

初回デプロイ前に、以下のコマンドでCDK Bootstrapを実行してください：

```bash
# AWS認証情報を設定
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=ap-northeast-1

# CDK Bootstrap実行
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-northeast-1
```

これにより、CDKが必要なS3バケットやIAMロールが作成されます。

## 手動デプロイの実行

GitHub Actionsをトリガーする前に、ローカルで一度デプロイを確認することをお勧めします：

```bash
# ビルド
npm run build

# CDKデプロイ
npm run deploy

# API URLを取得
aws cloudformation describe-stacks \
  --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# 取得したURLをVITE_API_BASE_URLとしてGitHub Secretsに追加
```

## トラブルシューティング

### エラー: "User is not authorized to perform: cloudformation:CreateStack"
→ IAMユーザーに十分な権限がありません。管理者に権限を追加してもらってください。

### エラー: "CDK bootstrap is required"
→ CDK Bootstrapを実行してください（上記参照）

### エラー: "Stack already exists"
→ 既存のスタックを削除するか、更新してください：
```bash
aws cloudformation delete-stack --stack-name PriceComparisonStack
```

### GitHub Actionsが失敗する
→ Actions タブでログを確認し、エラーメッセージを確認してください
→ Secretsが正しく設定されているか再確認してください

## 検証

Secretsが正しく設定されているか確認するには：

1. GitHubリポジトリのActionsタブに移動
2. 最新のワークフロー実行を確認
3. すべてのジョブが成功していることを確認

または、mainブランチに小さな変更をプッシュしてテスト：

```bash
# READMEに空行を追加してプッシュ
echo "" >> README.md
git add README.md
git commit -m "Test CI/CD pipeline"
git push origin main
```

これでGitHub ActionsがトリガーされてCI/CDパイプラインが実行されます。
