"use strict";
/**
 * Error handling utilities for OpenAPI 3.1 processing
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultErrorHandler = exports.createErrorContext = exports.withErrorHandling = exports.OpenAPI31ErrorHandler = exports.ErrorCollector = exports.RecoveryStrategy = void 0;
var openapi31_errors_1 = require("./openapi31-errors");
var debug_logger_1 = require("./debug-logger");
var logger = (0, debug_logger_1.createLogger)('ErrorHandler');
/**
 * Error recovery strategies
 */
var RecoveryStrategy;
(function (RecoveryStrategy) {
    /** Skip the problematic feature */
    RecoveryStrategy["SKIP"] = "skip";
    /** Use a fallback implementation */
    RecoveryStrategy["FALLBACK"] = "fallback";
    /** Convert to OpenAPI 3.0 equivalent */
    RecoveryStrategy["DOWNGRADE"] = "downgrade";
    /** Fail with detailed error */
    RecoveryStrategy["FAIL"] = "fail";
})(RecoveryStrategy = exports.RecoveryStrategy || (exports.RecoveryStrategy = {}));
/**
 * Default error handling configuration
 */
var DEFAULT_ERROR_CONFIG = {
    defaultStrategy: RecoveryStrategy.FAIL,
    featureStrategies: {
        'unevaluatedProperties': RecoveryStrategy.FALLBACK,
        'advanced-discriminator': RecoveryStrategy.DOWNGRADE,
        'complex-conditional': RecoveryStrategy.SKIP
    },
    collectAllErrors: false,
    maxErrors: 10,
    includeSuggestions: true
};
/**
 * Error collection for batch processing
 */
var ErrorCollector = /** @class */ (function () {
    function ErrorCollector(config) {
        if (config === void 0) { config = {}; }
        this.errors = [];
        this.config = __assign(__assign({}, DEFAULT_ERROR_CONFIG), config);
    }
    /**
     * Add an error to the collection
     */
    ErrorCollector.prototype.addError = function (error) {
        if (this.errors.length >= this.config.maxErrors) {
            logger.warn("Maximum error count (".concat(this.config.maxErrors, ") reached, ignoring additional errors"));
            return;
        }
        this.errors.push(error);
        logger.error("Collected error: ".concat(error.message), error);
    };
    /**
     * Get all collected errors
     */
    ErrorCollector.prototype.getErrors = function () {
        return __spreadArray([], this.errors, true);
    };
    /**
     * Check if any errors were collected
     */
    ErrorCollector.prototype.hasErrors = function () {
        return this.errors.length > 0;
    };
    /**
     * Get error count
     */
    ErrorCollector.prototype.getErrorCount = function () {
        return this.errors.length;
    };
    /**
     * Clear all collected errors
     */
    ErrorCollector.prototype.clear = function () {
        this.errors = [];
    };
    /**
     * Get formatted error summary
     */
    ErrorCollector.prototype.getSummary = function () {
        if (this.errors.length === 0) {
            return 'No errors collected';
        }
        var summary = "Collected ".concat(this.errors.length, " error(s):\n\n");
        this.errors.forEach(function (error, index) {
            summary += "".concat(index + 1, ". ").concat(error.getFormattedMessage(), "\n\n");
        });
        return summary;
    };
    return ErrorCollector;
}());
exports.ErrorCollector = ErrorCollector;
/**
 * Enhanced error handler for OpenAPI 3.1 processing
 */
var OpenAPI31ErrorHandler = /** @class */ (function () {
    function OpenAPI31ErrorHandler(config) {
        if (config === void 0) { config = {}; }
        this.config = __assign(__assign({}, DEFAULT_ERROR_CONFIG), config);
        this.collector = new ErrorCollector(this.config);
        this.logger = (0, debug_logger_1.createLogger)('ErrorHandler');
    }
    /**
     * Handle an error with appropriate recovery strategy
     */
    OpenAPI31ErrorHandler.prototype.handleError = function (error, context) {
        // Add context if provided
        var contextualError = context ? new openapi31_errors_1.ContextualError(error, context) : error;
        this.logger.error("Handling error: ".concat(contextualError.message), contextualError);
        // Determine recovery strategy
        var strategy = this.getRecoveryStrategy(error.feature);
        // Log the strategy being used
        this.logger.info("Using recovery strategy '".concat(strategy, "' for feature '").concat(error.feature, "'"));
        switch (strategy) {
            case RecoveryStrategy.SKIP:
                return this.handleSkip(contextualError);
            case RecoveryStrategy.FALLBACK:
                return this.handleFallback(contextualError);
            case RecoveryStrategy.DOWNGRADE:
                return this.handleDowngrade(contextualError);
            case RecoveryStrategy.FAIL:
            default:
                return this.handleFail(contextualError);
        }
    };
    /**
     * Get recovery strategy for a feature
     */
    OpenAPI31ErrorHandler.prototype.getRecoveryStrategy = function (feature) {
        return this.config.featureStrategies[feature] || this.config.defaultStrategy;
    };
    /**
     * Handle skip strategy
     */
    OpenAPI31ErrorHandler.prototype.handleSkip = function (error) {
        this.logger.warn("Skipping feature '".concat(error.feature, "' due to error: ").concat(error.message));
        if (this.config.collectAllErrors) {
            this.collector.addError(error);
        }
        return { shouldContinue: true, fallbackValue: undefined };
    };
    /**
     * Handle fallback strategy
     */
    OpenAPI31ErrorHandler.prototype.handleFallback = function (error) {
        this.logger.warn("Using fallback for feature '".concat(error.feature, "' due to error: ").concat(error.message));
        var fallbackValue = this.getFallbackValue(error.feature);
        if (this.config.collectAllErrors) {
            this.collector.addError(error);
        }
        return { shouldContinue: true, fallbackValue: fallbackValue };
    };
    /**
     * Handle downgrade strategy
     */
    OpenAPI31ErrorHandler.prototype.handleDowngrade = function (error) {
        this.logger.warn("Downgrading feature '".concat(error.feature, "' to OpenAPI 3.0 equivalent due to error: ").concat(error.message));
        var downgradedValue = this.getDowngradedValue(error.feature);
        if (this.config.collectAllErrors) {
            this.collector.addError(error);
        }
        return { shouldContinue: true, fallbackValue: downgradedValue };
    };
    /**
     * Handle fail strategy
     */
    OpenAPI31ErrorHandler.prototype.handleFail = function (error) {
        this.logger.error("Failing due to error with feature '".concat(error.feature, "': ").concat(error.message));
        if (this.config.collectAllErrors) {
            this.collector.addError(error);
        }
        throw error;
    };
    /**
     * Get fallback value for a feature
     */
    OpenAPI31ErrorHandler.prototype.getFallbackValue = function (feature) {
        var fallbacks = {
            'unevaluatedProperties': { additionalProperties: true },
            'prefixItems': { type: 'array', items: {} },
            'contains': { type: 'array' },
            'const': {},
            'conditional-schema': {}
        };
        return fallbacks[feature];
    };
    /**
     * Get downgraded value for a feature (OpenAPI 3.0 equivalent)
     */
    OpenAPI31ErrorHandler.prototype.getDowngradedValue = function (feature) {
        var downgrades = {
            'type-array': { nullable: true },
            'advanced-discriminator': { discriminator: { propertyName: 'type' } },
            'webhooks': undefined // Remove webhooks entirely
        };
        return downgrades[feature];
    };
    /**
     * Get error collector
     */
    OpenAPI31ErrorHandler.prototype.getErrorCollector = function () {
        return this.collector;
    };
    /**
     * Create enhanced error with suggestions
     */
    OpenAPI31ErrorHandler.prototype.createEnhancedError = function (originalError, feature, location, context) {
        var enhancedError;
        // Determine error type and create appropriate error
        if (originalError instanceof openapi31_errors_1.OpenAPI31Error) {
            enhancedError = originalError;
        }
        else {
            enhancedError = new openapi31_errors_1.SchemaTransformationError(feature, location, 'unknown', originalError, this.getSuggestionForFeature(feature));
        }
        // Add context if provided
        if (context) {
            return new openapi31_errors_1.ContextualError(enhancedError, context);
        }
        return enhancedError;
    };
    /**
     * Get suggestion for a specific feature
     */
    OpenAPI31ErrorHandler.prototype.getSuggestionForFeature = function (feature) {
        var suggestions = {
            'type-array': 'Consider using nullable: true instead of type arrays for better compatibility',
            'prefixItems': 'Use regular array items schema for broader compatibility',
            'unevaluatedProperties': 'Use additionalProperties instead for OpenAPI 3.0 compatibility',
            'conditional-schema': 'Consider using oneOf or anyOf instead of if/then/else',
            'discriminator': 'Ensure discriminator has a valid propertyName and all referenced schemas exist',
            'webhooks': 'Webhooks are only supported in OpenAPI 3.1, consider using callbacks for 3.0',
            'const': 'Use enum with single value for OpenAPI 3.0 compatibility'
        };
        return suggestions[feature];
    };
    return OpenAPI31ErrorHandler;
}());
exports.OpenAPI31ErrorHandler = OpenAPI31ErrorHandler;
/**
 * Utility function to wrap potentially error-prone operations
 */
function withErrorHandling(operation, feature, location, errorHandler, context) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, enhancedError, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, operation()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    enhancedError = errorHandler.createEnhancedError(error_1 instanceof Error ? error_1 : new Error(String(error_1)), feature, location, context);
                    result = errorHandler.handleError(enhancedError, context);
                    if (result.shouldContinue) {
                        return [2 /*return*/, result.fallbackValue];
                    }
                    throw enhancedError;
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.withErrorHandling = withErrorHandling;
/**
 * Create error context from schema information
 */
function createErrorContext(schemaPath, version, processingStep, additionalContext) {
    return {
        schemaPath: schemaPath,
        version: version,
        processingStep: processingStep,
        context: additionalContext
    };
}
exports.createErrorContext = createErrorContext;
/**
 * Default error handler instance
 */
exports.defaultErrorHandler = new OpenAPI31ErrorHandler();
//# sourceMappingURL=error-handler.js.map