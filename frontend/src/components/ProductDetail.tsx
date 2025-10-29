import { useState } from 'react';
import { useProductDetail } from '../hooks/useProducts';
import { PriceComparison } from './PriceComparison';
import { ErrorMessage } from './ErrorMessage';

interface ProductDetailProps {
    productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
    const { data, isLoading, error, refetch } = useProductDetail(productId);
    const [imageError, setImageError] = useState(false);

    if (isLoading) {
        return (
            <div className="space-y-8">
                {/* Product Info Skeleton */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Image Skeleton */}
                        <div className="w-full lg:w-1/3">
                            <div className="aspect-square w-full bg-gray-200 animate-pulse rounded-lg"></div>
                        </div>

                        {/* Info Skeleton */}
                        <div className="flex-1 space-y-4">
                            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                            <div className="h-10 w-3/4 bg-gray-200 animate-pulse rounded"></div>
                            <div className="h-6 w-1/2 bg-gray-200 animate-pulse rounded"></div>
                            <div className="h-10 w-40 bg-gray-200 animate-pulse rounded"></div>
                        </div>
                    </div>
                </div>

                {/* Price Comparison Skeleton */}
                <div className="space-y-4">
                    <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        // Check if it's a 404 error
        const is404 = error.message.includes('404') || error.message.includes('not found');

        if (is404) {
            return (
                <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
                    <svg
                        className="mx-auto h-16 w-16 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">商品が見つかりません</h2>
                    <p className="mt-2 text-gray-600">
                        指定された商品は存在しないか、削除された可能性があります。
                    </p>
                    <div className="mt-6">
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            商品一覧に戻る
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <ErrorMessage
                message="商品情報の取得に失敗しました"
                onRetry={() => refetch()}
            />
        );
    }

    if (!data || !data.product) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">商品情報が見つかりませんでした</p>
            </div>
        );
    }

    const { product } = data;

    return (
        <article className="space-y-6 sm:space-y-8">
            {/* Product Information Card */}
            <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm" aria-labelledby="product-name">
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                    {/* Product Image */}
                    <div className="w-full lg:w-1/3 lg:max-w-md">
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                            {imageError ? (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <div className="text-center p-6">
                                        <svg
                                            className="mx-auto h-20 w-20 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <p className="mt-3 text-sm font-medium text-gray-500">
                                            {product.brand}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {product.modelNumber}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            画像を読み込めません
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={product.imageUrl}
                                    alt={`${product.name}の商品画像`}
                                    className="h-full w-full object-cover object-center"
                                    onError={() => setImageError(true)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 space-y-4 sm:space-y-5">
                        {/* Brand and Gender Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm sm:text-base font-medium text-blue-800" role="text" aria-label={`ブランド: ${product.brand}`}>
                                {product.brand}
                            </span>
                            {product.gender && (
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm sm:text-base font-medium ${
                                    product.gender === 'men' 
                                        ? 'bg-indigo-100 text-indigo-800' 
                                        : product.gender === 'women'
                                        ? 'bg-pink-100 text-pink-800'
                                        : 'bg-purple-100 text-purple-800'
                                }`} role="text" aria-label={`${product.gender === 'men' ? 'メンズ' : product.gender === 'women' ? 'ウィメンズ' : 'ユニセックス'}`}>
                                    {product.gender === 'men' ? 'メンズ' : product.gender === 'women' ? 'ウィメンズ' : 'ユニセックス'}
                                </span>
                            )}
                        </div>

                        {/* Product Name */}
                        <h1 id="product-name" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                            {product.name}
                        </h1>

                        {/* Model Number */}
                        <div className="flex items-center gap-2 text-gray-600" role="text" aria-label={`モデル番号: ${product.modelNumber}`}>
                            <svg
                                className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                            </svg>
                            <span className="text-sm sm:text-base">
                                モデル番号: <span className="font-medium">{product.modelNumber}</span>
                            </span>
                        </div>

                        {/* Colors and Sizes */}
                        {(product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0) ? (
                            <div className="space-y-3 pt-2">
                                {/* Colors */}
                                {product.colors && product.colors.length > 0 && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm sm:text-base text-gray-600 font-medium whitespace-nowrap pt-1">カラー:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {product.colors.map((color, index) => (
                                                <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-sm text-gray-800">
                                                    {color}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Sizes */}
                                {product.sizes && product.sizes.length > 0 && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm sm:text-base text-gray-600 font-medium whitespace-nowrap pt-1">サイズ:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {product.sizes.map((size, index) => (
                                                <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-sm text-gray-800 font-mono">
                                                    {size}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Official Price */}
                                {product.officialPrice && (
                                    <div className="flex items-center gap-2 pt-1">
                                        <span className="text-sm sm:text-base text-gray-600 font-medium">公式価格:</span>
                                        <span className="text-lg sm:text-xl font-bold text-gray-900">
                                            ¥{product.officialPrice.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Official Product Link - Touch-friendly button */}
                        <div className="pt-2 sm:pt-3">
                            <a
                                href={product.officialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-6 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors active:bg-gray-950 min-h-[44px] w-full sm:w-auto"
                                aria-label={`${product.name}の公式サイトで詳細を見る（新しいタブで開きます）`}
                            >
                                公式サイトで詳細を見る
                                <svg
                                    className="h-4 w-4 sm:h-5 sm:w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Price Comparison Section */}
            <PriceComparison productId={productId} />
        </article>
    );
}
