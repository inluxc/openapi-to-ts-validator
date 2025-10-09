"use strict";
/**
 * Debug logging system for OpenAPI 3.1 processing
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = exports.createLogger = exports.OpenAPI31Logger = exports.isDebugEnabled = exports.getDebugConfig = exports.configureDebugLogging = exports.LogLevel = void 0;
/**
 * Log levels for debug output
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
    LogLevel[LogLevel["TRACE"] = 4] = "TRACE";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
/**
 * Default debug configuration
 */
var DEFAULT_CONFIG = {
    enabled: false,
    level: LogLevel.INFO,
    includeTimestamp: true,
    includeStackTrace: false
};
/**
 * Global debug configuration
 */
var debugConfig = __assign({}, DEFAULT_CONFIG);
/**
 * Configure debug logging
 */
function configureDebugLogging(config) {
    debugConfig = __assign(__assign({}, debugConfig), config);
}
exports.configureDebugLogging = configureDebugLogging;
/**
 * Get current debug configuration
 */
function getDebugConfig() {
    return __assign({}, debugConfig);
}
exports.getDebugConfig = getDebugConfig;
/**
 * Check if debug logging is enabled for a specific level
 */
function isDebugEnabled(level) {
    if (level === void 0) { level = LogLevel.DEBUG; }
    return debugConfig.enabled && debugConfig.level >= level;
}
exports.isDebugEnabled = isDebugEnabled;
/**
 * Format log message with timestamp and level
 */
function formatMessage(level, message) {
    var levelName = LogLevel[level];
    var timestamp = debugConfig.includeTimestamp ? new Date().toISOString() : '';
    return "".concat(timestamp ? "[".concat(timestamp, "] ") : '', "[").concat(levelName, "] ").concat(message);
}
/**
 * Internal logging function
 */
function log(level, message) {
    if (!isDebugEnabled(level)) {
        return;
    }
    var formattedMessage = formatMessage(level, message);
    if (debugConfig.logFunction) {
        debugConfig.logFunction(level, formattedMessage);
    }
    else {
        // Default to console output
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
                break;
        }
    }
}
/**
 * Debug logger for OpenAPI 3.1 processing
 */
var OpenAPI31Logger = /** @class */ (function () {
    function OpenAPI31Logger(context) {
        this.context = context;
    }
    /**
     * Log error message
     */
    OpenAPI31Logger.prototype.error = function (message, error) {
        var fullMessage = "[".concat(this.context, "] ").concat(message);
        log(LogLevel.ERROR, fullMessage);
        if (error && debugConfig.includeStackTrace) {
            log(LogLevel.ERROR, "Stack trace: ".concat(error.stack));
        }
    };
    /**
     * Log warning message
     */
    OpenAPI31Logger.prototype.warn = function (message) {
        log(LogLevel.WARN, "[".concat(this.context, "] ").concat(message));
    };
    /**
     * Log info message
     */
    OpenAPI31Logger.prototype.info = function (message) {
        log(LogLevel.INFO, "[".concat(this.context, "] ").concat(message));
    };
    /**
     * Log debug message
     */
    OpenAPI31Logger.prototype.debug = function (message) {
        log(LogLevel.DEBUG, "[".concat(this.context, "] ").concat(message));
    };
    /**
     * Log trace message
     */
    OpenAPI31Logger.prototype.trace = function (message) {
        log(LogLevel.TRACE, "[".concat(this.context, "] ").concat(message));
    };
    /**
     * Log processing step
     */
    OpenAPI31Logger.prototype.step = function (stepName, details) {
        var message = "Processing step: ".concat(stepName);
        if (details) {
            message += " - ".concat(JSON.stringify(details));
        }
        this.debug(message);
    };
    /**
     * Log feature detection
     */
    OpenAPI31Logger.prototype.featureDetected = function (feature, location, supported) {
        var status = supported ? 'SUPPORTED' : 'UNSUPPORTED';
        this.info("Feature '".concat(feature, "' detected at '").concat(location, "' - ").concat(status));
    };
    /**
     * Log schema transformation
     */
    OpenAPI31Logger.prototype.transformation = function (feature, location, before, after) {
        if (isDebugEnabled(LogLevel.TRACE)) {
            this.trace("Transforming '".concat(feature, "' at '").concat(location, "':"));
            this.trace("  Before: ".concat(JSON.stringify(before, null, 2)));
            this.trace("  After: ".concat(JSON.stringify(after, null, 2)));
        }
        else {
            this.debug("Transformed '".concat(feature, "' at '").concat(location, "'"));
        }
    };
    /**
     * Log version information
     */
    OpenAPI31Logger.prototype.version = function (version) {
        this.info("Processing OpenAPI ".concat(version.version, " (3.1: ").concat(version.isVersion31, ")"));
    };
    /**
     * Create child logger with additional context
     */
    OpenAPI31Logger.prototype.child = function (additionalContext) {
        return new OpenAPI31Logger("".concat(this.context, ":").concat(additionalContext));
    };
    return OpenAPI31Logger;
}());
exports.OpenAPI31Logger = OpenAPI31Logger;
/**
 * Create a logger for a specific context
 */
function createLogger(context) {
    return new OpenAPI31Logger(context);
}
exports.createLogger = createLogger;
/**
 * Convenience loggers for common contexts
 */
exports.loggers = {
    parser: createLogger('Parser'),
    transformer: createLogger('Transformer'),
    generator: createLogger('Generator'),
    validator: createLogger('Validator'),
    discriminator: createLogger('Discriminator'),
    webhook: createLogger('Webhook'),
    conditional: createLogger('Conditional'),
    version: createLogger('Version')
};
/**
 * Enable debug logging with environment variable
 */
if (process.env.OPENAPI_31_DEBUG === 'true' || process.env.DEBUG === 'openapi-31') {
    configureDebugLogging({
        enabled: true,
        level: LogLevel.DEBUG,
        includeStackTrace: true
    });
}
/**
 * Enable trace logging with environment variable
 */
if (process.env.OPENAPI_31_TRACE === 'true' || process.env.DEBUG === 'openapi-31:trace') {
    configureDebugLogging({
        enabled: true,
        level: LogLevel.TRACE,
        includeStackTrace: true
    });
}
//# sourceMappingURL=debug-logger.js.map