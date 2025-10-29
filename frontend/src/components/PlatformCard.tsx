import type { PriceData } from '../lib/api-client';

interface PlatformCardProps {
    priceData: PriceData;
    isLowestPrice: boolean;
}

const platformConfig = {
    amazon: {
        name: 'Amazon',
        logo: '🛒',
        color: 'bg-orange-50 border-orange-200',
        highlightColor: 'bg-orange-100 border-orange-400',
    },
    rakuten: {
        name: '楽天市場',
        logo: '🏪',
        color: 'bg-red-50 border-red-200',
        highlightColor: 'bg-red-100 border-red-400',
    },
    yodobashi: {
        name: 'ヨドバシ.com',
        logo: '🏬',
        color: 'bg-blue-50 border-blue-200',
        highlightColor: 'bg-blue-100 border-blue-400',
    },
    mercari: {
        name: 'メルカリ',
        logo: '🛍️',
        color: 'bg-pink-50 border-pink-200',
        highlightColor: 'bg-pink-100 border-pink-400',
    },
};

const availabilityConfig = {
    in_stock: {
        text: '在庫あり',
        color: 'text-green-700 bg-green-100',
    },
    out_of_stock: {
        text: '在庫なし',
        color: 'text-gray-700 bg-gray-100',
    },
    not_found: {
        text: '取扱なし',
        color: 'text-gray-500 bg-gray-50',
    },
};

export function PlatformCard({ priceData, isLowestPrice }: PlatformCardProps) {
    const config = platformConfig[priceData.platform];
    const availabilityInfo = availabilityConfig[priceData.availability];

    const cardColor = isLowestPrice ? config.highlightColor : config.color;
    const hasPrice = priceData.price !== null && priceData.availability === 'in_stock';

    const formatPrice = (price: number | null): string => {
        if (price === null) return '---';
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(price);
    };

    return (
        <article
            className={`relative rounded-lg border-2 p-4 sm:p-5 transition-all ${cardColor} ${isLowestPrice ? 'shadow-md' : 'shadow-sm'
                }`}
            aria-label={`${config.name}の価格情報`}
        >
            {/* Lowest Price Badge */}
            {isLowestPrice && hasPrice && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10" role="status" aria-label="最安値">
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs sm:text-sm font-bold text-yellow-900 shadow-sm whitespace-nowrap">
                        <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        最安値
                    </span>
                </div>
            )}

            {/* Platform Header */}
            <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl" role="img" aria-label={config.name}>
                    {config.logo}
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">{config.name}</h3>
            </div>

            {/* Price Display */}
            <div className="mb-3 sm:mb-4">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">
                    {formatPrice(priceData.price)}
                </div>
            </div>

            {/* Availability Status */}
            <div className="mb-4 sm:mb-5">
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs sm:text-sm font-medium ${availabilityInfo.color}`}
                >
                    {availabilityInfo.text}
                </span>
            </div>

            {/* Affiliate Link Button - Touch-friendly minimum height of 44px */}
            {hasPrice && (
                <a
                    href={priceData.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-md bg-blue-600 px-4 py-3 sm:py-2.5 text-center text-sm sm:text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 min-h-[44px] flex items-center justify-center"
                    aria-label={`${config.name}で${formatPrice(priceData.price)}で購入`}
                >
                    購入ページへ
                    <svg
                        className="ml-1 inline-block h-4 w-4 sm:h-5 sm:w-5"
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
            )}

            {!hasPrice && (
                <button
                    disabled
                    className="block w-full rounded-md bg-gray-300 px-4 py-3 sm:py-2.5 text-center text-sm sm:text-base font-semibold text-gray-500 cursor-not-allowed min-h-[44px]"
                    aria-label={`${config.name}では購入不可`}
                >
                    購入不可
                </button>
            )}
        </article>
    );
}
