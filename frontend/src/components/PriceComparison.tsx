import { usePrices } from '../hooks/useProducts';
import { PlatformCard } from './PlatformCard';
import { ErrorMessage } from './ErrorMessage';

interface PriceComparisonProps {
    productId: string;
}

export function PriceComparison({ productId }: PriceComparisonProps) {
    const { data, isLoading, error, refetch } = usePrices(productId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <ErrorMessage
                message="価格情報の取得に失敗しました"
                onRetry={() => refetch()}
            />
        );
    }

    if (!data || !data.prices || data.prices.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-gray-600">価格情報が見つかりませんでした</p>
            </div>
        );
    }

    // Calculate lowest price
    const availablePrices = data.prices
        .filter((p) => p.price !== null && p.availability === 'in_stock')
        .map((p) => p.price as number);

    const lowestPrice = availablePrices.length > 0 ? Math.min(...availablePrices) : null;

    // Calculate savings
    const highestPrice = availablePrices.length > 0 ? Math.max(...availablePrices) : null;
    const savings =
        lowestPrice !== null && highestPrice !== null ? highestPrice - lowestPrice : null;

    // Format last updated timestamp
    const formatLastUpdated = (timestamp: string): string => {
        try {
            const date = new Date(timestamp);
            return new Intl.DateTimeFormat('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch {
            return timestamp;
        }
    };

    return (
        <section className="space-y-6 sm:space-y-8" aria-labelledby="price-comparison-heading">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                    <h2 id="price-comparison-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">価格比較</h2>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600" aria-live="polite">
                        最終更新: <time dateTime={data.lastUpdated}>{formatLastUpdated(data.lastUpdated)}</time>
                    </p>
                </div>

                {/* Savings Display */}
                {savings !== null && savings > 0 && (
                    <div
                        className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0"
                        role="status"
                        aria-label={`最大節約額: ${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(savings)}`}
                    >
                        <div className="flex items-center gap-2 sm:gap-3">
                            <svg
                                className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-green-800">最大節約額</p>
                                <p className="text-lg sm:text-xl font-bold text-green-900">
                                    {new Intl.NumberFormat('ja-JP', {
                                        style: 'currency',
                                        currency: 'JPY',
                                    }).format(savings)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Price Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
                {data.prices.map((priceData) => (
                    <PlatformCard
                        key={priceData.platform}
                        priceData={priceData}
                        isLowestPrice={
                            priceData.price !== null &&
                            lowestPrice !== null &&
                            priceData.price === lowestPrice &&
                            priceData.availability === 'in_stock'
                        }
                    />
                ))}
            </div>

            {/* No Available Prices Message */}
            {availablePrices.length === 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 sm:p-5" role="alert" aria-live="polite">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <svg
                            className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-sm sm:text-base font-medium text-yellow-800">
                                在庫のある販売店が見つかりませんでした
                            </h3>
                            <p className="mt-1 text-xs sm:text-sm text-yellow-700">
                                現在、この商品は全てのプラットフォームで在庫切れまたは取扱がありません。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5" role="note" aria-label="価格情報に関する注意事項">
                <div className="flex items-start gap-3 sm:gap-4">
                    <svg
                        className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <div className="flex-1">
                        <p className="text-xs sm:text-sm text-blue-800">
                            価格は定期的に更新されますが、実際の販売価格と異なる場合があります。
                            購入前に各サイトで最新の価格をご確認ください。
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
