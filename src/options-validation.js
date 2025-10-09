"use strict";
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
exports.createFeatureChecker = exports.getEnabledFeatures = exports.validateGenerateOptions = exports.applyOpenAPI31Defaults = exports.validateAndNormalizeOpenAPI31Options = exports.DEFAULT_OPENAPI31_OPTIONS = exports.OptionsValidationError = void 0;
/**
 * Error class for invalid configuration options
 */
var OptionsValidationError = /** @class */ (function (_super) {
    __extends(OptionsValidationError, _super);
    function OptionsValidationError(option, value, suggestion) {
        var _this = _super.call(this, "Invalid option '".concat(option, "' with value '").concat(value, "'. ").concat(suggestion || '')) || this;
        _this.option = option;
        _this.value = value;
        _this.suggestion = suggestion;
        _this.name = 'OptionsValidationError';
        return _this;
    }
    return OptionsValidationError;
}(Error));
exports.OptionsValidationError = OptionsValidationError;
/**
 * Default OpenAPI 3.1 parse options
 */
exports.DEFAULT_OPENAPI31_OPTIONS = {
    enableWebhooks: false,
    strictNullHandling: true,
    enableConditionalSchemas: true,
    enablePrefixItems: true,
    enableUnevaluatedProperties: true,
    enableConstKeyword: true,
    enableContainsKeyword: true,
    enableEnhancedDiscriminator: true,
    fallbackToOpenAPI30: false,
};
/**
 * Validates and normalizes OpenAPI 3.1 parse options
 * @param options The options to validate and normalize
 * @returns Normalized options with defaults applied
 */
function validateAndNormalizeOpenAPI31Options(options) {
    if (!options) {
        return {};
    }
    var normalized = {};
    // Validate and normalize boolean options
    var booleanOptions = [
        'enableWebhooks',
        'strictNullHandling',
        'enableConditionalSchemas',
        'enablePrefixItems',
        'enableUnevaluatedProperties',
        'enableConstKeyword',
        'enableContainsKeyword',
        'enableEnhancedDiscriminator',
        'fallbackToOpenAPI30',
    ];
    for (var _i = 0, booleanOptions_1 = booleanOptions; _i < booleanOptions_1.length; _i++) {
        var option = booleanOptions_1[_i];
        var value = options[option];
        if (value !== undefined) {
            if (typeof value !== 'boolean') {
                throw new OptionsValidationError(String(option), value, 'Must be a boolean value (true or false)');
            }
            normalized[option] = value;
        }
    }
    return normalized;
}
exports.validateAndNormalizeOpenAPI31Options = validateAndNormalizeOpenAPI31Options;
/**
 * Applies default values to OpenAPI 3.1 options
 * @param options The options to apply defaults to
 * @returns Options with defaults applied
 */
function applyOpenAPI31Defaults(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var normalized = validateAndNormalizeOpenAPI31Options(options);
    return {
        enableWebhooks: (_a = normalized.enableWebhooks) !== null && _a !== void 0 ? _a : exports.DEFAULT_OPENAPI31_OPTIONS.enableWebhooks,
        strictNullHandling: (_b = normalized.strictNullHandling) !== null && _b !== void 0 ? _b : exports.DEFAULT_OPENAPI31_OPTIONS.strictNullHandling,
        enableConditionalSchemas: (_c = normalized.enableConditionalSchemas) !== null && _c !== void 0 ? _c : exports.DEFAULT_OPENAPI31_OPTIONS.enableConditionalSchemas,
        enablePrefixItems: (_d = normalized.enablePrefixItems) !== null && _d !== void 0 ? _d : exports.DEFAULT_OPENAPI31_OPTIONS.enablePrefixItems,
        enableUnevaluatedProperties: (_e = normalized.enableUnevaluatedProperties) !== null && _e !== void 0 ? _e : exports.DEFAULT_OPENAPI31_OPTIONS.enableUnevaluatedProperties,
        enableConstKeyword: (_f = normalized.enableConstKeyword) !== null && _f !== void 0 ? _f : exports.DEFAULT_OPENAPI31_OPTIONS.enableConstKeyword,
        enableContainsKeyword: (_g = normalized.enableContainsKeyword) !== null && _g !== void 0 ? _g : exports.DEFAULT_OPENAPI31_OPTIONS.enableContainsKeyword,
        enableEnhancedDiscriminator: (_h = normalized.enableEnhancedDiscriminator) !== null && _h !== void 0 ? _h : exports.DEFAULT_OPENAPI31_OPTIONS.enableEnhancedDiscriminator,
        fallbackToOpenAPI30: (_j = normalized.fallbackToOpenAPI30) !== null && _j !== void 0 ? _j : exports.DEFAULT_OPENAPI31_OPTIONS.fallbackToOpenAPI30,
    };
}
exports.applyOpenAPI31Defaults = applyOpenAPI31Defaults;
/**
 * Validates the complete GenerateOptions configuration
 * @param options The options to validate
 * @returns Validated options
 */
function validateGenerateOptions(options) {
    // Validate required options
    if (!options.schemaFile) {
        throw new OptionsValidationError('schemaFile', options.schemaFile, 'Schema file path is required');
    }
    if (!options.schemaType) {
        throw new OptionsValidationError('schemaType', options.schemaType, 'Schema type is required (yaml, json, or custom)');
    }
    if (!['yaml', 'json', 'custom'].includes(options.schemaType)) {
        throw new OptionsValidationError('schemaType', options.schemaType, 'Schema type must be one of: yaml, json, custom');
    }
    if (!options.directory) {
        throw new OptionsValidationError('directory', options.directory, 'Output directory is required');
    }
    // Validate directory format
    if (typeof options.directory !== 'string' && !Array.isArray(options.directory)) {
        throw new OptionsValidationError('directory', options.directory, 'Directory must be a string or array of strings');
    }
    if (Array.isArray(options.directory)) {
        if (options.directory.length === 0) {
            throw new OptionsValidationError('directory', options.directory, 'Directory array cannot be empty');
        }
        for (var _i = 0, _a = options.directory; _i < _a.length; _i++) {
            var dir = _a[_i];
            if (typeof dir !== 'string') {
                throw new OptionsValidationError('directory', dir, 'All directory entries must be strings');
            }
        }
    }
    // Validate boolean options
    var booleanOptions = [
        'addFormats',
        'skipMetaFile',
        'skipSchemaFile',
        'skipDecoders',
        'esm',
        'debug',
    ];
    for (var _b = 0, booleanOptions_2 = booleanOptions; _b < booleanOptions_2.length; _b++) {
        var option = booleanOptions_2[_b];
        var value = options[option];
        if (value !== undefined && typeof value !== 'boolean') {
            throw new OptionsValidationError(option, value, 'Must be a boolean value (true or false)');
        }
    }
    // Validate standalone options
    if (options.standalone) {
        if (typeof options.standalone !== 'object') {
            throw new OptionsValidationError('standalone', options.standalone, 'Standalone options must be an object');
        }
        if (options.standalone.validatorOutput &&
            !['module', 'commonjs'].includes(options.standalone.validatorOutput)) {
            throw new OptionsValidationError('standalone.validatorOutput', options.standalone.validatorOutput, 'Validator output must be either "module" or "commonjs"');
        }
        if (options.standalone.mergeDecoders !== undefined &&
            typeof options.standalone.mergeDecoders !== 'boolean') {
            throw new OptionsValidationError('standalone.mergeDecoders', options.standalone.mergeDecoders, 'mergeDecoders must be a boolean value');
        }
    }
    // Validate decoders array
    if (options.decoders !== undefined) {
        if (!Array.isArray(options.decoders)) {
            throw new OptionsValidationError('decoders', options.decoders, 'Decoders must be an array of strings');
        }
        for (var _c = 0, _d = options.decoders; _c < _d.length; _c++) {
            var decoder = _d[_c];
            if (typeof decoder !== 'string') {
                throw new OptionsValidationError('decoders', decoder, 'All decoder entries must be strings');
            }
        }
    }
    // Validate OpenAPI 3.1 options
    if (options.openapi31) {
        validateAndNormalizeOpenAPI31Options(options.openapi31);
    }
    return options;
}
exports.validateGenerateOptions = validateGenerateOptions;
/**
 * Checks if OpenAPI 3.1 features are enabled based on options
 * @param options The OpenAPI 3.1 options
 * @returns Object indicating which features are enabled
 */
function getEnabledFeatures(options) {
    var normalizedOptions = applyOpenAPI31Defaults(options);
    return {
        webhooks: normalizedOptions.enableWebhooks,
        strictNullHandling: normalizedOptions.strictNullHandling,
        conditionalSchemas: normalizedOptions.enableConditionalSchemas,
        prefixItems: normalizedOptions.enablePrefixItems,
        unevaluatedProperties: normalizedOptions.enableUnevaluatedProperties,
        constKeyword: normalizedOptions.enableConstKeyword,
        containsKeyword: normalizedOptions.enableContainsKeyword,
        enhancedDiscriminator: normalizedOptions.enableEnhancedDiscriminator,
        fallbackToOpenAPI30: normalizedOptions.fallbackToOpenAPI30,
    };
}
exports.getEnabledFeatures = getEnabledFeatures;
/**
 * Creates a feature flag checker for gradual rollout
 * @param options The OpenAPI 3.1 options
 * @returns Function to check if a feature is enabled
 */
function createFeatureChecker(options) {
    var enabledFeatures = getEnabledFeatures(options);
    return {
        isWebhooksEnabled: function () { return enabledFeatures.webhooks; },
        isStrictNullHandlingEnabled: function () { return enabledFeatures.strictNullHandling; },
        isConditionalSchemasEnabled: function () { return enabledFeatures.conditionalSchemas; },
        isPrefixItemsEnabled: function () { return enabledFeatures.prefixItems; },
        isUnevaluatedPropertiesEnabled: function () { return enabledFeatures.unevaluatedProperties; },
        isConstKeywordEnabled: function () { return enabledFeatures.constKeyword; },
        isContainsKeywordEnabled: function () { return enabledFeatures.containsKeyword; },
        isEnhancedDiscriminatorEnabled: function () { return enabledFeatures.enhancedDiscriminator; },
        isFallbackToOpenAPI30Enabled: function () { return enabledFeatures.fallbackToOpenAPI30; },
        // Convenience method to check multiple features at once
        areAllEnabled: function () {
            var features = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                features[_i] = arguments[_i];
            }
            return features.every(function (feature) { return enabledFeatures[feature]; });
        },
        // Get all enabled features as an array
        getEnabledFeatureNames: function () {
            return Object.entries(enabledFeatures)
                .filter(function (_a) {
                var enabled = _a[1];
                return enabled;
            })
                .map(function (_a) {
                var name = _a[0];
                return name;
            });
        },
    };
}
exports.createFeatureChecker = createFeatureChecker;
//# sourceMappingURL=options-validation.js.map