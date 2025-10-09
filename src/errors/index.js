"use strict";
/**
 * OpenAPI 3.1 error handling and debugging utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultErrorHandler = exports.createErrorContext = exports.withErrorHandling = exports.OpenAPI31ErrorHandler = exports.ErrorCollector = exports.RecoveryStrategy = exports.loggers = exports.isDebugEnabled = exports.getDebugConfig = exports.configureDebugLogging = exports.createLogger = exports.OpenAPI31Logger = exports.LogLevel = exports.createFeatureError = exports.ERROR_MESSAGES = exports.ContextualError = exports.ConditionalSchemaError = exports.DiscriminatorError = exports.WebhookProcessingError = exports.VersionCompatibilityError = exports.SchemaTransformationError = exports.InvalidFeatureUsageError = exports.UnsupportedFeatureError = exports.OpenAPI31Error = void 0;
// Error classes
var openapi31_errors_1 = require("./openapi31-errors");
Object.defineProperty(exports, "OpenAPI31Error", { enumerable: true, get: function () { return openapi31_errors_1.OpenAPI31Error; } });
Object.defineProperty(exports, "UnsupportedFeatureError", { enumerable: true, get: function () { return openapi31_errors_1.UnsupportedFeatureError; } });
Object.defineProperty(exports, "InvalidFeatureUsageError", { enumerable: true, get: function () { return openapi31_errors_1.InvalidFeatureUsageError; } });
Object.defineProperty(exports, "SchemaTransformationError", { enumerable: true, get: function () { return openapi31_errors_1.SchemaTransformationError; } });
Object.defineProperty(exports, "VersionCompatibilityError", { enumerable: true, get: function () { return openapi31_errors_1.VersionCompatibilityError; } });
Object.defineProperty(exports, "WebhookProcessingError", { enumerable: true, get: function () { return openapi31_errors_1.WebhookProcessingError; } });
Object.defineProperty(exports, "DiscriminatorError", { enumerable: true, get: function () { return openapi31_errors_1.DiscriminatorError; } });
Object.defineProperty(exports, "ConditionalSchemaError", { enumerable: true, get: function () { return openapi31_errors_1.ConditionalSchemaError; } });
Object.defineProperty(exports, "ContextualError", { enumerable: true, get: function () { return openapi31_errors_1.ContextualError; } });
Object.defineProperty(exports, "ERROR_MESSAGES", { enumerable: true, get: function () { return openapi31_errors_1.ERROR_MESSAGES; } });
Object.defineProperty(exports, "createFeatureError", { enumerable: true, get: function () { return openapi31_errors_1.createFeatureError; } });
// Debug logging
var debug_logger_1 = require("./debug-logger");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return debug_logger_1.LogLevel; } });
Object.defineProperty(exports, "OpenAPI31Logger", { enumerable: true, get: function () { return debug_logger_1.OpenAPI31Logger; } });
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return debug_logger_1.createLogger; } });
Object.defineProperty(exports, "configureDebugLogging", { enumerable: true, get: function () { return debug_logger_1.configureDebugLogging; } });
Object.defineProperty(exports, "getDebugConfig", { enumerable: true, get: function () { return debug_logger_1.getDebugConfig; } });
Object.defineProperty(exports, "isDebugEnabled", { enumerable: true, get: function () { return debug_logger_1.isDebugEnabled; } });
Object.defineProperty(exports, "loggers", { enumerable: true, get: function () { return debug_logger_1.loggers; } });
// Error handling
var error_handler_1 = require("./error-handler");
Object.defineProperty(exports, "RecoveryStrategy", { enumerable: true, get: function () { return error_handler_1.RecoveryStrategy; } });
Object.defineProperty(exports, "ErrorCollector", { enumerable: true, get: function () { return error_handler_1.ErrorCollector; } });
Object.defineProperty(exports, "OpenAPI31ErrorHandler", { enumerable: true, get: function () { return error_handler_1.OpenAPI31ErrorHandler; } });
Object.defineProperty(exports, "withErrorHandling", { enumerable: true, get: function () { return error_handler_1.withErrorHandling; } });
Object.defineProperty(exports, "createErrorContext", { enumerable: true, get: function () { return error_handler_1.createErrorContext; } });
Object.defineProperty(exports, "defaultErrorHandler", { enumerable: true, get: function () { return error_handler_1.defaultErrorHandler; } });
//# sourceMappingURL=index.js.map