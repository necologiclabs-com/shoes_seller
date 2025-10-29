import { useState, useMemo } from 'react';
import { useAllProducts } from '../hooks/useProducts';
import { ProductCard } from './ProductCard';
import { ProductListSkeleton } from './Loading';
import { ErrorMessage, NotFound } from './ErrorMessage';
import { FilterBar } from './FilterBar';
import type { FilterState } from './FilterBar';

export function ProductList() {
    const { data: products, isLoading, isError, error, refetch } = useAllProducts();
    const [filters, setFilters] = useState<FilterState>({
        gender: 'all',
        brand: 'all',
    });

    // Extract available brands from products
    const availableBrands = useMemo(() => {
        if (!products) return [];
        const brands = new Set(
            products.map((p) => p.brand).filter((b): b is string => !!b)
        );
        return Array.from(brands).sort();
    }, [products]);

    // Filter products based on current filter state
    const filteredProducts = useMemo(() => {
        if (!products) return [];

        return products.filter((product) => {
            // Gender filter
            if (filters.gender !== 'all' && product.gender !== filters.gender) {
                return false;
            }

            // Brand filter
            if (filters.brand !== 'all' && product.brand !== filters.brand) {
                return false;
            }

            return true;
        });
    }, [products, filters]);

    // Loading state
    if (isLoading) {
        return <ProductListSkeleton count={6} />;
    }

    // Error state
    if (isError) {
        return (
            <ErrorMessage
                title="商品の読み込みに失敗しました"
                message={error instanceof Error ? error.message : '商品データの取得中にエラーが発生しました。'}
                onRetry={() => refetch()}
            />
        );
    }

    // No products found
    if (!products || products.length === 0) {
        return (
            <NotFound
                title="商品が見つかりません"
                message="現在表示できる商品がありません。後ほど再度お試しください。"
                actionLabel="再読み込み"
                onAction={() => refetch()}
            />
        );
    }

    // Display filter bar and products in grid
    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Filter Bar */}
            <FilterBar
                filters={filters}
                onFilterChange={setFilters}
                availableBrands={availableBrands}
                totalCount={products.length}
                filteredCount={filteredProducts.length}
            />

            {/* No products match filters */}
            {filteredProducts.length === 0 ? (
                <NotFound
                    title="条件に一致する商品が見つかりません"
                    message="フィルタ条件を変更して再度お試しください。"
                    actionLabel="フィルタをクリア"
                    onAction={() => setFilters({ gender: 'all', brand: 'all' })}
                />
            ) : (
                <section className="space-y-4" aria-labelledby="product-list-heading">
                    <h2 className="sr-only" id="product-list-heading">商品一覧</h2>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
