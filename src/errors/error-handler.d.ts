/**
 * Error handling utilities for OpenAPI 3.1 processing
 */
import { OpenAPIVersionInfo } from '../version-detection';
import { OpenAPI31Error, ErrorContext } from './openapi31-errors';
/**
 * Error recovery strategies
 */
export declare enum RecoveryStrategy {
    /** Skip the problematic feature */
    SKIP = "skip",
    /** Use a fallback implementation */
    FALLBACK = "fallback",
    /** Convert to OpenAPI 3.0 equivalent */
    DOWNGRADE = "downgrade",
    /** Fail with detailed error */
    FAIL = "fail"
}
/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
    /** Default recovery strategy */
    defaultStrategy: RecoveryStrategy;
    /** Feature-specific recovery strategies */
    featureStrategies: Record<string, RecoveryStrategy>;
    /** Whether to collect and report all errors */
    collectAllErrors: boolean;
    /** Maximum number of errors to collect */
    maxErrors: number;
    /** Whether to include suggestions in error messages */
    includeSuggestions: boolean;
}
/**
 * Error collection for batch processing
 */
export declare class ErrorCollector {
    private errors;
    private config;
    constructor(config?: Partial<ErrorHandlingConfig>);
    /**
     * Add an error to the collection
     */
    addError(error: OpenAPI31Error): void;
    /**
     * Get all collected errors
     */
    getErrors(): OpenAPI31Error[];
    /**
     * Check if any errors were collected
     */
    hasErrors(): boolean;
    /**
     * Get error count
     */
    getErrorCount(): number;
    /**
     * Clear all collected errors
     */
    clear(): void;
    /**
     * Get formatted error summary
     */
    getSummary(): string;
}
/**
 * Enhanced error handler for OpenAPI 3.1 processing
 */
export declare class OpenAPI31ErrorHandler {
    private config;
    private collector;
    private logger;
    constructor(config?: Partial<ErrorHandlingConfig>);
    /**
     * Handle an error with appropriate recovery strategy
     */
    handleError(error: OpenAPI31Error, context?: ErrorContext): {
        shouldContinue: boolean;
        fallbackValue?: any;
    };
    /**
     * Get recovery strategy for a feature
     */
    private getRecoveryStrategy;
    /**
     * Handle skip strategy
     */
    private handleSkip;
    /**
     * Handle fallback strategy
     */
    private handleFallback;
    /**
     * Handle downgrade strategy
     */
    private handleDowngrade;
    /**
     * Handle fail strategy
     */
    private handleFail;
    /**
     * Get fallback value for a feature
     */
    private getFallbackValue;
    /**
     * Get downgraded value for a feature (OpenAPI 3.0 equivalent)
     */
    private getDowngradedValue;
    /**
     * Get error collector
     */
    getErrorCollector(): ErrorCollector;
    /**
     * Create enhanced error with suggestions
     */
    createEnhancedError(originalError: Error, feature: string, location: string, context?: ErrorContext): OpenAPI31Error;
    /**
     * Get suggestion for a specific feature
     */
    private getSuggestionForFeature;
}
/**
 * Utility function to wrap potentially error-prone operations
 */
export declare function withErrorHandling<T>(operation: () => Promise<T> | T, feature: string, location: string, errorHandler: OpenAPI31ErrorHandler, context?: ErrorContext): Promise<T | undefined>;
/**
 * Create error context from schema information
 */
export declare function createErrorContext(schemaPath: string, version: OpenAPIVersionInfo, processingStep?: string, additionalContext?: Record<string, any>): ErrorContext;
/**
 * Default error handler instance
 */
export declare const defaultErrorHandler: OpenAPI31ErrorHandler;
