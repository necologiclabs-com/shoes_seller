/**
 * Structured logging utility for Lambda functions
 * Provides consistent logging format with request ID, timestamp, and context
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export interface LogContext {
    requestId?: string;
    functionName?: string;
    [key: string]: any;
}

export class Logger {
    private context: LogContext;
    private level: LogLevel;

    constructor(context: LogContext = {}, level: LogLevel = LogLevel.INFO) {
        this.context = {
            ...context,
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        };
        this.level = level;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    private log(level: LogLevel, message: string, data?: any): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.context,
            ...(data && { data }),
        };

        console.log(JSON.stringify(logEntry));
    }

    debug(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    info(message: string, data?: any): void {
        this.log(LogLevel.INFO, message, data);
    }

    warn(message: string, data?: any): void {
        this.log(LogLevel.WARN, message, data);
    }

    error(message: string, error?: Error | any): void {
        const errorData = error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            }
            : error;

        this.log(LogLevel.ERROR, message, errorData);
    }

    addContext(additionalContext: Record<string, any>): Logger {
        return new Logger({ ...this.context, ...additionalContext }, this.level);
    }
}

/**
 * Create a logger instance with Lambda context
 */
export function createLogger(requestId?: string, additionalContext?: LogContext): Logger {
    return new Logger({
        requestId,
        ...additionalContext,
    });
}
