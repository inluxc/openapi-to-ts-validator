/**
 * Tests for OpenAPI 3.1 error handling and messaging
 */

import {
  OpenAPI31Error,
  UnsupportedFeatureError,
  InvalidFeatureUsageError,
  SchemaTransformationError,
  VersionCompatibilityError,
  WebhookProcessingError,
  DiscriminatorError,
  ConditionalSchemaError,
  ContextualError,
  ErrorContext,
  createFeatureError,
  LogLevel,
  configureDebugLogging,
  createLogger,
  isDebugEnabled,
  RecoveryStrategy,
  ErrorCollector,
  OpenAPI31ErrorHandler,
  withErrorHandling,
  createErrorContext
} from '../../src/errors';
import { detectOpenAPIVersion } from '../../src/version-detection';

describe('OpenAPI 3.1 Error Classes', () => {
  describe('OpenAPI31Error', () => {
    it('should create base error with all properties', () => {
      const error = new UnsupportedFeatureError(
        'test-feature',
        '#/test/location',
        'This is a test suggestion'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OpenAPI31Error);
      expect(error.feature).toBe('test-feature');
      expect(error.location).toBe('#/test/location');
      expect(error.suggestion).toBe('This is a test suggestion');
      expect(error.name).toBe('UnsupportedFeatureError');
    });

    it('should format error message correctly', () => {
      const error = new UnsupportedFeatureError(
        'webhooks',
        '#/webhooks',
        'Use callbacks instead for OpenAPI 3.0'
      );

      const formatted = error.getFormattedMessage();
      expect(formatted).toContain('(at #/webhooks)');
      expect(formatted).toContain('Suggestion: Use callbacks instead for OpenAPI 3.0');
    });

    it('should format error message without suggestion', () => {
      const error = new UnsupportedFeatureError('test-feature', '#/test');
      const formatted = error.getFormattedMessage();
      expect(formatted).toContain('(at #/test)');
      expect(formatted).not.toContain('Suggestion:');
    });
  });

  describe('UnsupportedFeatureError', () => {
    it('should create unsupported feature error', () => {
      const error = new UnsupportedFeatureError('prefixItems', '#/schema/prefixItems');
      expect(error.message).toContain("OpenAPI 3.1 feature 'prefixItems' is not yet supported");
      expect(error.feature).toBe('prefixItems');
      expect(error.location).toBe('#/schema/prefixItems');
    });
  });

  describe('InvalidFeatureUsageError', () => {
    it('should create invalid usage error', () => {
      const error = new InvalidFeatureUsageError(
        'discriminator',
        '#/schema/discriminator',
        'missing propertyName',
        'Add propertyName field'
      );
      
      expect(error.message).toContain("Invalid usage of OpenAPI 3.1 feature 'discriminator': missing propertyName");
      expect(error.feature).toBe('discriminator');
      expect(error.suggestion).toBe('Add propertyName field');
    });
  });

  describe('SchemaTransformationError', () => {
    it('should create transformation error', () => {
      const originalError = new Error('Original error');
      const error = new SchemaTransformationError(
        'type-array',
        '#/schema/type',
        'null-conversion',
        originalError,
        'Use nullable instead'
      );

      expect(error.message).toContain("Failed to transform OpenAPI 3.1 feature 'type-array' during null-conversion");
      expect(error.feature).toBe('type-array');
      expect(error.suggestion).toBe('Use nullable instead');
      expect(error.stack).toContain('Caused by:');
    });
  });

  describe('VersionCompatibilityError', () => {
    it('should create version compatibility error', () => {
      const version = detectOpenAPIVersion({ openapi: '3.0.0' });
      const error = new VersionCompatibilityError(
        version,
        'webhooks',
        '#/webhooks',
        'Upgrade to OpenAPI 3.1'
      );

      expect(error.message).toContain("Feature 'webhooks' requires OpenAPI 3.1 but detected version 3.0.0");
      expect(error.detectedVersion).toBe(version);
    });
  });

  describe('WebhookProcessingError', () => {
    it('should create webhook processing error', () => {
      const error = new WebhookProcessingError(
        'userCreated',
        '#/webhooks/userCreated',
        'invalid schema reference',
        'Check schema reference path'
      );

      expect(error.message).toContain("Failed to process webhook 'userCreated': invalid schema reference");
      expect(error.feature).toBe('webhooks');
    });
  });

  describe('DiscriminatorError', () => {
    it('should create discriminator error', () => {
      const error = new DiscriminatorError(
        '#/schema/discriminator',
        'missing propertyName',
        'Add propertyName field'
      );

      expect(error.message).toContain('Discriminator processing failed: missing propertyName');
      expect(error.feature).toBe('discriminator');
    });
  });

  describe('ConditionalSchemaError', () => {
    it('should create conditional schema error', () => {
      const error = new ConditionalSchemaError(
        '#/schema/if',
        'invalid if condition',
        'Simplify conditional logic'
      );

      expect(error.message).toContain('Conditional schema processing failed: invalid if condition');
      expect(error.feature).toBe('conditional-schema');
    });
  });

  describe('ContextualError', () => {
    it('should create contextual error with additional information', () => {
      const originalError = new UnsupportedFeatureError('test', '#/test');
      const context: ErrorContext = {
        schemaPath: '#/components/schemas/User',
        version: detectOpenAPIVersion({ openapi: '3.1.0' }),
        processingStep: 'transformation',
        context: { additionalInfo: 'test data' }
      };

      const contextualError = new ContextualError(originalError, context);
      const detailed = contextualError.getDetailedMessage();

      expect(detailed).toContain('Schema Path: #/components/schemas/User');
      expect(detailed).toContain('OpenAPI Version: 3.1.0');
      expect(detailed).toContain('Processing Step: transformation');
      expect(detailed).toContain('Additional Context:');
      expect(detailed).toContain('additionalInfo');
    });
  });

  describe('createFeatureError', () => {
    it('should create unsupported feature error', () => {
      const error = createFeatureError('unsupported', 'test-feature', '#/test');
      expect(error).toBeInstanceOf(UnsupportedFeatureError);
      expect(error.feature).toBe('test-feature');
    });

    it('should create invalid usage error', () => {
      const error = createFeatureError('invalid', 'test-feature', '#/test', {
        reason: 'test reason'
      });
      expect(error).toBeInstanceOf(InvalidFeatureUsageError);
      expect(error.message).toContain('test reason');
    });

    it('should create transformation error', () => {
      const originalError = new Error('original');
      const error = createFeatureError('transformation', 'test-feature', '#/test', {
        transformationStep: 'test-step',
        originalError
      });
      expect(error).toBeInstanceOf(SchemaTransformationError);
    });
  });
});

describe('Debug Logging', () => {
  beforeEach(() => {
    // Reset debug configuration
    configureDebugLogging({
      enabled: false,
      level: LogLevel.INFO,
      includeTimestamp: true,
      includeStackTrace: false
    });
  });

  describe('configureDebugLogging', () => {
    it('should configure debug logging', () => {
      configureDebugLogging({
        enabled: true,
        level: LogLevel.DEBUG,
        includeStackTrace: true
      });

      expect(isDebugEnabled(LogLevel.DEBUG)).toBe(true);
      expect(isDebugEnabled(LogLevel.TRACE)).toBe(false);
    });
  });

  describe('isDebugEnabled', () => {
    it('should return false when debugging is disabled', () => {
      expect(isDebugEnabled()).toBe(false);
    });

    it('should return true for enabled levels', () => {
      configureDebugLogging({ enabled: true, level: LogLevel.DEBUG });
      expect(isDebugEnabled(LogLevel.ERROR)).toBe(true);
      expect(isDebugEnabled(LogLevel.DEBUG)).toBe(true);
      expect(isDebugEnabled(LogLevel.TRACE)).toBe(false);
    });
  });

  describe('OpenAPI31Logger', () => {
    let logOutput: string[] = [];
    
    beforeEach(() => {
      logOutput = [];
      configureDebugLogging({
        enabled: true,
        level: LogLevel.TRACE,
        logFunction: (level, message) => {
          logOutput.push(message);
        }
      });
    });

    it('should log messages with context', () => {
      const logger = createLogger('TestContext');
      logger.info('Test message');
      
      expect(logOutput).toHaveLength(1);
      expect(logOutput[0]).toContain('[INFO]');
      expect(logOutput[0]).toContain('[TestContext]');
      expect(logOutput[0]).toContain('Test message');
    });

    it('should log processing steps', () => {
      const logger = createLogger('Parser');
      logger.step('parse-schema', { feature: 'webhooks' });
      
      expect(logOutput).toHaveLength(1);
      expect(logOutput[0]).toContain('Processing step: parse-schema');
      expect(logOutput[0]).toContain('webhooks');
    });

    it('should log feature detection', () => {
      const logger = createLogger('Parser');
      logger.featureDetected('prefixItems', '#/schema', true);
      
      expect(logOutput).toHaveLength(1);
      expect(logOutput[0]).toContain("Feature 'prefixItems' detected");
      expect(logOutput[0]).toContain('SUPPORTED');
    });

    it('should log transformations', () => {
      const logger = createLogger('Transformer');
      const before = { type: ['string', 'null'] };
      const after = { type: 'string', nullable: true };
      
      logger.transformation('type-array', '#/schema/type', before, after);
      
      expect(logOutput.length).toBeGreaterThan(0);
      expect(logOutput.some(msg => msg.includes('Transforming'))).toBe(true);
    });

    it('should create child loggers', () => {
      const parentLogger = createLogger('Parent');
      const childLogger = parentLogger.child('Child');
      
      childLogger.info('Child message');
      
      expect(logOutput).toHaveLength(1);
      expect(logOutput[0]).toContain('[Parent:Child]');
    });
  });
});

describe('Error Handling', () => {
  describe('ErrorCollector', () => {
    it('should collect errors', () => {
      const collector = new ErrorCollector();
      const error1 = new UnsupportedFeatureError('feature1', '#/test1');
      const error2 = new UnsupportedFeatureError('feature2', '#/test2');

      collector.addError(error1);
      collector.addError(error2);

      expect(collector.hasErrors()).toBe(true);
      expect(collector.getErrorCount()).toBe(2);
      expect(collector.getErrors()).toHaveLength(2);
    });

    it('should respect maximum error count', () => {
      const collector = new ErrorCollector({ maxErrors: 2 });
      
      for (let i = 0; i < 5; i++) {
        collector.addError(new UnsupportedFeatureError(`feature${i}`, `#/test${i}`));
      }

      expect(collector.getErrorCount()).toBe(2);
    });

    it('should generate error summary', () => {
      const collector = new ErrorCollector();
      collector.addError(new UnsupportedFeatureError('test', '#/test', 'test suggestion'));

      const summary = collector.getSummary();
      expect(summary).toContain('Collected 1 error(s)');
      expect(summary).toContain('test suggestion');
    });

    it('should clear errors', () => {
      const collector = new ErrorCollector();
      collector.addError(new UnsupportedFeatureError('test', '#/test'));
      
      expect(collector.hasErrors()).toBe(true);
      collector.clear();
      expect(collector.hasErrors()).toBe(false);
    });
  });

  describe('OpenAPI31ErrorHandler', () => {
    it('should handle errors with skip strategy', () => {
      const handler = new OpenAPI31ErrorHandler({
        defaultStrategy: RecoveryStrategy.SKIP,
        collectAllErrors: true
      });

      const error = new UnsupportedFeatureError('test-feature', '#/test');
      const result = handler.handleError(error);

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackValue).toBeUndefined();
      expect(handler.getErrorCollector().hasErrors()).toBe(true);
    });

    it('should handle errors with fallback strategy', () => {
      const handler = new OpenAPI31ErrorHandler({
        featureStrategies: {
          'unevaluatedProperties': RecoveryStrategy.FALLBACK
        }
      });

      const error = new UnsupportedFeatureError('unevaluatedProperties', '#/test');
      const result = handler.handleError(error);

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackValue).toEqual({ additionalProperties: true });
    });

    it('should handle errors with downgrade strategy', () => {
      const handler = new OpenAPI31ErrorHandler({
        featureStrategies: {
          'type-array': RecoveryStrategy.DOWNGRADE
        }
      });

      const error = new UnsupportedFeatureError('type-array', '#/test');
      const result = handler.handleError(error);

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackValue).toEqual({ nullable: true });
    });

    it('should handle errors with fail strategy', () => {
      const handler = new OpenAPI31ErrorHandler({
        defaultStrategy: RecoveryStrategy.FAIL
      });

      const error = new UnsupportedFeatureError('test-feature', '#/test');
      
      expect(() => handler.handleError(error)).toThrow(UnsupportedFeatureError);
    });

    it('should create enhanced errors', () => {
      const handler = new OpenAPI31ErrorHandler();
      const originalError = new Error('Original error');
      const context = createErrorContext(
        '#/test',
        detectOpenAPIVersion({ openapi: '3.1.0' }),
        'transformation'
      );

      const enhanced = handler.createEnhancedError(
        originalError,
        'test-feature',
        '#/test',
        context
      );

      expect(enhanced).toBeInstanceOf(ContextualError);
      expect(enhanced.feature).toBe('test-feature');
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful operations', async () => {
      const handler = new OpenAPI31ErrorHandler();
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withErrorHandling(
        operation,
        'test-feature',
        '#/test',
        handler
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should handle failed operations with recovery', async () => {
      const handler = new OpenAPI31ErrorHandler({
        defaultStrategy: RecoveryStrategy.FALLBACK
      });
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      const result = await withErrorHandling(
        operation,
        'prefixItems',
        '#/test',
        handler
      );

      expect(result).toEqual({ type: 'array', items: {} });
    });

    it('should handle failed operations with failure', async () => {
      const handler = new OpenAPI31ErrorHandler({
        defaultStrategy: RecoveryStrategy.FAIL
      });
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        withErrorHandling(operation, 'test-feature', '#/test', handler)
      ).rejects.toThrow();
    });
  });

  describe('createErrorContext', () => {
    it('should create error context', () => {
      const version = detectOpenAPIVersion({ openapi: '3.1.0' });
      const context = createErrorContext(
        '#/components/schemas/User',
        version,
        'transformation',
        { additionalData: 'test' }
      );

      expect(context.schemaPath).toBe('#/components/schemas/User');
      expect(context.version).toBe(version);
      expect(context.processingStep).toBe('transformation');
      expect(context.context).toEqual({ additionalData: 'test' });
    });
  });
});

describe('Error Integration', () => {
  it('should handle complex error scenarios', () => {
    const handler = new OpenAPI31ErrorHandler({
      collectAllErrors: true,
      featureStrategies: {
        'webhooks': RecoveryStrategy.SKIP,
        'prefixItems': RecoveryStrategy.FALLBACK,
        'discriminator': RecoveryStrategy.FAIL
      }
    });

    // Test webhook error (skip)
    const webhookError = new WebhookProcessingError('test', '#/webhooks', 'invalid');
    const webhookResult = handler.handleError(webhookError);
    expect(webhookResult.shouldContinue).toBe(true);

    // Test prefixItems error (fallback)
    const prefixError = new UnsupportedFeatureError('prefixItems', '#/schema');
    const prefixResult = handler.handleError(prefixError);
    expect(prefixResult.shouldContinue).toBe(true);
    expect(prefixResult.fallbackValue).toBeDefined();

    // Test discriminator error (fail)
    const discriminatorError = new DiscriminatorError('#/schema', 'invalid');
    expect(() => handler.handleError(discriminatorError)).toThrow();

    // Check collected errors
    const collector = handler.getErrorCollector();
    expect(collector.getErrorCount()).toBe(2); // webhook and prefixItems
  });
});