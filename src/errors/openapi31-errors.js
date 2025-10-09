"use strict";
/**
 * OpenAPI 3.1 specific error classes and utilities
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureError = exports.ERROR_MESSAGES = exports.ContextualError = exports.ConditionalSchemaError = exports.DiscriminatorError = exports.WebhookProcessingError = exports.VersionCompatibilityError = exports.SchemaTransformationError = exports.InvalidFeatureUsageError = exports.UnsupportedFeatureError = exports.OpenAPI31Error = void 0;
/**
 * Base class for all OpenAPI 3.1 related errors
 */
var OpenAPI31Error = /** @class */ (function (_super) {
    __extends(OpenAPI31Error, _super);
    function OpenAPI31Error(message, feature, location, suggestion) {
        var _this = _super.call(this, message) || this;
        _this.feature = feature;
        _this.location = location;
        _this.suggestion = suggestion;
        _this.name = _this.constructor.name;
        return _this;
    }
    /**
     * Get a formatted error message with location and suggestion
     */
    OpenAPI31Error.prototype.getFormattedMessage = function () {
        var message = "".concat(this.message, " (at ").concat(this.location, ")");
        if (this.suggestion) {
            message += "\n\nSuggestion: ".concat(this.suggestion);
        }
        return message;
    };
    return OpenAPI31Error;
}(Error));
exports.OpenAPI31Error = OpenAPI31Error;
/**
 * Error thrown when an OpenAPI 3.1 feature is not yet supported
 */
var UnsupportedFeatureError = /** @class */ (function (_super) {
    __extends(UnsupportedFeatureError, _super);
    function UnsupportedFeatureError(feature, location, suggestion) {
        var message = "OpenAPI 3.1 feature '".concat(feature, "' is not yet supported");
        return _super.call(this, message, feature, location, suggestion) || this;
    }
    return UnsupportedFeatureError;
}(OpenAPI31Error));
exports.UnsupportedFeatureError = UnsupportedFeatureError;
/**
 * Error thrown when an OpenAPI 3.1 feature is used incorrectly
 */
var InvalidFeatureUsageError = /** @class */ (function (_super) {
    __extends(InvalidFeatureUsageError, _super);
    function InvalidFeatureUsageError(feature, location, reason, suggestion) {
        var message = "Invalid usage of OpenAPI 3.1 feature '".concat(feature, "': ").concat(reason);
        return _super.call(this, message, feature, location, suggestion) || this;
    }
    return InvalidFeatureUsageError;
}(OpenAPI31Error));
exports.InvalidFeatureUsageError = InvalidFeatureUsageError;
/**
 * Error thrown when schema transformation fails
 */
var SchemaTransformationError = /** @class */ (function (_super) {
    __extends(SchemaTransformationError, _super);
    function SchemaTransformationError(feature, location, transformationStep, originalError, suggestion) {
        var _this = this;
        var message = "Failed to transform OpenAPI 3.1 feature '".concat(feature, "' during ").concat(transformationStep);
        _this = _super.call(this, message, feature, location, suggestion) || this;
        if (originalError) {
            _this.stack = "".concat(_this.stack, "\nCaused by: ").concat(originalError.stack);
        }
        return _this;
    }
    return SchemaTransformationError;
}(OpenAPI31Error));
exports.SchemaTransformationError = SchemaTransformationError;
/**
 * Error thrown when version compatibility issues occur
 */
var VersionCompatibilityError = /** @class */ (function (_super) {
    __extends(VersionCompatibilityError, _super);
    function VersionCompatibilityError(detectedVersion, feature, location, suggestion) {
        var _this = this;
        var message = "Feature '".concat(feature, "' requires OpenAPI 3.1 but detected version ").concat(detectedVersion.version);
        _this = _super.call(this, message, feature, location, suggestion) || this;
        _this.detectedVersion = detectedVersion;
        return _this;
    }
    return VersionCompatibilityError;
}(OpenAPI31Error));
exports.VersionCompatibilityError = VersionCompatibilityError;
/**
 * Error thrown when webhook processing fails
 */
var WebhookProcessingError = /** @class */ (function (_super) {
    __extends(WebhookProcessingError, _super);
    function WebhookProcessingError(webhookName, location, reason, suggestion) {
        var message = "Failed to process webhook '".concat(webhookName, "': ").concat(reason);
        return _super.call(this, message, 'webhooks', location, suggestion) || this;
    }
    return WebhookProcessingError;
}(OpenAPI31Error));
exports.WebhookProcessingError = WebhookProcessingError;
/**
 * Error thrown when discriminator processing fails
 */
var DiscriminatorError = /** @class */ (function (_super) {
    __extends(DiscriminatorError, _super);
    function DiscriminatorError(location, reason, suggestion) {
        var message = "Discriminator processing failed: ".concat(reason);
        return _super.call(this, message, 'discriminator', location, suggestion) || this;
    }
    return DiscriminatorError;
}(OpenAPI31Error));
exports.DiscriminatorError = DiscriminatorError;
/**
 * Error thrown when conditional schema processing fails
 */
var ConditionalSchemaError = /** @class */ (function (_super) {
    __extends(ConditionalSchemaError, _super);
    function ConditionalSchemaError(location, reason, suggestion) {
        var message = "Conditional schema processing failed: ".concat(reason);
        return _super.call(this, message, 'conditional-schema', location, suggestion) || this;
    }
    return ConditionalSchemaError;
}(OpenAPI31Error));
exports.ConditionalSchemaError = ConditionalSchemaError;
/**
 * Enhanced error with additional context information
 */
var ContextualError = /** @class */ (function (_super) {
    __extends(ContextualError, _super);
    function ContextualError(originalError, errorContext) {
        var _this = _super.call(this, originalError.message, originalError.feature, originalError.location, originalError.suggestion) || this;
        _this.errorContext = errorContext;
        _this.name = 'ContextualError';
        _this.stack = originalError.stack;
        return _this;
    }
    /**
     * Get detailed error information including context
     */
    ContextualError.prototype.getDetailedMessage = function () {
        var message = this.getFormattedMessage();
        message += "\n\nError Context:";
        message += "\n  Schema Path: ".concat(this.errorContext.schemaPath);
        message += "\n  OpenAPI Version: ".concat(this.errorContext.version.version);
        if (this.errorContext.processingStep) {
            message += "\n  Processing Step: ".concat(this.errorContext.processingStep);
        }
        if (this.errorContext.context) {
            message += "\n  Additional Context: ".concat(JSON.stringify(this.errorContext.context, null, 2));
        }
        return message;
    };
    return ContextualError;
}(OpenAPI31Error));
exports.ContextualError = ContextualError;
/**
 * Common error messages and suggestions for OpenAPI 3.1 features
 */
exports.ERROR_MESSAGES = {
    UNSUPPORTED_FEATURES: {
        ADVANCED_DISCRIMINATOR: {
            message: 'Advanced discriminator features are not fully supported',
            suggestion: 'Use basic discriminator with propertyName only, or consider using oneOf/anyOf instead'
        },
        COMPLEX_CONDITIONAL: {
            message: 'Complex conditional schemas with nested if/then/else are not supported',
            suggestion: 'Simplify conditional logic or use separate schema definitions'
        },
        UNEVALUATED_PROPERTIES_COMPLEX: {
            message: 'Complex unevaluatedProperties scenarios are not supported',
            suggestion: 'Use additionalProperties instead or simplify the schema structure'
        }
    },
    INVALID_USAGE: {
        TYPE_ARRAY_EMPTY: {
            message: 'Type array cannot be empty',
            suggestion: 'Provide at least one type in the array, e.g., ["string"] or ["string", "null"]'
        },
        PREFIX_ITEMS_WITHOUT_ARRAY: {
            message: 'prefixItems can only be used with array type',
            suggestion: 'Ensure the schema has type: "array" when using prefixItems'
        },
        DISCRIMINATOR_MISSING_PROPERTY: {
            message: 'Discriminator propertyName is required',
            suggestion: 'Add propertyName field to discriminator object'
        }
    },
    TRANSFORMATION_ERRORS: {
        NULL_TYPE_CONVERSION: {
            message: 'Failed to convert null type array to union type',
            suggestion: 'Check that type array contains valid type names'
        },
        TUPLE_TYPE_GENERATION: {
            message: 'Failed to generate TypeScript tuple type from prefixItems',
            suggestion: 'Ensure prefixItems contains valid schema objects'
        }
    }
};
/**
 * Utility function to create error with common patterns
 */
function createFeatureError(errorType, feature, location, details) {
    var suggestion = details === null || details === void 0 ? void 0 : details.suggestion;
    switch (errorType) {
        case 'unsupported':
            return new UnsupportedFeatureError(feature, location, suggestion);
        case 'invalid':
            return new InvalidFeatureUsageError(feature, location, (details === null || details === void 0 ? void 0 : details.reason) || 'Invalid usage', suggestion);
        case 'transformation':
            return new SchemaTransformationError(feature, location, (details === null || details === void 0 ? void 0 : details.transformationStep) || 'unknown', details === null || details === void 0 ? void 0 : details.originalError, suggestion);
        default:
            return new OpenAPI31Error("Unknown error with feature '".concat(feature, "'"), feature, location, suggestion);
    }
}
exports.createFeatureError = createFeatureError;
//# sourceMappingURL=openapi31-errors.js.map