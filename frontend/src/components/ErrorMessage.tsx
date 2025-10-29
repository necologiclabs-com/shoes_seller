interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorMessage({
    title = 'エラーが発生しました',
    message,
    onRetry,
    className = '',
}: ErrorMessageProps) {
    return (
        <div
            className={`rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6 ${className}`}
            role="alert"
        >
            <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                    <svg
                        className="h-5 w-5 sm:h-6 sm:w-6 text-red-600"
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
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-red-900">{title}</h3>
                    <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700 break-words">{message}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-3 sm:mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 sm:py-2 text-sm sm:text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors active:bg-red-800 min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                        >
                            <svg
                                className="h-4 w-4 sm:h-5 sm:w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            再試行
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

interface InlineErrorProps {
    message: string;
    className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
    return (
        <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`} role="alert">
            <svg
                className="h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
            >
                <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                />
            </svg>
            <span>{message}</span>
        </div>
    );
}

interface NotFoundProps {
    title?: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function NotFound({
    title = '見つかりませんでした',
    message,
    actionLabel = 'ホームに戻る',
    onAction,
    className = '',
}: NotFoundProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center ${className}`}>
            <svg
                className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 text-gray-400 mb-3 sm:mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-md px-4">{message}</p>
            {onAction && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-sm sm:text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors active:bg-blue-800 min-h-[44px] w-full sm:w-auto max-w-xs"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
