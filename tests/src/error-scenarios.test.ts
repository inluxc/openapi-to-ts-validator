/**
 * Tests for specific OpenAPI 3.1 error scenarios and edge cases
 */

import {
  UnsupportedFeatureError,
  InvalidFeatureUsageError,
  SchemaTransformationError,
  DiscriminatorError,
  WebhookProcessingError,
  ConditionalSchemaError,
  OpenAPI31ErrorHandler,
  RecoveryStrategy,
  createErrorContext,
  loggers,
  configureDebugLogging,
  LogLevel
} from '../../src/errors';
import { detectOpenAPIVersion } from '../../src/version-detection';

describe('Error Scenarios', () => {
  let logOutput: string[] = [];

  beforeEach(() => {
    logOutput = [];
    configureDebugLogging({
      enabled: true,
      level: LogLevel.DEBUG,
      logFunction: (level, message) => {
        logOutput.push(message);
      }
    });
  });

  describe('Type Array Processing Errors', () => {
    it('should handle empty type array', () => {
      const error = new InvalidFeatureUsageError(
        'type-array',
        '#/schema/type',
        'Type array cannot be empty',
        'Provide at least one type in the array, e.g., ["string"] or ["string", "null"]'
      );

      expect(error.message).toContain('Type array cannot be empty');
      expect(error.suggestion).toContain('at least one type');
    });

    it('should handle invalid type in array', () => {
      const error = new SchemaTransformationError(
        'type-array',
        '#/schema/type',
        'null-conversion',
        new Error('Invalid type "invalid-type"'),
        'Use valid JSON Schema types: string, number, integer, boolean, array, object, null'
      );

      expect(error.message).toContain('Failed to transform');
      expect(error.suggestion).toContain('valid JSON Schema types');
    });
  });

  describe('PrefixItems Processing Errors', () => {
    it('should handle prefixItems without array type', () => {
      const error = new InvalidFeatureUsageError(
        'prefixItems',
        '#/schema/prefixItems',
        'prefixItems can only be used with array type',
        'Ensure the schema has type: "array" when using prefixItems'
      );

      expect(error.message).toContain('can only be used with array type');
      expect(error.suggestion).toContain('type: "array"');
    });

    it('should handle invalid prefixItems schema', () => {
      const error = new SchemaTransformationError(
        'prefixItems',
        '#/schema/prefixItems/0',
        'tuple-generation',
        new Error('Invalid schema in prefixItems'),
        'Ensure each item in prefixItems is a valid JSON Schema'
      );

      expect(error.message).toContain('tuple-generation');
      expect(error.suggestion).toContain('valid JSON Schema');
    });
  });

  describe('Discriminator Processing Errors', () => {
    it('should handle missing propertyName', () => {
      const error = new DiscriminatorError(
        '#/schema/discriminator',
        'propertyName is required',
        'Add propertyName field to discriminator object'
      );

      expect(error.message).toContain('propertyName is required');
      expect(error.feature).toBe('discriminator');
    });

    it('should handle invalid mapping', () => {
      const error = new DiscriminatorError(
        '#/schema/discriminator/mapping',
        'mapping values must be strings',
        'Ensure all mapping values are strings pointing to schema references'
      );

      expect(error.message).toContain('mapping values must be strings');
    });

    it('should handle missing referenced schema', () => {
      const error = new DiscriminatorError(
        '#/schema/discriminator',
        'referenced schema "Pet" not found',
        'Ensure all discriminator mapping values reference existing schemas in components/schemas'
      );

      expect(error.message).toContain('referenced schema "Pet" not found');
    });
  });

  describe('Webhook Processing Errors', () => {
    it('should handle invalid webhook structure', () => {
      const error = new WebhookProcessingError(
        'userCreated',
        '#/webhooks/userCreated',
        'webhook must be an object with HTTP method keys',
        'Structure webhooks as: { "post": { "requestBody": {...}, "responses": {...} } }'
      );

      expect(error.message).toContain('webhook must be an object');
      expect(error.suggestion).toContain('HTTP method keys');
    });

    it('should handle missing webhook schema', () => {
      const error = new WebhookProcessingError(
        'orderUpdated',
        '#/webhooks/orderUpdated/post/requestBody',
        'requestBody schema reference not found',
        'Ensure webhook requestBody references a valid schema in components/schemas'
      );

      expect(error.message).toContain('requestBody schema reference not found');
    });
  });

  describe('Conditional Schema Processing Errors', () => {
    it('should handle invalid if condition', () => {
      const error = new ConditionalSchemaError(
        '#/schema/if',
        'if condition must be a valid JSON Schema',
        'Ensure the if condition is a proper schema object that can be evaluated'
      );

      expect(error.message).toContain('if condition must be a valid JSON Schema');
    });

    it('should handle missing then/else', () => {
      const error = new ConditionalSchemaError(
        '#/schema',
        'if condition requires at least then or else clause',
        'Add either "then" or "else" (or both) when using "if" condition'
      );

      expect(error.message).toContain('requires at least then or else');
    });

    it('should handle complex nested conditionals', () => {
      const error = new UnsupportedFeatureError(
        'nested-conditionals',
        '#/schema/if/then/if',
        'Deeply nested conditional schemas are not supported. Consider flattening the logic or using oneOf/anyOf instead'
      );

      expect(error.message).toContain('not yet supported');
      expect(error.suggestion).toContain('flattening the logic');
    });
  });

  describe('UnevaluatedProperties Errors', () => {
    it('should handle complex unevaluatedProperties', () => {
      const error = new UnsupportedFeatureError(
        'unevaluatedProperties',
        '#/schema/unevaluatedProperties',
        'Complex unevaluatedProperties with schema objects are not fully supported. Use additionalProperties instead'
      );

      expect(error.message).toContain('not yet supported');
      expect(error.suggestion).toContain('additionalProperties instead');
    });
  });

  describe('Contains Keyword Errors', () => {
    it('should handle invalid contains schema', () => {
      const error = new SchemaTransformationError(
        'contains',
        '#/schema/contains',
        'validation-generation',
        new Error('Invalid contains schema'),
        'Ensure contains value is a valid JSON Schema object'
      );

      expect(error.message).toContain('validation-generation');
    });

    it('should handle contains without array type', () => {
      const error = new InvalidFeatureUsageError(
        'contains',
        '#/schema/contains',
        'contains can only be used with array type',
        'Ensure the schema has type: "array" when using contains keyword'
      );

      expect(error.message).toContain('can only be used with array type');
    });
  });

  describe('Version Compatibility Errors', () => {
    it('should handle OpenAPI 3.0 with 3.1 features', () => {
      const handler = new OpenAPI31ErrorHandler({
        defaultStrategy: RecoveryStrategy.DOWNGRADE
      });

      const version30 = detectOpenAPIVersion({ openapi: '3.0.3' });
      const context = createErrorContext('#/schema', version30, 'parsing');

      // Simulate using 3.1 feature in 3.0 spec
      const error = new UnsupportedFeatureError(
        'prefixItems',
        '#/schema/prefixItems',
        'prefixItems is only available in OpenAPI 3.1. Use regular items schema for 3.0 compatibility'
      );

      const result = handler.handleError(error, context);
      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackValue).toBeDefined();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle multiple errors with different strategies', () => {
      const handler = new OpenAPI31ErrorHandler({
        collectAllErrors: true,
        featureStrategies: {
          'webhooks': RecoveryStrategy.SKIP,
          'prefixItems': RecoveryStrategy.FALLBACK,
          'unevaluatedProperties': RecoveryStrategy.DOWNGRADE,
          'discriminator': RecoveryStrategy.FAIL
        }
      });

      // Skip webhooks
      const webhookError = new WebhookProcessingError('test', '#/webhooks', 'unsupported');
      const webhookResult = handler.handleError(webhookError);
      expect(webhookResult.shouldContinue).toBe(true);

      // Fallback for prefixItems
      const prefixError = new UnsupportedFeatureError('prefixItems', '#/schema');
      const prefixResult = handler.handleError(prefixError);
      expect(prefixResult.shouldContinue).toBe(true);
      expect(prefixResult.fallbackValue).toEqual({ type: 'array', items: {} });

      // Downgrade unevaluatedProperties
      const unevalError = new UnsupportedFeatureError('unevaluatedProperties', '#/schema');
      const unevalResult = handler.handleError(unevalError);
      expect(unevalResult.shouldContinue).toBe(true);

      // Fail on discriminator
      const discError = new DiscriminatorError('#/schema', 'critical error');
      expect(() => handler.handleError(discError)).toThrow();

      // Check collected errors (should have 3: webhook, prefix, uneval)
      const collector = handler.getErrorCollector();
      expect(collector.getErrorCount()).toBe(3);
    });
  });

  describe('Debug Logging Integration', () => {
    it('should log error handling steps', () => {
      const handler = new OpenAPI31ErrorHandler({
        defaultStrategy: RecoveryStrategy.FALLBACK
      });

      const error = new UnsupportedFeatureError('test-feature', '#/test');
      handler.handleError(error);

      // Check that debug messages were logged
      const errorMessages = logOutput.filter(msg => msg.includes('[ERROR]'));
      const infoMessages = logOutput.filter(msg => msg.includes('[INFO]'));

      expect(errorMessages.length).toBeGreaterThan(0);
      expect(infoMessages.length).toBeGreaterThan(0);
      expect(infoMessages.some(msg => msg.includes('recovery strategy'))).toBe(true);
    });

    it('should log transformation errors with context', () => {
      loggers.transformer.error('Transformation failed', new Error('Test error'));

      const errorMessages = logOutput.filter(msg => msg.includes('[ERROR]'));
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0]).toContain('[Transformer]');
      expect(errorMessages[0]).toContain('Transformation failed');
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful suggestions for common mistakes', () => {
      const typeArrayError = new InvalidFeatureUsageError(
        'type-array',
        '#/schema/type',
        'Type array cannot be empty',
        'Provide at least one type in the array, e.g., ["string"] or ["string", "null"]'
      );

      expect(typeArrayError.suggestion).toContain('e.g.,');
      expect(typeArrayError.suggestion).toContain('["string", "null"]');
    });

    it('should provide context-aware error messages', () => {
      const version = detectOpenAPIVersion({ openapi: '3.1.0' });
      const context = createErrorContext(
        '#/components/schemas/User/properties/name',
        version,
        'type-generation'
      );

      const error = new SchemaTransformationError(
        'type-array',
        '#/schema/type',
        'type-generation',
        new Error('Cannot process type array')
      );

      const contextualError = new (require('../../src/errors').ContextualError)(error, context);
      const detailed = contextualError.getDetailedMessage();

      expect(detailed).toContain('Schema Path: #/components/schemas/User/properties/name');
      expect(detailed).toContain('Processing Step: type-generation');
    });
  });
});