import { describe, test, expect } from '@jest/globals';
import * as builder from '../../src/builder';

describe('OpenAPI 3.1 Builder Helper Functions', () => {
  describe('const() helper function', () => {
    test('should create const schema with string value', () => {
      const schema = builder.const('test-value');
      
      expect(schema).toEqual({
        const: 'test-value',
        type: 'string',
        enum: ['test-value']
      });
    });

    test('should create const schema with number value', () => {
      const schema = builder.const(42);
      
      expect(schema).toEqual({
        const: 42,
        type: 'integer',
        enum: [42]
      });
    });

    test('should create const schema with boolean value', () => {
      const schema = builder.const(true);
      
      expect(schema).toEqual({
        const: true,
        type: 'boolean',
        enum: [true]
      });
    });

    test('should accept additional options', () => {
      const schema = builder.const('test', {
        title: 'Test Constant',
        description: 'A test constant value'
      });
      
      expect(schema).toEqual({
        const: 'test',
        type: 'string',
        enum: ['test'],
        title: 'Test Constant',
        description: 'A test constant value'
      });
    });
  });

  describe('constSchema() helper function', () => {
    test('should create const schema with string value', () => {
      const schema = builder.constSchema('test-value');
      
      expect(schema).toEqual({
        const: 'test-value',
        type: 'string',
        enum: ['test-value']
      });
    });

    test('should create const schema with number value', () => {
      const schema = builder.constSchema(42);
      
      expect(schema).toEqual({
        const: 42,
        type: 'integer',
        enum: [42]
      });
    });

    test('should create const schema with float value', () => {
      const schema = builder.constSchema(3.14);
      
      expect(schema).toEqual({
        const: 3.14,
        type: 'number',
        enum: [3.14]
      });
    });

    test('should create const schema with boolean value', () => {
      const schema = builder.constSchema(true);
      
      expect(schema).toEqual({
        const: true,
        type: 'boolean',
        enum: [true]
      });
    });

    test('should create const schema with null value', () => {
      const schema = builder.constSchema(null);
      
      expect(schema).toEqual({
        const: null,
        type: 'null',
        enum: [null]
      });
    });

    test('should create const schema with array value', () => {
      const schema = builder.constSchema([1, 2, 3]);
      
      expect(schema).toEqual({
        const: [1, 2, 3],
        type: 'array',
        enum: [[1, 2, 3]]
      });
    });

    test('should create const schema with object value', () => {
      const schema = builder.constSchema({ key: 'value' });
      
      expect(schema).toEqual({
        const: { key: 'value' },
        type: 'object',
        enum: [{ key: 'value' }]
      });
    });

    test('should accept additional options', () => {
      const schema = builder.constSchema('test', {
        title: 'Test Constant',
        description: 'A test constant value'
      });
      
      expect(schema).toEqual({
        const: 'test',
        type: 'string',
        enum: ['test'],
        title: 'Test Constant',
        description: 'A test constant value'
      });
    });

    test('should throw error for non-JSON-serializable values', () => {
      const circularObj: any = {};
      circularObj.self = circularObj;
      
      expect(() => builder.constSchema(circularObj)).toThrow('const value must be JSON-serializable');
    });

    test('should throw error for unsupported value types', () => {
      expect(() => builder.constSchema(Symbol('test'))).toThrow('Unsupported const value type');
    });
  });

  describe('tuple() helper function', () => {
    test('should create basic tuple schema', () => {
      const schema = builder.tuple([
        builder.string(),
        builder.number(),
        builder.boolean()
      ]);
      
      expect(schema).toEqual({
        type: 'array',
        prefixItems: [
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' }
        ],
        items: false
      });
    });

    test('should create tuple with string references', () => {
      const schema = builder.tuple(['User', 'Product']);
      
      expect(schema).toEqual({
        type: 'array',
        prefixItems: [
          { $ref: '#/definitions/User' },
          { $ref: '#/definitions/Product' }
        ],
        items: false
      });
    });

    test('should create tuple with additional items allowed', () => {
      const schema = builder.tuple([builder.string()], {
        additionalItems: true
      });
      
      expect(schema).toEqual({
        type: 'array',
        prefixItems: [{ type: 'string' }],
        items: true
      });
    });

    test('should create tuple with additional items schema', () => {
      const schema = builder.tuple([builder.string()], {
        additionalItems: builder.number()
      });
      
      expect(schema).toEqual({
        type: 'array',
        prefixItems: [{ type: 'string' }],
        items: { type: 'number' }
      });
    });

    test('should create tuple with array options', () => {
      const schema = builder.tuple([builder.string()], {
        title: 'Test Tuple',
        description: 'A test tuple',
        minItems: 1,
        maxItems: 3
      });
      
      expect(schema).toEqual({
        type: 'array',
        prefixItems: [{ type: 'string' }],
        items: false,
        title: 'Test Tuple',
        description: 'A test tuple',
        minItems: 1,
        maxItems: 3
      });
    });

    test('should create empty tuple', () => {
      const schema = builder.tuple([]);
      
      expect(schema).toEqual({
        type: 'array',
        prefixItems: [],
        items: false
      });
    });
  });

  describe('conditional() helper function', () => {
    test('should create basic if/then conditional schema', () => {
      const schema = builder.conditional(
        { properties: { type: { const: 'premium' } } },
        { properties: { features: { type: 'array' } } }
      );
      
      expect(schema).toEqual({
        if: { properties: { type: { const: 'premium' } } },
        then: { properties: { features: { type: 'array' } } }
      });
    });

    test('should create if/then/else conditional schema', () => {
      const schema = builder.conditional(
        { properties: { type: { const: 'premium' } } },
        { properties: { features: { type: 'array' } } },
        { properties: { features: { type: 'null' } } }
      );
      
      expect(schema).toEqual({
        if: { properties: { type: { const: 'premium' } } },
        then: { properties: { features: { type: 'array' } } },
        else: { properties: { features: { type: 'null' } } }
      });
    });

    test('should create conditional with string references', () => {
      const schema = builder.conditional('PremiumCondition', 'PremiumSchema', 'BasicSchema');
      
      expect(schema).toEqual({
        if: { $ref: '#/definitions/PremiumCondition' },
        then: { $ref: '#/definitions/PremiumSchema' },
        else: { $ref: '#/definitions/BasicSchema' }
      });
    });

    test('should create conditional with additional options', () => {
      const schema = builder.conditional(
        { properties: { type: { const: 'premium' } } },
        { properties: { features: { type: 'array' } } },
        undefined,
        {
          title: 'Conditional Schema',
          description: 'A conditional validation schema'
        }
      );
      
      expect(schema).toEqual({
        if: { properties: { type: { const: 'premium' } } },
        then: { properties: { features: { type: 'array' } } },
        title: 'Conditional Schema',
        description: 'A conditional validation schema'
      });
    });

    test('should create nested conditional schemas', () => {
      const nestedCondition = builder.conditional(
        { properties: { level: { const: 'advanced' } } },
        { properties: { advancedFeatures: { type: 'array' } } }
      );
      
      const schema = builder.conditional(
        { properties: { type: { const: 'premium' } } },
        nestedCondition
      );
      
      expect(schema).toEqual({
        if: { properties: { type: { const: 'premium' } } },
        then: {
          if: { properties: { level: { const: 'advanced' } } },
          then: { properties: { advancedFeatures: { type: 'array' } } }
        }
      });
    });
  });

  describe('nullable() helper function with type arrays', () => {
    test('should create nullable string with type array', () => {
      const schema = builder.nullable(builder.string());
      
      expect(schema).toEqual({
        type: ['string', 'null']
      });
    });

    test('should create nullable number with type array', () => {
      const schema = builder.nullable(builder.number());
      
      expect(schema).toEqual({
        type: ['number', 'null']
      });
    });

    test('should create nullable boolean with type array', () => {
      const schema = builder.nullable(builder.boolean());
      
      expect(schema).toEqual({
        type: ['boolean', 'null']
      });
    });

    test('should create nullable integer with type array', () => {
      const schema = builder.nullable({ type: 'integer' });
      
      expect(schema).toEqual({
        type: ['integer', 'null']
      });
    });

    test('should handle complex schemas with anyOf', () => {
      const complexSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      
      const schema = builder.nullable(complexSchema);
      
      expect(schema).toEqual({
        anyOf: [
          complexSchema,
          { type: 'null' }
        ]
      });
    });

    test('should handle string references with anyOf', () => {
      const schema = builder.nullable('User');
      
      expect(schema).toEqual({
        anyOf: [
          { $ref: '#/definitions/User' },
          { type: 'null' }
        ]
      });
    });

    test('should preserve additional properties in nullable primitives', () => {
      const stringWithConstraints = {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z]+$'$'
      };
      
      const schema = builder.nullable(stringWithConstraints);
      
      expect(schema).toEqual({
        type: ['string', 'null'],
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z]+$'
      });
    });
  });

  describe('containsArray() helper function', () => {
    test('should create basic contains array schema', () => {
      const schema = builder.containsArray(builder.string());
      
      expect(schema).toEqual({
        type: 'array',
        contains: { type: 'string' }
      });
    });

    test('should create contains array with minContains', () => {
      const schema = builder.containsArray(builder.string(), {
        minContains: 2
      });
      
      expect(schema).toEqual({
        type: 'array',
        contains: { type: 'string' },
        minContains: 2
      });
    });

    test('should create contains array with maxContains', () => {
      const schema = builder.containsArray(builder.string(), {
        maxContains: 5
      });
      
      expect(schema).toEqual({
        type: 'array',
        contains: { type: 'string' },
        maxContains: 5
      });
    });

    test('should create contains array with both min and max contains', () => {
      const schema = builder.containsArray(builder.string(), {
        minContains: 1,
        maxContains: 3
      });
      
      expect(schema).toEqual({
        type: 'array',
        contains: { type: 'string' },
        minContains: 1,
        maxContains: 3
      });
    });

    test('should create contains array with string reference', () => {
      const schema = builder.containsArray('User');
      
      expect(schema).toEqual({
        type: 'array',
        contains: { $ref: '#/definitions/User' }
      });
    });

    test('should create contains array with additional array options', () => {
      const schema = builder.containsArray(builder.string(), {
        title: 'String Array',
        description: 'Array containing strings',
        minItems: 1,
        maxItems: 10,
        minContains: 1
      });
      
      expect(schema).toEqual({
        type: 'array',
        contains: { type: 'string' },
        minContains: 1,
        title: 'String Array',
        description: 'Array containing strings',
        minItems: 1,
        maxItems: 10
      });
    });

    test('should validate minContains constraints', () => {
      expect(() => builder.containsArray(builder.string(), { minContains: -1 }))
        .toThrow('minContains must be a non-negative integer');
      
      expect(() => builder.containsArray(builder.string(), { minContains: 1.5 }))
        .toThrow('minContains must be a non-negative integer');
      
      expect(() => builder.containsArray(builder.string(), { minContains: 'invalid' as any }))
        .toThrow('minContains must be a non-negative integer');
    });

    test('should validate maxContains constraints', () => {
      expect(() => builder.containsArray(builder.string(), { maxContains: -1 }))
        .toThrow('maxContains must be a non-negative integer');
      
      expect(() => builder.containsArray(builder.string(), { maxContains: 1.5 }))
        .toThrow('maxContains must be a non-negative integer');
      
      expect(() => builder.containsArray(builder.string(), { maxContains: 'invalid' as any }))
        .toThrow('maxContains must be a non-negative integer');
    });

    test('should validate minContains <= maxContains', () => {
      expect(() => builder.containsArray(builder.string(), { 
        minContains: 5, 
        maxContains: 3 
      })).toThrow('minContains must be less than or equal to maxContains');
    });
  });

  describe('Integration tests', () => {
    test('should combine multiple OpenAPI 3.1 features', () => {
      const userSchema = builder.object({
        id: builder.constSchema('user-123'),
        name: builder.nullable(builder.string()),
        tags: builder.tuple([builder.string(), builder.number()]),
        metadata: builder.conditional(
          { properties: { type: builder.constSchema('premium') } },
          { properties: { features: builder.containsArray(builder.string()) } }
        )
      });

      expect(userSchema.properties).toBeDefined();
      expect(userSchema.properties!.id).toEqual({
        const: 'user-123',
        type: 'string',
        enum: ['user-123']
      });
      expect(userSchema.properties!.name).toEqual({
        type: ['string', 'null']
      });
      expect(userSchema.properties!.tags).toEqual({
        type: 'array',
        prefixItems: [
          { type: 'string' },
          { type: 'number' }
        ],
        items: false
      });
      expect(userSchema.properties!.metadata).toEqual({
        if: { properties: { type: { const: 'premium', type: 'string', enum: ['premium'] } } },
        then: { properties: { features: { type: 'array', contains: { type: 'string' } } } }
      });
    });

    test('should work with existing builder functions', () => {
      const schema = builder.object({
        // Existing functions
        email: builder.email(),
        count: builder.number({ minimum: 0 }),
        tags: builder.array(builder.string()),
        
        // New OpenAPI 3.1 functions
        status: builder.const('active'),
        coordinates: builder.tuple([builder.number(), builder.number()]),
        description: builder.nullable(builder.string()),
        keywords: builder.containsArray(builder.string(), { minContains: 1 })
      });

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(Object.keys(schema.properties!)).toHaveLength(6);
      
      // Verify the const() helper works in integration
      expect(schema.properties!.status).toEqual({
        const: 'active',
        type: 'string',
        enum: ['active']
      });
    });
  });
});