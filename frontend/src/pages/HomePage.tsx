import { Header } from '../components/Header';
import { ProductList } from '../components/ProductList';

export default function HomePage() {
    return (
        <>
            <Header />
            <main id="main-content" className="min-h-screen bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
                    {/* Page Header */}
                    <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                            トレイルランニングシューズ価格比較
                        </h1>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl leading-relaxed">
                            サロモンのトレイルランニングシューズを、Amazon、楽天、ヨドバシ、メルカリで比較。
                            最安値で購入できる場所を簡単に見つけられます。
                        </p>
                    </div>

                    {/* Product List */}
                    <ProductList />
                </div>
            </main>
        </>
    );
}
