/**
 * Tests for OpenAPI 3.1 discriminator transformer
 */

import { 
  transformDiscriminators, 
  hasDiscriminators, 
  extractDiscriminatorInfo,
  validateDiscriminator,
  type DiscriminatorInfo 
} from '../../src/transform/openapi31-discriminator-transformer';
import type { JSONSchema } from 'json-schema-to-typescript';

describe('OpenAPI 3.1 Discriminator Transformer', () => {
  describe('transformDiscriminators', () => {
    it('should handle discriminator with explicit mapping in oneOf', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'petType',
          mapping: {
            cat: '#/components/schemas/Cat',
            dog: '#/components/schemas/Dog'
          }
        },
        oneOf: [
          { $ref: '#/components/schemas/Cat' },
          { $ref: '#/components/schemas/Dog' }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0]).toEqual({
        propertyName: 'petType',
        mapping: {
          cat: '#/components/schemas/Cat',
          dog: '#/components/schemas/Dog'
        },
        location: '#/'
      });
      expect((result.schema as any)['x-discriminator-enhanced']).toBeDefined();
    });

    it('should infer mapping when not explicitly provided', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'vehicleType'
        },
        anyOf: [
          { $ref: '#/components/schemas/Car' },
          { $ref: '#/components/schemas/Motorcycle' }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0].inferredMapping).toEqual({
        Car: '#/components/schemas/Car',
        Motorcycle: '#/components/schemas/Motorcycle'
      });
    });

    it('should handle discriminator in allOf (inheritance scenario)', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'shapeType'
        },
        allOf: [
          {
            type: 'object',
            properties: {
              color: { type: 'string' }
            }
          }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.properties).toBeDefined();
      expect(result.schema.properties!['shapeType']).toEqual({
        type: 'string',
        description: 'Discriminator property for #/'
      });
      expect(result.schema.required).toContain('shapeType');
    });

    it('should enhance union schemas with discriminator properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type',
          mapping: {
            email: '#/components/schemas/EmailNotification'
          }
        },
        oneOf: [
          {
            type: 'object',
            properties: {
              recipient: { type: 'string' }
            }
          }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      const enhancedSchema = (result.schema as any).oneOf[0];
      expect(enhancedSchema.properties.type).toEqual({
        type: 'string',
        const: 'email',
        description: 'Discriminator value for this variant'
      });
      expect(enhancedSchema.required).toContain('type');
    });

    it('should handle nested discriminators', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          pet: {
            type: 'object',
            discriminator: {
              propertyName: 'petType'
            },
            oneOf: [
              { $ref: '#/components/schemas/Cat' }
            ]
          }
        }
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0].isNested).toBe(true);
      expect(result.discriminators![0].location).toBe('#/properties/pet');
    });

    it('should handle discriminators in array items', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          pets: {
            type: 'array',
            items: {
              type: 'object',
              discriminator: {
                propertyName: 'petType'
              },
              oneOf: [
                { $ref: '#/components/schemas/Cat' }
              ]
            }
          }
        }
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0].isNested).toBe(true);
    });

    it('should not transform schemas without discriminators', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.discriminators).toBeUndefined();
      expect(result.schema).toEqual(schema);
    });

    it('should handle invalid discriminator gracefully', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          // Missing propertyName
        },
        oneOf: [
          { $ref: '#/components/schemas/Cat' }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(false);
    });
  });

  describe('hasDiscriminators', () => {
    it('should detect direct discriminators', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type'
        },
        oneOf: []
      };

      expect(hasDiscriminators(schema)).toBe(true);
    });

    it('should detect nested discriminators', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          item: {
            type: 'object',
            discriminator: {
              propertyName: 'type'
            }
          }
        }
      };

      expect(hasDiscriminators(schema)).toBe(true);
    });

    it('should return false for schemas without discriminators', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      expect(hasDiscriminators(schema)).toBe(false);
    });

    it('should handle null/undefined schemas', () => {
      expect(hasDiscriminators(null as any)).toBe(false);
      expect(hasDiscriminators(undefined as any)).toBe(false);
    });
  });

  describe('extractDiscriminatorInfo', () => {
    it('should extract discriminator information', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type',
          mapping: {
            cat: '#/components/schemas/Cat'
          }
        },
        oneOf: [
          { $ref: '#/components/schemas/Cat' }
        ]
      };

      const info = extractDiscriminatorInfo(schema);

      expect(info).toHaveLength(1);
      expect(info[0].propertyName).toBe('type');
      expect(info[0].mapping).toEqual({
        cat: '#/components/schemas/Cat'
      });
    });

    it('should return empty array for schemas without discriminators', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const info = extractDiscriminatorInfo(schema);

      expect(info).toEqual([]);
    });
  });

  describe('validateDiscriminator', () => {
    it('should validate valid discriminator', () => {
      const discriminator = {
        propertyName: 'type',
        mapping: {
          cat: '#/components/schemas/Cat'
        }
      };

      expect(() => validateDiscriminator(discriminator, '#/')).not.toThrow();
    });

    it('should throw for missing propertyName', () => {
      const discriminator = {
        mapping: {
          cat: '#/components/schemas/Cat'
        }
      };

      expect(() => validateDiscriminator(discriminator, '#/'))
        .toThrow('propertyName must be a non-empty string');
    });

    it('should throw for invalid mapping', () => {
      const discriminator = {
        propertyName: 'type',
        mapping: {
          cat: 123 // Should be string
        }
      };

      expect(() => validateDiscriminator(discriminator, '#/'))
        .toThrow('all mapping values must be strings');
    });

    it('should throw for null/undefined discriminator', () => {
      expect(() => validateDiscriminator(null, '#/'))
        .toThrow('must be an object');
      
      expect(() => validateDiscriminator(undefined, '#/'))
        .toThrow('must be an object');
    });

    it('should allow discriminator without mapping', () => {
      const discriminator = {
        propertyName: 'type'
      };

      expect(() => validateDiscriminator(discriminator, '#/')).not.toThrow();
    });
  });

  describe('mapping inference', () => {
    it('should infer mapping from $ref schemas', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type'
        },
        oneOf: [
          { $ref: '#/components/schemas/Cat' },
          { $ref: '#/components/schemas/Dog' },
          { $ref: '#/definitions/Bird' }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.discriminators![0].inferredMapping).toEqual({
        Cat: '#/components/schemas/Cat',
        Dog: '#/components/schemas/Dog',
        Bird: '#/definitions/Bird'
      });
    });

    it('should infer mapping from const properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type'
        },
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'email' },
              recipient: { type: 'string' }
            }
          },
          {
            type: 'object',
            properties: {
              type: { const: 'sms' },
              phoneNumber: { type: 'string' }
            }
          }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.discriminators![0].inferredMapping).toEqual({
        email: '#/unionSchemas/0',
        sms: '#/unionSchemas/1'
      });
    });

    it('should infer mapping from enum properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type'
        },
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { enum: ['notification'] },
              message: { type: 'string' }
            }
          }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.discriminators![0].inferredMapping).toEqual({
        notification: '#/unionSchemas/0'
      });
    });

    it('should infer mapping from schema titles', () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type'
        },
        oneOf: [
          {
            title: 'EmailNotification',
            type: 'object',
            properties: {
              recipient: { type: 'string' }
            }
          }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.discriminators![0].inferredMapping).toEqual({
        EmailNotification: '#/unionSchemas/0'
      });
    });
  });
});