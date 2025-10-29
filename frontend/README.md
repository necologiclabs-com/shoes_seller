# トレイルランニングシューズ価格比較 - Frontend

React + TypeScript + Vite で構築されたフロントエンドアプリケーション。

## 技術スタック

- **React 19** - UI ライブラリ
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **TailwindCSS v4** - スタイリング
- **React Router** - ルーティング
- **TanStack Query (React Query)** - サーバー状態管理
- **ESLint** - コード品質
- **Prettier** - コードフォーマット

## セットアップ

### 前提条件

- Node.js 20.x 以上
- npm 10.x 以上

### インストール

```bash
npm install
```

### 環境変数

`.env.development` ファイルを作成し、API エンドポイントを設定します：

```bash
VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

開発環境では、デフォルトで `http://localhost:3000` が使用されます。

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

### リント

```bash
npm run lint
npm run lint:fix
```

### フォーマット

```bash
npm run format
npm run format:check
```

## プロジェクト構造

```
frontend/
├── src/
│   ├── lib/
│   │   └── api-client.ts      # API クライアント
│   ├── hooks/
│   │   └── useProducts.ts     # React Query フック
│   ├── pages/
│   │   ├── HomePage.tsx       # ホームページ
│   │   └── ProductDetailPage.tsx  # 商品詳細ページ
│   ├── App.tsx                # メインアプリケーション
│   ├── main.tsx               # エントリーポイント
│   └── index.css              # グローバルスタイル
├── public/                    # 静的ファイル
├── .env.example               # 環境変数の例
├── .env.development           # 開発環境の環境変数
├── tailwind.config.js         # Tailwind 設定
├── vite.config.ts             # Vite 設定
└── tsconfig.json              # TypeScript 設定
```

## デザインシステム

### カラーパレット

- **Primary**: Blue (信頼性と安定性)
- **Secondary**: Neutral grays
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Error**: Red (#ef4444)
- **Info**: Blue (#3b82f6)

### スペーシング

標準の Tailwind スペーシングスケールに加えて、以下のカスタムスペーシングを使用：

- `18`: 4.5rem
- `88`: 22rem
- `112`: 28rem
- `128`: 32rem

### タイポグラフィ

- **Font Family**: Inter, system-ui, sans-serif
- **見出し**: h1 (4xl), h2 (3xl), h3 (2xl), h4 (xl), h5 (lg), h6 (base)

## API クライアント

`src/lib/api-client.ts` に API クライアントが実装されています。

### 使用例

```typescript
import { useProducts, useProductDetail, usePrices } from './hooks/useProducts';

// 商品一覧の取得
const { data, isLoading, error } = useProducts();

// 商品詳細の取得
const { data: product } = useProductDetail(productId);

// 価格情報の取得
const { data: prices } = usePrices(productId);
```

## ルーティング

- `/` - ホームページ（商品一覧）
- `/products/:productId` - 商品詳細ページ

## 今後の実装予定

- 商品一覧コンポーネント
- 価格比較コンポーネント
- ローディング・エラー状態の UI
- レスポンシブデザインの最適化
- アクセシビリティの改善
