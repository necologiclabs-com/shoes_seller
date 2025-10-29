# セットアップガイド

## 初期セットアップ手順

### 1. 依存関係のインストール

プロジェクトルートで以下のコマンドを実行してください：

```bash
npm install
```

### 2. Lambda関数の依存関係をインストール

各Lambda関数ディレクトリで依存関係をインストールします：

```bash
cd lambda/get-products
npm install
cd ../get-product-detail
npm install
cd ../get-prices
npm install
cd ../..
```

### 3. TypeScriptのビルド

```bash
npm run build
```

### 4. CDKスタックの合成確認

```bash
npm run synth
```

### 5. AWSへのデプロイ

初回デプロイ時はCDKのブートストラップが必要な場合があります：

```bash
# 初回のみ（AWSアカウントとリージョンごとに1回）
npx cdk bootstrap

# デプロイ
npm run deploy
```

## 開発環境の確認

### TypeScriptのコンパイルチェック

```bash
npm run build
```

### コードフォーマット

```bash
npm run format
```

### リント

```bash
npm run lint
```

## トラブルシューティング

### AWS認証情報が設定されていない場合

```bash
aws configure
```

### CDKのバージョンが古い場合

```bash
npm install -g aws-cdk@latest
```

### Lambda関数のビルドエラー

各Lambda関数ディレクトリで個別にビルドを確認：

```bash
cd lambda/get-products
npx tsc
```

## 次のステップ

1. DynamoDBテーブルの作成確認
2. API Gatewayエンドポイントの確認
3. Lambda関数の実装
4. 価格取得サービスの実装
5. フロントエンドの開発

## 環境変数

現在、環境変数は不要です。将来的に以下が必要になる可能性があります：

- アフィリエイトID（Systems Manager Parameter Storeに保存）
- 外部API認証情報（Secrets Managerに保存）
