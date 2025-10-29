import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { Product } from '../lib/api-client';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const [imageError, setImageError] = useState(false);

    return (
        <Link
            to={`/products/${product.id}`}
            className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
            aria-label={`${product.name}の価格を比較`}
        >
            {/* Product Image */}
            <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                {imageError ? (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <div className="text-center p-4">
                            <svg
                                className="mx-auto h-16 w-16 text-gray-400"
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
                            <p className="mt-2 text-xs sm:text-sm font-medium text-gray-500">
                                {product.brand}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {product.modelNumber}
                            </p>
                        </div>
                    </div>
                ) : (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={() => setImageError(true)}
                    />
                )}
            </div>

            {/* Product Info */}
            <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
                {/* Brand and Gender Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs sm:text-sm font-medium text-blue-800">
                        {product.brand}
                    </span>
                    {product.gender && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs sm:text-sm font-medium ${
                            product.gender === 'men' 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : product.gender === 'women'
                                ? 'bg-pink-100 text-pink-800'
                                : 'bg-purple-100 text-purple-800'
                        }`}>
                            {product.gender === 'men' ? 'メンズ' : product.gender === 'women' ? 'ウィメンズ' : 'ユニセックス'}
                        </span>
                    )}
                </div>

                {/* Product Name */}
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[3rem] sm:min-h-[3.5rem]">
                    {product.name}
                </h3>

                {/* Model Number */}
                <p className="text-xs sm:text-sm text-gray-600">
                    モデル番号: <span className="font-medium">{product.modelNumber}</span>
                </p>

                {/* View Details Button */}
                <div className="pt-2 sm:pt-3">
                    <span className="inline-flex items-center gap-1 text-sm sm:text-base font-medium text-blue-600 group-hover:text-blue-700 min-h-[44px] sm:min-h-0">
                        価格を比較
                        <svg
                            className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </span>
                </div>
            </div>
        </Link>
    );
}
