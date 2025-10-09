import type { GenerateOptions, OpenAPI31ParseOptions } from "./GenerateOptions";
/**
 * Error class for invalid configuration options
 */
export declare class OptionsValidationError extends Error {
    option: string;
    value: any;
    suggestion?: string | undefined;
    constructor(option: string, value: any, suggestion?: string | undefined);
}
/**
 * Default OpenAPI 3.1 parse options
 */
export declare const DEFAULT_OPENAPI31_OPTIONS: Required<OpenAPI31ParseOptions>;
/**
 * Validates and normalizes OpenAPI 3.1 parse options
 * @param options The options to validate and normalize
 * @returns Normalized options with defaults applied
 */
export declare function validateAndNormalizeOpenAPI31Options(options?: OpenAPI31ParseOptions): OpenAPI31ParseOptions;
/**
 * Applies default values to OpenAPI 3.1 options
 * @param options The options to apply defaults to
 * @returns Options with defaults applied
 */
export declare function applyOpenAPI31Defaults(options?: OpenAPI31ParseOptions): Required<OpenAPI31ParseOptions>;
/**
 * Validates the complete GenerateOptions configuration
 * @param options The options to validate
 * @returns Validated options
 */
export declare function validateGenerateOptions(options: GenerateOptions): GenerateOptions;
/**
 * Checks if OpenAPI 3.1 features are enabled based on options
 * @param options The OpenAPI 3.1 options
 * @returns Object indicating which features are enabled
 */
export declare function getEnabledFeatures(options?: OpenAPI31ParseOptions): {
    webhooks: boolean;
    strictNullHandling: boolean;
    conditionalSchemas: boolean;
    prefixItems: boolean;
    unevaluatedProperties: boolean;
    constKeyword: boolean;
    containsKeyword: boolean;
    enhancedDiscriminator: boolean;
    fallbackToOpenAPI30: boolean;
};
/**
 * Creates a feature flag checker for gradual rollout
 * @param options The OpenAPI 3.1 options
 * @returns Function to check if a feature is enabled
 */
export declare function createFeatureChecker(options?: OpenAPI31ParseOptions): {
    isWebhooksEnabled: () => boolean;
    isStrictNullHandlingEnabled: () => boolean;
    isConditionalSchemasEnabled: () => boolean;
    isPrefixItemsEnabled: () => boolean;
    isUnevaluatedPropertiesEnabled: () => boolean;
    isConstKeywordEnabled: () => boolean;
    isContainsKeywordEnabled: () => boolean;
    isEnhancedDiscriminatorEnabled: () => boolean;
    isFallbackToOpenAPI30Enabled: () => boolean;
    areAllEnabled: (...features: ("prefixItems" | "webhooks" | "fallbackToOpenAPI30" | "unevaluatedProperties" | "strictNullHandling" | "conditionalSchemas" | "constKeyword" | "containsKeyword" | "enhancedDiscriminator")[]) => boolean;
    getEnabledFeatureNames: () => string[];
};
