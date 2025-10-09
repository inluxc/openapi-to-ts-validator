/**
 * OpenAPI 3.1 error handling and debugging utilities
 */
export { OpenAPI31Error, UnsupportedFeatureError, InvalidFeatureUsageError, SchemaTransformationError, VersionCompatibilityError, WebhookProcessingError, DiscriminatorError, ConditionalSchemaError, ContextualError, ErrorContext, ERROR_MESSAGES, createFeatureError } from './openapi31-errors';
export { LogLevel, DebugConfig, OpenAPI31Logger, createLogger, configureDebugLogging, getDebugConfig, isDebugEnabled, loggers } from './debug-logger';
export { RecoveryStrategy, ErrorHandlingConfig, ErrorCollector, OpenAPI31ErrorHandler, withErrorHandling, createErrorContext, defaultErrorHandler } from './error-handler';
