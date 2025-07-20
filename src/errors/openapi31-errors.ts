/**
 * OpenAPI 3.1 specific error classes and utilities
 */

import { OpenAPIVersionInfo } from '../version-detection';

/**
 * Base class for all OpenAPI 3.1 related errors
 */
export class OpenAPI31Error extends Error {
  constructor(
    message: string,
    public readonly feature: string,
    public readonly location: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Get a formatted error message with location and suggestion
   */
  getFormattedMessage(): string {
    let message = `${this.message} (at ${this.location})`;
    if (this.suggestion) {
      message += `\n\nSuggestion: ${this.suggestion}`;
    }
    return message;
  }
}

/**
 * Error thrown when an OpenAPI 3.1 feature is not yet supported
 */
export class UnsupportedFeatureError extends OpenAPI31Error {
  constructor(
    feature: string,
    location: string,
    suggestion?: string
  ) {
    const message = `OpenAPI 3.1 feature '${feature}' is not yet supported`;
    super(message, feature, location, suggestion);
  }
}

/**
 * Error thrown when an OpenAPI 3.1 feature is used incorrectly
 */
export class InvalidFeatureUsageError extends OpenAPI31Error {
  constructor(
    feature: string,
    location: string,
    reason: string,
    suggestion?: string
  ) {
    const message = `Invalid usage of OpenAPI 3.1 feature '${feature}': ${reason}`;
    super(message, feature, location, suggestion);
  }
}

/**
 * Error thrown when schema transformation fails
 */
export class SchemaTransformationError extends OpenAPI31Error {
  constructor(
    feature: string,
    location: string,
    transformationStep: string,
    originalError?: Error,
    suggestion?: string
  ) {
    const message = `Failed to transform OpenAPI 3.1 feature '${feature}' during ${transformationStep}`;
    super(message, feature, location, suggestion);
    
    if (originalError) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}

/**
 * Error thrown when version compatibility issues occur
 */
export class VersionCompatibilityError extends OpenAPI31Error {
  constructor(
    public readonly detectedVersion: OpenAPIVersionInfo,
    feature: string,
    location: string,
    suggestion?: string
  ) {
    const message = `Feature '${feature}' requires OpenAPI 3.1 but detected version ${detectedVersion.version}`;
    super(message, feature, location, suggestion);
  }
}

/**
 * Error thrown when webhook processing fails
 */
export class WebhookProcessingError extends OpenAPI31Error {
  constructor(
    webhookName: string,
    location: string,
    reason: string,
    suggestion?: string
  ) {
    const message = `Failed to process webhook '${webhookName}': ${reason}`;
    super(message, 'webhooks', location, suggestion);
  }
}

/**
 * Error thrown when discriminator processing fails
 */
export class DiscriminatorError extends OpenAPI31Error {
  constructor(
    location: string,
    reason: string,
    suggestion?: string
  ) {
    const message = `Discriminator processing failed: ${reason}`;
    super(message, 'discriminator', location, suggestion);
  }
}

/**
 * Error thrown when conditional schema processing fails
 */
export class ConditionalSchemaError extends OpenAPI31Error {
  constructor(
    location: string,
    reason: string,
    suggestion?: string
  ) {
    const message = `Conditional schema processing failed: ${reason}`;
    super(message, 'conditional-schema', location, suggestion);
  }
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
export class ContextualError extends OpenAPI31Error {
  constructor(
    originalError: OpenAPI31Error,
    public readonly errorContext: ErrorContext
  ) {
    super(
      originalError.message,
      originalError.feature,
      originalError.location,
      originalError.suggestion
    );
    
    this.name = 'ContextualError';
    this.stack = originalError.stack;
  }

  /**
   * Get detailed error information including context
   */
  getDetailedMessage(): string {
    let message = this.getFormattedMessage();
    
    message += `\n\nError Context:`;
    message += `\n  Schema Path: ${this.errorContext.schemaPath}`;
    message += `\n  OpenAPI Version: ${this.errorContext.version.version}`;
    
    if (this.errorContext.processingStep) {
      message += `\n  Processing Step: ${this.errorContext.processingStep}`;
    }
    
    if (this.errorContext.context) {
      message += `\n  Additional Context: ${JSON.stringify(this.errorContext.context, null, 2)}`;
    }
    
    return message;
  }
}

/**
 * Common error messages and suggestions for OpenAPI 3.1 features
 */
export const ERROR_MESSAGES = {
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
} as const;

/**
 * Utility function to create error with common patterns
 */
export function createFeatureError(
  errorType: 'unsupported' | 'invalid' | 'transformation',
  feature: string,
  location: string,
  details?: {
    reason?: string;
    transformationStep?: string;
    originalError?: Error;
    suggestion?: string;
  }
): OpenAPI31Error {
  const suggestion = details?.suggestion;
  
  switch (errorType) {
    case 'unsupported':
      return new UnsupportedFeatureError(feature, location, suggestion);
    
    case 'invalid':
      return new InvalidFeatureUsageError(
        feature,
        location,
        details?.reason || 'Invalid usage',
        suggestion
      );
    
    case 'transformation':
      return new SchemaTransformationError(
        feature,
        location,
        details?.transformationStep || 'unknown',
        details?.originalError,
        suggestion
      );
    
    default:
      return new OpenAPI31Error(`Unknown error with feature '${feature}'`, feature, location, suggestion);
  }
}