/**
 * Debug logging system for OpenAPI 3.1 processing
 */
import { OpenAPIVersionInfo } from '../version-detection';
/**
 * Log levels for debug output
 */
export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4
}
/**
 * Debug logging configuration
 */
export interface DebugConfig {
    /** Enable debug logging */
    enabled: boolean;
    /** Minimum log level to output */
    level: LogLevel;
    /** Include timestamps in log output */
    includeTimestamp: boolean;
    /** Include stack traces for errors */
    includeStackTrace: boolean;
    /** Custom log output function */
    logFunction?: (level: LogLevel, message: string) => void;
}
/**
 * Configure debug logging
 */
export declare function configureDebugLogging(config: Partial<DebugConfig>): void;
/**
 * Get current debug configuration
 */
export declare function getDebugConfig(): DebugConfig;
/**
 * Check if debug logging is enabled for a specific level
 */
export declare function isDebugEnabled(level?: LogLevel): boolean;
/**
 * Debug logger for OpenAPI 3.1 processing
 */
export declare class OpenAPI31Logger {
    private context;
    constructor(context: string);
    /**
     * Log error message
     */
    error(message: string, error?: Error): void;
    /**
     * Log warning message
     */
    warn(message: string): void;
    /**
     * Log info message
     */
    info(message: string): void;
    /**
     * Log debug message
     */
    debug(message: string): void;
    /**
     * Log trace message
     */
    trace(message: string): void;
    /**
     * Log processing step
     */
    step(stepName: string, details?: Record<string, any>): void;
    /**
     * Log feature detection
     */
    featureDetected(feature: string, location: string, supported: boolean): void;
    /**
     * Log schema transformation
     */
    transformation(feature: string, location: string, before: any, after: any): void;
    /**
     * Log version information
     */
    version(version: OpenAPIVersionInfo): void;
    /**
     * Create child logger with additional context
     */
    child(additionalContext: string): OpenAPI31Logger;
}
/**
 * Create a logger for a specific context
 */
export declare function createLogger(context: string): OpenAPI31Logger;
/**
 * Convenience loggers for common contexts
 */
export declare const loggers: {
    parser: OpenAPI31Logger;
    transformer: OpenAPI31Logger;
    generator: OpenAPI31Logger;
    validator: OpenAPI31Logger;
    discriminator: OpenAPI31Logger;
    webhook: OpenAPI31Logger;
    conditional: OpenAPI31Logger;
    version: OpenAPI31Logger;
};
