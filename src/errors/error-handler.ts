/**
 * Error handling utilities for OpenAPI 3.1 processing
 */

import { OpenAPIVersionInfo } from '../version-detection';
import { 
  OpenAPI31Error, 
  UnsupportedFeatureError, 
  InvalidFeatureUsageError,
  SchemaTransformationError,
  VersionCompatibilityError,
  ErrorContext,
  ContextualError,
  ERROR_MESSAGES
} from './openapi31-errors';
import { OpenAPI31Logger, createLogger } from './debug-logger';

const logger = createLogger('ErrorHandler');

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  /** Skip the problematic feature */
  SKIP = 'skip',
  /** Use a fallback implementation */
  FALLBACK = 'fallback',
  /** Convert to OpenAPI 3.0 equivalent */
  DOWNGRADE = 'downgrade',
  /** Fail with detailed error */
  FAIL = 'fail'
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  /** Default recovery strategy */
  defaultStrategy: RecoveryStrategy;
  /** Feature-specific recovery strategies */
  featureStrategies: Record<string, RecoveryStrategy>;
  /** Whether to collect and report all errors */
  collectAllErrors: boolean;
  /** Maximum number of errors to collect */
  maxErrors: number;
  /** Whether to include suggestions in error messages */
  includeSuggestions: boolean;
}

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
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
export class ErrorCollector {
  private errors: OpenAPI31Error[] = [];
  private config: ErrorHandlingConfig;

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_CONFIG, ...config };
  }

  /**
   * Add an error to the collection
   */
  addError(error: OpenAPI31Error): void {
    if (this.errors.length >= this.config.maxErrors) {
      logger.warn(`Maximum error count (${this.config.maxErrors}) reached, ignoring additional errors`);
      return;
    }

    this.errors.push(error);
    logger.error(`Collected error: ${error.message}`, error);
  }

  /**
   * Get all collected errors
   */
  getErrors(): OpenAPI31Error[] {
    return [...this.errors];
  }

  /**
   * Check if any errors were collected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Clear all collected errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get formatted error summary
   */
  getSummary(): string {
    if (this.errors.length === 0) {
      return 'No errors collected';
    }

    let summary = `Collected ${this.errors.length} error(s):\n\n`;
    
    this.errors.forEach((error, index) => {
      summary += `${index + 1}. ${error.getFormattedMessage()}\n\n`;
    });

    return summary;
  }
}

/**
 * Enhanced error handler for OpenAPI 3.1 processing
 */
export class OpenAPI31ErrorHandler {
  private config: ErrorHandlingConfig;
  private collector: ErrorCollector;
  private logger: OpenAPI31Logger;

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_CONFIG, ...config };
    this.collector = new ErrorCollector(this.config);
    this.logger = createLogger('ErrorHandler');
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  handleError(
    error: OpenAPI31Error,
    context?: ErrorContext
  ): { shouldContinue: boolean; fallbackValue?: any } {
    // Add context if provided
    const contextualError = context ? new ContextualError(error, context) : error;
    
    this.logger.error(`Handling error: ${contextualError.message}`, contextualError);

    // Determine recovery strategy
    const strategy = this.getRecoveryStrategy(error.feature);
    
    // Log the strategy being used
    this.logger.info(`Using recovery strategy '${strategy}' for feature '${error.feature}'`);

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
  }

  /**
   * Get recovery strategy for a feature
   */
  private getRecoveryStrategy(feature: string): RecoveryStrategy {
    return this.config.featureStrategies[feature] || this.config.defaultStrategy;
  }

  /**
   * Handle skip strategy
   */
  private handleSkip(error: OpenAPI31Error): { shouldContinue: boolean; fallbackValue?: any } {
    this.logger.warn(`Skipping feature '${error.feature}' due to error: ${error.message}`);
    
    if (this.config.collectAllErrors) {
      this.collector.addError(error);
    }

    return { shouldContinue: true, fallbackValue: undefined };
  }

  /**
   * Handle fallback strategy
   */
  private handleFallback(error: OpenAPI31Error): { shouldContinue: boolean; fallbackValue?: any } {
    this.logger.warn(`Using fallback for feature '${error.feature}' due to error: ${error.message}`);
    
    const fallbackValue = this.getFallbackValue(error.feature);
    
    if (this.config.collectAllErrors) {
      this.collector.addError(error);
    }

    return { shouldContinue: true, fallbackValue };
  }

  /**
   * Handle downgrade strategy
   */
  private handleDowngrade(error: OpenAPI31Error): { shouldContinue: boolean; fallbackValue?: any } {
    this.logger.warn(`Downgrading feature '${error.feature}' to OpenAPI 3.0 equivalent due to error: ${error.message}`);
    
    const downgradedValue = this.getDowngradedValue(error.feature);
    
    if (this.config.collectAllErrors) {
      this.collector.addError(error);
    }

    return { shouldContinue: true, fallbackValue: downgradedValue };
  }

  /**
   * Handle fail strategy
   */
  private handleFail(error: OpenAPI31Error): { shouldContinue: boolean; fallbackValue?: any } {
    this.logger.error(`Failing due to error with feature '${error.feature}': ${error.message}`);
    
    if (this.config.collectAllErrors) {
      this.collector.addError(error);
    }

    throw error;
  }

  /**
   * Get fallback value for a feature
   */
  private getFallbackValue(feature: string): any {
    const fallbacks: Record<string, any> = {
      'unevaluatedProperties': { additionalProperties: true },
      'prefixItems': { type: 'array', items: {} },
      'contains': { type: 'array' },
      'const': {},
      'conditional-schema': {}
    };

    return fallbacks[feature];
  }

  /**
   * Get downgraded value for a feature (OpenAPI 3.0 equivalent)
   */
  private getDowngradedValue(feature: string): any {
    const downgrades: Record<string, any> = {
      'type-array': { nullable: true },
      'advanced-discriminator': { discriminator: { propertyName: 'type' } },
      'webhooks': undefined // Remove webhooks entirely
    };

    return downgrades[feature];
  }

  /**
   * Get error collector
   */
  getErrorCollector(): ErrorCollector {
    return this.collector;
  }

  /**
   * Create enhanced error with suggestions
   */
  createEnhancedError(
    originalError: Error,
    feature: string,
    location: string,
    context?: ErrorContext
  ): OpenAPI31Error {
    let enhancedError: OpenAPI31Error;

    // Determine error type and create appropriate error
    if (originalError instanceof OpenAPI31Error) {
      enhancedError = originalError;
    } else {
      enhancedError = new SchemaTransformationError(
        feature,
        location,
        'unknown',
        originalError,
        this.getSuggestionForFeature(feature)
      );
    }

    // Add context if provided
    if (context) {
      return new ContextualError(enhancedError, context);
    }

    return enhancedError;
  }

  /**
   * Get suggestion for a specific feature
   */
  private getSuggestionForFeature(feature: string): string | undefined {
    const suggestions: Record<string, string> = {
      'type-array': 'Consider using nullable: true instead of type arrays for better compatibility',
      'prefixItems': 'Use regular array items schema for broader compatibility',
      'unevaluatedProperties': 'Use additionalProperties instead for OpenAPI 3.0 compatibility',
      'conditional-schema': 'Consider using oneOf or anyOf instead of if/then/else',
      'discriminator': 'Ensure discriminator has a valid propertyName and all referenced schemas exist',
      'webhooks': 'Webhooks are only supported in OpenAPI 3.1, consider using callbacks for 3.0',
      'const': 'Use enum with single value for OpenAPI 3.0 compatibility'
    };

    return suggestions[feature];
  }
}

/**
 * Utility function to wrap potentially error-prone operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T> | T,
  feature: string,
  location: string,
  errorHandler: OpenAPI31ErrorHandler,
  context?: ErrorContext
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const enhancedError = errorHandler.createEnhancedError(
      error instanceof Error ? error : new Error(String(error)),
      feature,
      location,
      context
    );

    const result = errorHandler.handleError(enhancedError, context);
    
    if (result.shouldContinue) {
      return result.fallbackValue;
    }

    throw enhancedError;
  }
}

/**
 * Create error context from schema information
 */
export function createErrorContext(
  schemaPath: string,
  version: OpenAPIVersionInfo,
  processingStep?: string,
  additionalContext?: Record<string, any>
): ErrorContext {
  return {
    schemaPath,
    version,
    processingStep,
    context: additionalContext
  };
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new OpenAPI31ErrorHandler();