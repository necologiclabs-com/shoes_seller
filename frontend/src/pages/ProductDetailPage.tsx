import { useParams, Link } from 'react-router-dom';
import { Header, ProductDetail } from '../components';

export default function ProductDetailPage() {
    const { productId } = useParams<{ productId: string }>();

    if (!productId) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-gray-50">
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                            <svg
                                className="mx-auto h-12 w-12 text-red-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <h2 className="mt-4 text-xl font-bold text-red-900">
                                商品IDが指定されていません
                            </h2>
                            <p className="mt-2 text-red-700">
                                有効な商品IDを指定してください。
                            </p>
                            <div className="mt-6">
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main id="main-content" className="min-h-screen bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
                    {/* Breadcrumb Navigation */}
                    <nav className="mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm" aria-label="パンくずリスト">
                        <Link
                            to="/"
                            className="text-gray-600 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-0.5 min-h-[44px] sm:min-h-0 flex items-center"
                        >
                            ホーム
                        </Link>
                        <svg
                            className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0"
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
                        <span className="text-gray-900 font-medium truncate">商品詳細</span>
                    </nav>

                    {/* Product Detail Component */}
                    <ProductDetail productId={productId} />
                </div>
            </main>
        </>
    );
}
