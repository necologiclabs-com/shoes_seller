## 目的

このファイルは、Code-writing AI（Copilot や同等のエージェント）がこのリポジトリで素早く生産的に動けるための最小限のガイドです。
実装の「なぜ」「どこ」「どうやって」を短く明示し、典型的な開発ワークフローと注意点（ビルド順、デプロイ手順、設計パターン）を示します。

---

## ビッグピクチャ（アーキテクチャ） — 必読ファイル

- インフラ（CDK）: `lib/price-comparison-stack.ts` — DynamoDB の単一テーブル設計（PK/SK + GSI `GSI1`）、Lambda、API Gateway、S3 + CloudFront、EventBridge スケジュールを定義。
- CDK エントリポイント: `bin/app.ts` — スタック作成と env の引き渡し。
- Lambda ハンドラ: `lambda/*` フォルダ群（例: `lambda/get-products`, `lambda/get-prices`, `lambda/get-product-detail`, `lambda/update-prices`） — API と DB の接続ロジック。
- 共有レイヤ: `lambda/layers/shared/nodejs` — ライブラリ（`repositories`, `logger`, `types` など）。ランタイムでは `/opt/nodejs/*` として参照される。
- フロントエンド: `frontend/src` — Vite + React + TypeScript。API 呼び出しは `frontend/src/lib/api-client.ts`、React Query フックは `frontend/src/hooks/useProducts.ts`。

注: ラムダは `handler: 'index.handler'` などで定義されているため、デプロイ前に各 `lambda/*` フォルダに実行可能な JS（通常は `index.js`）が存在していることが期待されます（下記「ビルド順」を参照）。

---

## 主要データフロー（簡潔）

1. **フロントエンド** → API Gateway（/products, /products/{id}, /products/{id}/prices）
2. **API Gateway** → 各 Lambda（`get-products`, `get-product-detail`, `get-prices`）
3. **Lambda** → DynamoDB（単一テーブル設計）
4. **価格更新**: `update-prices` が EventBridge スケジュール（6時間毎）で実行
5. **製品同期**: `sync-products` が EventBridge スケジュール（毎日2時）で Salomon JP サイトから製品情報を取得
6. **共有ロジック**: リポジトリ／ログ／型は Lambda Layer `lambda/layers/shared/nodejs` を通じて読み込まれる（`/opt/nodejs/*`）

**データソース**:
- 製品カタログ: Salomon JP 公式サイト（https://salomon.jp）から Shopify JSON API 経由で取得
- 価格情報: Amazon、楽天などのECサイトから取得（各プラットフォームの Lambda 関数）

---

## プロジェクト固有の開発ワークフロー（必ず守る順序）

1. 依存インストール・ビルド（TypeScript を JS にトランスパイルする）
   - ルートで（Windows のデフォルトシェルは PowerShell）:
     ```powershell
     npm install
     npm run build   # runs `tsc` - コンパイルして lambda の実行可能 JS を生成
     ```
   - 理由: CDK は `lambda.Code.fromAsset(path.join(__dirname, '../lambda/...'))` でディレクトリをそのままアップロードするため、デプロイ前に各 lambda フォルダ（および layer）が実行可能な JS を含む必要があります。

2. CDK の合成とデプロイ
   - synth/デプロイ:
     ```powershell
     npm run synth
     npm run deploy    # AWS 資格情報が必要
     ```
   - フロントエンドのみを配布する場合（PowerShell スクリプト利用）:
     ```powershell
     npm run deploy:frontend
     ```

3. フロントエンド開発
   - frontend フォルダで依存インストール・開発サーバ起動:
     ```powershell
     cd frontend
     npm install
     npm run dev
     ```
   - 環境変数: `frontend/.env.development` に `VITE_API_BASE_URL` を設定（`frontend/README.md` を参照）。

4. データシード（オプション）
   - ルート: `npm run seed:products`（`ts-node scripts/seed-products.ts` を使う）。

---

## コードベースで注意すべきプロジェクト固有の慣習・パターン

- **単一テーブル設計**: `PK`/`SK` と GSI1 (`GSI1PK`/`GSI1SK`) を使ってブランド検索等を実装している。DynamoDB のクエリ／スキャンの使い分けに注意（`lambda/get-products/index.ts` を参照）。
- **ページネーション**: nextToken は DynamoDB の lastEvaluatedKey を JSON にして base64 エンコードしている（フロント/バック双方でこの変換に依存）。
- **Lambda レイヤの利用**: ランタイム経路は `/opt/nodejs/...`。shared レイヤ内のコードが Lambda 実行時に必須なので、レイヤに TS 生ソースのみが残っていると実行時エラーになる。必ずビルドして JS を用意する。
- **SSM パラメータ**: アフィリエイト設定等は `ssm:/price-comparison/affiliate/*` を参照している（`lib/price-comparison-stack.ts` の IAM ポリシー設定を参照）。デプロイ時に必要なパラメータがあるか確認する。
- **API クライアント**: `frontend/src/lib/api-client.ts` を直接呼ぶ。例: `apiClient.getProducts()`、`getPrices(productId)`。
- **Salomon カタログ同期**: 
  - `salomon-jp-catalog-service.ts` を使用（Shopify JSON API ベース、HTML スクレイピングより信頼性が高い）
  - コレクションページから製品ハンドルを抽出 → 各製品の `.json` エンドポイントから詳細取得
  - レート制限（500ms間隔）、リトライロジック（指数バックオフ）、タイムアウト（30秒）を実装
  - 製品データには variants 配列（SKU、サイズ、色、価格、在庫状況）が含まれる

---

## デバッグの手がかり（どこを見ればよいか）

- **Lambda のログ**: CloudWatch（関数ごとのロググループ）。CDK では `logRetention` が指定されている。
- **API のエラー**: API Gateway のステージログ（`lib/price-comparison-stack.ts` の deployOptions による）と CloudWatch。
- **レイヤの問題**: Lambda 実行時に `Cannot find module '/opt/nodejs/...'` のようなエラーが出たら、レイヤのビルド／ファイル構成をチェック。`lambda/layers/shared/nodejs` に適切な JS があるか確認する。
- **循環依存エラー**: Lambda の `package.json` に `"trail-running-price-comparison": "file:../.."` のような循環参照がないか確認。Lambda 関数は独立した依存関係を持つべき。
- **UUID エラー**: Node.js 組み込みの `crypto.randomUUID()` を使用。外部の `uuid` パッケージは不要。

---

## よくある問題と解決方法

### Lambda で "Cannot find module" エラー
1. 該当 Lambda フォルダで `npx tsc -p tsconfig.json` を実行してビルド
2. shared レイヤも `npx tsc -p lambda/layers/shared/nodejs/tsconfig.json` でビルド
3. `node_modules` と `package-lock.json` を削除して `npm install` を再実行

### デプロイ時の認証エラー
```powershell
$env:AWS_PROFILE="hikaku-dev"
npm run deploy
```

### フロントエンドが API に接続できない
1. `frontend/.env.development` で `VITE_API_BASE_URL` を確認
2. API Gateway の URL は CloudFormation outputs で確認: `npm run synth` の出力または AWS コンソール

### カタログ同期が空の結果を返す
1. `scripts/test-salomon-jp-service.ts` でサービス単体をテスト
2. CloudWatch ログで詳細なエラーメッセージを確認
3. Salomon JP サイトの HTML 構造変更の可能性（Shopify JSON API は比較的安定）

---

## 環境変数・SSM パラメータ

### Lambda 環境変数（CDK で自動設定）
- `TABLE_NAME`: DynamoDB テーブル名
- `NODE_OPTIONS`: `--enable-source-maps`（デバッグ用）

### SSM パラメータ（手動設定が必要）
- `/price-comparison/affiliate/amazon/tracking-id` - Amazon アフィリエイト ID
- `/price-comparison/affiliate/rakuten/affiliate-id` - 楽天アフィリエイト ID
- その他: `AFFILIATE_CONFIGURATION.md` を参照

### フロントエンド環境変数
- `VITE_API_BASE_URL`: API Gateway の URL（例: `https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod/`）
- 設定ファイル: `frontend/.env.development`、`frontend/.env.production`

---

## すぐに役立つ参照（ファイル例）

- **インフラ**: `lib/price-comparison-stack.ts`
- **CDK エントリ**: `bin/app.ts`
- **Lambda 関数**: 
  - `lambda/get-products/index.ts` - 製品一覧取得
  - `lambda/get-product-detail/index.ts` - 製品詳細取得
  - `lambda/get-prices/index.ts` - 価格情報取得
  - `lambda/update-prices/index.ts` - 価格更新（6時間毎）
  - `lambda/sync-products/index.ts` - 製品カタログ同期（毎日2時）
- **共有レイヤ**: 
  - `lambda/layers/shared/nodejs/repositories.ts` - DynamoDB アクセス
  - `lambda/layers/shared/nodejs/salomon-jp-catalog-service.ts` - Salomon JP スクレイピング
  - `lambda/layers/shared/nodejs/logger.ts` - 構造化ログ
  - `lambda/layers/shared/nodejs/types.ts` - 型定義
  - `lambda/layers/shared/nodejs/entity-mapper.ts` - DynamoDB エンティティマッピング
- **フロントエンド**: 
  - `frontend/src/lib/api-client.ts` - API クライアント
  - `frontend/src/hooks/useProducts.ts` - React Query フック
- **スクリプト**: 
  - `scripts/deploy-frontend.ps1` - フロントエンドデプロイ
  - `scripts/seed-products.ts` - データシード
  - `scripts/test-salomon-jp-service.ts` - カタログサービステスト

---

もしこのドキュメントで不足している点（例: 環境変数の完全リスト、SSM パラメータのキー、レイヤのビルド手順の詳細など）があれば教えてください。必要に応じて具体的なコマンドやチェックリストを追記します。
