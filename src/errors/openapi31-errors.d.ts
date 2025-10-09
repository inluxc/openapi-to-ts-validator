/**
 * OpenAPI 3.1 specific error classes and utilities
 */
import { OpenAPIVersionInfo } from '../version-detection';
/**
 * Base class for all OpenAPI 3.1 related errors
 */
export declare class OpenAPI31Error extends Error {
    readonly feature: string;
    readonly location: string;
    readonly suggestion?: string | undefined;
    constructor(message: string, feature: string, location: string, suggestion?: string | undefined);
    /**
     * Get a formatted error message with location and suggestion
     */
    getFormattedMessage(): string;
}
/**
 * Error thrown when an OpenAPI 3.1 feature is not yet supported
 */
export declare class UnsupportedFeatureError extends OpenAPI31Error {
    constructor(feature: string, location: string, suggestion?: string);
}
/**
 * Error thrown when an OpenAPI 3.1 feature is used incorrectly
 */
export declare class InvalidFeatureUsageError extends OpenAPI31Error {
    constructor(feature: string, location: string, reason: string, suggestion?: string);
}
/**
 * Error thrown when schema transformation fails
 */
export declare class SchemaTransformationError extends OpenAPI31Error {
    constructor(feature: string, location: string, transformationStep: string, originalError?: Error, suggestion?: string);
}
/**
 * Error thrown when version compatibility issues occur
 */
export declare class VersionCompatibilityError extends OpenAPI31Error {
    readonly detectedVersion: OpenAPIVersionInfo;
    constructor(detectedVersion: OpenAPIVersionInfo, feature: string, location: string, suggestion?: string);
}
/**
 * Error thrown when webhook processing fails
 */
export declare class WebhookProcessingError extends OpenAPI31Error {
    constructor(webhookName: string, location: string, reason: string, suggestion?: string);
}
/**
 * Error thrown when discriminator processing fails
 */
export declare class DiscriminatorError extends OpenAPI31Error {
    constructor(location: string, reason: string, suggestion?: string);
}
/**
 * Error thrown when conditional schema processing fails
 */
export declare class ConditionalSchemaError extends OpenAPI31Error {
    constructor(location: string, reason: string, suggestion?: string);
}
/**
 * Error context for providing additional debugging information
 */
export interface ErrorContext {
    /** The schema path where the error occurred */
    schemaPath: string;
    /** The OpenAPI version being processed */
    version: OpenAPIVersionInfo;
    /** Additional context data */
    context?: Record<string, any>;
    /** Processing step where error occurred */
    processingStep?: string;
}
/**
 * Enhanced error with additional context information
 */
export declare class ContextualError extends OpenAPI31Error {
    readonly errorContext: ErrorContext;
    constructor(originalError: OpenAPI31Error, errorContext: ErrorContext);
    /**
     * Get detailed error information including context
     */
    getDetailedMessage(): string;
}
/**
 * Common error messages and suggestions for OpenAPI 3.1 features
 */
export declare const ERROR_MESSAGES: {
    readonly UNSUPPORTED_FEATURES: {
        readonly ADVANCED_DISCRIMINATOR: {
            readonly message: "Advanced discriminator features are not fully supported";
            readonly suggestion: "Use basic discriminator with propertyName only, or consider using oneOf/anyOf instead";
        };
        readonly COMPLEX_CONDITIONAL: {
            readonly message: "Complex conditional schemas with nested if/then/else are not supported";
            readonly suggestion: "Simplify conditional logic or use separate schema definitions";
        };
        readonly UNEVALUATED_PROPERTIES_COMPLEX: {
            readonly message: "Complex unevaluatedProperties scenarios are not supported";
            readonly suggestion: "Use additionalProperties instead or simplify the schema structure";
        };
    };
    readonly INVALID_USAGE: {
        readonly TYPE_ARRAY_EMPTY: {
            readonly message: "Type array cannot be empty";
            readonly suggestion: "Provide at least one type in the array, e.g., [\"string\"] or [\"string\", \"null\"]";
        };
        readonly PREFIX_ITEMS_WITHOUT_ARRAY: {
            readonly message: "prefixItems can only be used with array type";
            readonly suggestion: "Ensure the schema has type: \"array\" when using prefixItems";
        };
        readonly DISCRIMINATOR_MISSING_PROPERTY: {
            readonly message: "Discriminator propertyName is required";
            readonly suggestion: "Add propertyName field to discriminator object";
        };
    };
    readonly TRANSFORMATION_ERRORS: {
        readonly NULL_TYPE_CONVERSION: {
            readonly message: "Failed to convert null type array to union type";
            readonly suggestion: "Check that type array contains valid type names";
        };
        readonly TUPLE_TYPE_GENERATION: {
            readonly message: "Failed to generate TypeScript tuple type from prefixItems";
            readonly suggestion: "Ensure prefixItems contains valid schema objects";
        };
    };
};
/**
 * Utility function to create error with common patterns
 */
export declare function createFeatureError(errorType: 'unsupported' | 'invalid' | 'transformation', feature: string, location: string, details?: {
    reason?: string;
    transformationStep?: string;
    originalError?: Error;
    suggestion?: string;
}): OpenAPI31Error;
