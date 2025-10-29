import { useMemo } from 'react';

export interface FilterState {
    gender: 'all' | 'men' | 'women';
    brand: string;
}

interface FilterBarProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    availableBrands: string[];
    totalCount: number;
    filteredCount: number;
}

export function FilterBar({
    filters,
    onFilterChange,
    availableBrands,
    totalCount,
    filteredCount,
}: FilterBarProps) {
    const genderOptions = useMemo(
        () => [
            { value: 'all', label: '全て', ariaLabel: 'すべての性別を表示' },
            { value: 'men', label: 'メンズ', ariaLabel: 'メンズのみを表示' },
            { value: 'women', label: 'ウィメンズ', ariaLabel: 'ウィメンズのみを表示' },
        ],
        []
    );

    const handleGenderChange = (gender: 'all' | 'men' | 'women') => {
        onFilterChange({ ...filters, gender });
    };

    const handleBrandChange = (brand: string) => {
        onFilterChange({ ...filters, brand });
    };

    const handleReset = () => {
        onFilterChange({ gender: 'all', brand: 'all' });
    };

    const hasActiveFilters = filters.gender !== 'all' || filters.brand !== 'all';

    return (
        <section
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-5"
            aria-labelledby="filter-heading"
        >
            <div className="flex items-center justify-between">
                <h2
                    id="filter-heading"
                    className="text-base sm:text-lg font-semibold text-gray-900"
                >
                    フィルタ
                </h2>
                {hasActiveFilters && (
                    <button
                        onClick={handleReset}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                        aria-label="すべてのフィルタをクリア"
                    >
                        クリア
                    </button>
                )}
            </div>

            <div className="space-y-4 sm:space-y-5">
                {/* Gender Filter */}
                <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-sm sm:text-base font-medium text-gray-700">
                        性別
                    </h3>
                    <div
                        className="flex flex-wrap gap-2 sm:gap-3"
                        role="group"
                        aria-label="性別フィルタ"
                    >
                        {genderOptions.map((option) => {
                            const isActive = filters.gender === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() =>
                                        handleGenderChange(
                                            option.value as 'all' | 'men' | 'women'
                                        )
                                    }
                                    className={`
                                        min-h-[44px] px-4 py-2 rounded-lg text-sm sm:text-base font-medium
                                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                                        ${
                                            isActive
                                                ? option.value === 'men'
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                                                    : option.value === 'women'
                                                    ? 'bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500'
                                                    : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500'
                                                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 focus:ring-gray-500'
                                        }
                                    `}
                                    aria-label={option.ariaLabel}
                                    aria-pressed={isActive}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Brand Filter */}
                {availableBrands.length > 1 && (
                    <div className="space-y-2 sm:space-y-3">
                        <h3 className="text-sm sm:text-base font-medium text-gray-700">
                            ブランド
                        </h3>
                        <div className="relative">
                            <select
                                value={filters.brand}
                                onChange={(e) => handleBrandChange(e.target.value)}
                                className="min-h-[44px] w-full sm:w-auto sm:min-w-[200px] px-4 py-2 pr-10 rounded-lg text-sm sm:text-base bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer appearance-none"
                                aria-label="ブランドを選択"
                            >
                                <option value="all">すべてのブランド</option>
                                {availableBrands.map((brand) => (
                                    <option key={brand} value={brand}>
                                        {brand}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                <svg
                                    className="h-4 w-4 sm:h-5 sm:w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Results Summary */}
            <div className="pt-3 sm:pt-4 border-t border-gray-200">
                <p className="text-xs sm:text-sm text-gray-600" role="status" aria-live="polite">
                    {filteredCount === totalCount ? (
                        <span>全 {totalCount} 件の商品を表示中</span>
                    ) : (
                        <span>
                            全 {totalCount} 件中 <strong className="font-semibold text-gray-900">{filteredCount} 件</strong>を表示中
                        </span>
                    )}
                </p>
            </div>
        </section>
    );
}
