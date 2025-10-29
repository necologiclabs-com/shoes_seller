# GitHub Actions デプロイチェックリスト

このチェックリストを使用して、GitHub Actionsのセットアップが正しく完了しているか確認してください。

## ✅ 事前準備

- [ ] GitHubリポジトリが作成されている
  - URL: https://github.com/necologiclabs-com/shoes_seller
- [ ] ローカルリポジトリがGitHubにプッシュされている
  ```bash
  git remote -v
  # origin  https://github.com/necologiclabs-com/shoes_seller.git (fetch)
  # origin  https://github.com/necologiclabs-com/shoes_seller.git (push)
  ```
- [ ] AWSアカウントがある
- [ ] AWS CLIがインストールされている
- [ ] AWS認証情報が設定されている

## ✅ AWS IAMユーザー作成

- [ ] GitHub Actions用のIAMユーザーを作成
  - ユーザー名の例: `github-actions-deploy`
- [ ] 以下の権限を付与:
  - [ ] CloudFormation: フルアクセス
  - [ ] Lambda: フルアクセス
  - [ ] API Gateway: フルアクセス
  - [ ] DynamoDB: フルアクセス
  - [ ] S3: フルアクセス
  - [ ] CloudFront: フルアクセス
  - [ ] IAM: ロール作成・管理権限
  - [ ] EventBridge: ルール作成権限
  - [ ] CloudWatch: ログ作成権限
- [ ] アクセスキーを作成
  - [ ] アクセスキーIDを保存
  - [ ] シークレットアクセスキーを保存（**再表示不可**）

## ✅ CDK Bootstrap実行

- [ ] CDK Bootstrapを実行（初回のみ）
  ```bash
  npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-northeast-1
  ```
- [ ] Bootstrapの成功を確認
  - CloudFormationで`CDKToolkit`スタックが作成されている

## ✅ 初回手動デプロイ

- [ ] ローカルでビルド
  ```bash
  npm run build
  ```
- [ ] CDKデプロイ実行
  ```bash
  npm run deploy
  ```
- [ ] デプロイ成功を確認
  - CloudFormationで`PriceComparisonStack`が作成されている
- [ ] API URLを取得
  ```bash
  aws cloudformation describe-stacks \
    --stack-name PriceComparisonStack \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text
  ```
  - 結果をメモ: `https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/`

## ✅ GitHub Secrets設定

GitHub Settings > Secrets and variables > Actions で以下を設定:

- [ ] `AWS_ACCESS_KEY_ID`
  - 値: IAMユーザーのアクセスキーID
- [ ] `AWS_SECRET_ACCESS_KEY`
  - 値: IAMユーザーのシークレットアクセスキー
- [ ] `AWS_ACCOUNT_ID`
  - 値: AWSアカウントID（12桁の数字）
  - 確認方法: AWSコンソール右上のアカウント名をクリック
- [ ] `VITE_API_BASE_URL`
  - 値: 上記で取得したAPI URL（**最後に`/`を含める**）

## ✅ GitHub Actionsワークフロー確認

- [ ] `.github/workflows/ci-cd.yml` ファイルが存在する
- [ ] ワークフローファイルの内容を確認
  ```bash
  cat .github/workflows/ci-cd.yml
  ```

## ✅ 動作確認

### テストプッシュ

- [ ] 軽微な変更をコミット
  ```bash
  echo "" >> README.md
  git add README.md
  git commit -m "Test CI/CD pipeline"
  git push origin main
  ```
- [ ] GitHub Actionsが自動起動したことを確認
  - リポジトリの**Actions**タブを開く
  - 最新のワークフロー実行が表示される

### ワークフロー実行確認

- [ ] **test** ジョブが成功
  - リンター実行
  - TypeScriptビルド
  - テスト実行
- [ ] **build-frontend** ジョブが成功
  - フロントエンドビルド
  - アーティファクト保存
- [ ] **deploy-infrastructure** ジョブが成功（mainブランチのみ）
  - CDK Synth
  - CDK Deploy
- [ ] **deploy-frontend** ジョブが成功（mainブランチのみ）
  - S3アップロード
  - CloudFront キャッシュ無効化

### デプロイ結果確認

- [ ] CloudFormationでスタックが更新されている
- [ ] Lambda関数が最新のコードにデプロイされている
- [ ] フロントエンドがS3にアップロードされている
  ```bash
  aws s3 ls s3://price-comparison-frontend-xxxxx/ --recursive | head -10
  ```
- [ ] CloudFrontでキャッシュが無効化されている
- [ ] ブラウザでフロントエンドURLにアクセスして動作確認

## ✅ 継続的な運用

- [ ] mainブランチへのプッシュで自動デプロイされることを確認
- [ ] プルリクエスト作成時にCIが実行されることを確認
- [ ] エラー時のSlack/メール通知設定（オプション）
- [ ] 定期的なモニタリングとログ確認

## 🔧 トラブルシューティング

### ワークフローが失敗する場合

1. **Actions**タブで失敗したジョブをクリック
2. エラーログを確認
3. 一般的な原因:
   - [ ] GitHub Secretsが間違っている
   - [ ] IAM権限が不足している
   - [ ] CDK Bootstrapが未実行
   - [ ] `VITE_API_BASE_URL`の最後に`/`がない

### 確認コマンド

```bash
# GitHub Secretsが設定されているか確認（値は見えない）
# GitHubのUIで確認

# AWSアカウントID確認
aws sts get-caller-identity --query Account --output text

# スタック出力確認
aws cloudformation describe-stacks \
  --stack-name PriceComparisonStack \
  --query "Stacks[0].Outputs"

# 最新のワークフロー実行確認
gh run list --limit 1  # GitHub CLIが必要
```

## 📝 完了後のステップ

- [ ] このチェックリストを完了したことを記録
- [ ] チーム内でセットアップ手順を共有
- [ ] 定期的なデプロイフローを確立
- [ ] モニタリングとアラート設定を検討

---

**完了日**: _______________

**担当者**: _______________

**備考**: _______________
