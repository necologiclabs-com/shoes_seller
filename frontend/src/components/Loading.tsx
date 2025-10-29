interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    };

    return (
        <div
            className={`inline-block animate-spin rounded-full border-solid border-blue-600 border-t-transparent ${sizeClasses[size]} ${className}`}
            role="status"
            aria-label="読み込み中"
        >
            <span className="sr-only">読み込み中...</span>
        </div>
    );
}

interface LoadingProps {
    message?: string;
    className?: string;
}

export function Loading({ message = '読み込み中...', className = '' }: LoadingProps) {
    return (
        <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">{message}</p>
        </div>
    );
}

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    return (
        <div
            className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className}`}
            aria-hidden="true"
        />
    );
}

export function ProductCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" variant="text" />
                <Skeleton className="h-4 w-1/2" variant="text" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}

export function PriceCardSkeleton() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12" variant="circular" />
                <Skeleton className="h-6 w-24" variant="text" />
            </div>
            <Skeleton className="h-8 w-32 mb-2" variant="text" />
            <Skeleton className="h-4 w-20 mb-4" variant="text" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
}

interface ProductListSkeletonProps {
    count?: number;
}

export function ProductListSkeleton({ count = 6 }: ProductListSkeletonProps) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, index) => (
                <ProductCardSkeleton key={index} />
            ))}
        </div>
    );
}

interface PriceComparisonSkeletonProps {
    count?: number;
}

export function PriceComparisonSkeleton({ count = 4 }: PriceComparisonSkeletonProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, index) => (
                <PriceCardSkeleton key={index} />
            ))}
        </div>
    );
}
