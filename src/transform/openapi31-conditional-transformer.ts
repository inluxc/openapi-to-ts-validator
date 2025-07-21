/**
 * OpenAPI 3.1 conditional schema transformer
 * Handles conversion of if/then/else patterns to compatible JSON Schema structures
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface ConditionalTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Conditional patterns that were processed */
  conditionalPatterns?: ConditionalPattern[];
}

export interface ConditionalPattern {
  /** The if condition schema */
  if: JSONSchema;
  /** The then schema (optional) */
  then?: JSONSchema;
  /** The else schema (optional) */
  else?: JSONSchema;
  /** Location in the schema where this pattern was found */
  location: string;
}

/**
 * Transforms OpenAPI 3.1 conditional schemas (if/then/else) to ensure proper handling
 * @param schema The JSON Schema to transform
 * @param location Current location in schema for tracking
 * @returns Transformation result
 */
export function transformConditionalSchemas(schema: JSONSchema, location: string = '#/'): ConditionalTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  let conditionalPatterns: ConditionalPattern[] = [];

  // Handle if/then/else conditional logic
  if (hasConditionalSchema(transformed)) {
    const pattern: ConditionalPattern = {
      if: transformed.if as JSONSchema,
      location
    };

    if (transformed.then) {
      pattern.then = transformed.then as JSONSchema;
    }

    if (transformed.else) {
      pattern.else = transformed.else as JSONSchema;
    }

    conditionalPatterns.push(pattern);

    // Validate the conditional schema structure
    validateConditionalSchema(transformed, location);

    // Transform conditional schema to a more compatible structure
    // We'll use allOf with the conditional logic preserved
    const conditionalSchema = transformConditionalToAllOf(transformed, location);
    
    if (conditionalSchema) {
      Object.assign(transformed, conditionalSchema);
      wasTransformed = true;
    }
  }

  // Recursively transform nested schemas
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformConditionalSchemas(prop as JSONSchema, `${location}/properties/${key}`);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
        if (result.conditionalPatterns) {
          conditionalPatterns.push(...result.conditionalPatterns);
        }
      }
    }
  }

  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item: any, index: number) => {
        const result = transformConditionalSchemas(item as JSONSchema, `${location}/items/${index}`);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.conditionalPatterns) {
            conditionalPatterns.push(...result.conditionalPatterns);
          }
        }
        return result.schema;
      });
    } else {
      const result = transformConditionalSchemas(transformed.items as JSONSchema, `${location}/items`);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
        if (result.conditionalPatterns) {
          conditionalPatterns.push(...result.conditionalPatterns);
        }
      }
    }
  }

  if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
    const result = transformConditionalSchemas(transformed.additionalProperties as JSONSchema, `${location}/additionalProperties`);
    if (result.wasTransformed) {
      transformed.additionalProperties = result.schema;
      wasTransformed = true;
      if (result.conditionalPatterns) {
        conditionalPatterns.push(...result.conditionalPatterns);
      }
    }
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map((subSchema, index) => {
        const result = transformConditionalSchemas(subSchema, `${location}/${combiner}/${index}`);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.conditionalPatterns) {
            conditionalPatterns.push(...result.conditionalPatterns);
          }
        }
        return result.schema;
      });
    }
  }

  // Handle prefixItems (OpenAPI 3.1 tuple support)
  if (Array.isArray(transformed.prefixItems)) {
    transformed.prefixItems = transformed.prefixItems.map((item: any, index: number) => {
      const result = transformConditionalSchemas(item as JSONSchema, `${location}/prefixItems/${index}`);
      if (result.wasTransformed) {
        wasTransformed = true;
        if (result.conditionalPatterns) {
          conditionalPatterns.push(...result.conditionalPatterns);
        }
      }
      return result.schema;
    });
  }

  return {
    schema: transformed,
    wasTransformed,
    conditionalPatterns: conditionalPatterns.length > 0 ? conditionalPatterns : undefined
  };
}

/**
 * Checks if a schema contains conditional logic (if/then/else)
 * @param schema The schema to check
 * @returns True if the schema contains conditional logic
 */
export function hasConditionalSchema(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  return !!(schema.if || schema.then || schema.else);
}

/**
 * Checks if a schema tree contains any conditional schemas
 * @param schema The schema to check recursively
 * @returns True if any conditional schemas are found
 */
export function hasConditionalSchemas(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check current level
  if (hasConditionalSchema(schema)) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasConditionalSchemas(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasConditionalSchemas(item as JSONSchema))) {
        return true;
      }
    } else if (hasConditionalSchemas(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    if (hasConditionalSchemas(schema.additionalProperties as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasConditionalSchemas(subSchema))) {
        return true;
      }
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    if (schema.prefixItems.some(item => hasConditionalSchemas(item as JSONSchema))) {
      return true;
    }
  }

  return false;
}

/**
 * Validates conditional schema structure
 * @param schema Schema with conditional properties
 * @param location Current location for error reporting
 * @throws Error if the conditional schema is invalid
 */
function validateConditionalSchema(schema: any, location: string): void {
  if (schema.if && typeof schema.if !== 'object') {
    throw new Error(`Invalid conditional schema at '${location}': if clause must be a schema object`);
  }

  if (schema.then && typeof schema.then !== 'object') {
    throw new Error(`Invalid conditional schema at '${location}': then clause must be a schema object`);
  }

  if (schema.else && typeof schema.else !== 'object') {
    throw new Error(`Invalid conditional schema at '${location}': else clause must be a schema object`);
  }

  // If there's an if, there should be at least a then or else
  if (schema.if && !schema.then && !schema.else) {
    throw new Error(`Invalid conditional schema at '${location}': if clause requires at least a then or else clause`);
  }

  // Validate that if/then/else don't conflict with other schema properties
  if (schema.if && schema.const !== undefined) {
    console.warn(`Warning at '${location}': conditional schema with const keyword may have unexpected behavior`);
  }
}

/**
 * Transforms conditional schema to allOf structure for better compatibility
 * @param schema Schema with conditional logic
 * @param location Current location for error reporting
 * @returns Transformed schema or null if no transformation needed
 */
function transformConditionalToAllOf(schema: any, location: string): JSONSchema | null {
  if (!hasConditionalSchema(schema)) {
    return null;
  }

  const { if: ifSchema, then: thenSchema, else: elseSchema, ...baseSchema } = schema;

  // Create the base schema without conditional keywords
  const result: JSONSchema = { ...baseSchema };

  // Preserve the conditional logic for AJV validation
  // AJV supports if/then/else natively in JSON Schema Draft 7+
  result.if = ifSchema;
  
  if (thenSchema) {
    result.then = thenSchema;
  }
  
  if (elseSchema) {
    result.else = elseSchema;
  }

  // Add metadata to help with TypeScript generation
  (result as any)._conditionalSchema = {
    if: ifSchema,
    then: thenSchema,
    else: elseSchema,
    location
  };

  return result;
}

/**
 * Extracts conditional patterns from a schema
 * @param schema The schema to analyze
 * @param location Current location in schema
 * @returns Array of conditional patterns found
 */
export function extractConditionalPatterns(schema: JSONSchema, location: string = '#/'): ConditionalPattern[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const patterns: ConditionalPattern[] = [];

  // Check current level
  if (hasConditionalSchema(schema)) {
    const pattern: ConditionalPattern = {
      if: schema.if as JSONSchema,
      location
    };

    if (schema.then) {
      pattern.then = schema.then as JSONSchema;
    }

    if (schema.else) {
      pattern.else = schema.else as JSONSchema;
    }

    patterns.push(pattern);
  }

  // Check nested schemas
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      patterns.push(...extractConditionalPatterns(prop as JSONSchema, `${location}/properties/${key}`));
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((item, index) => {
        patterns.push(...extractConditionalPatterns(item as JSONSchema, `${location}/items/${index}`));
      });
    } else {
      patterns.push(...extractConditionalPatterns(schema.items as JSONSchema, `${location}/items`));
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    patterns.push(...extractConditionalPatterns(schema.additionalProperties as JSONSchema, `${location}/additionalProperties`));
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      (schema[combiner] as JSONSchema[]).forEach((subSchema, index) => {
        patterns.push(...extractConditionalPatterns(subSchema, `${location}/${combiner}/${index}`));
      });
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    schema.prefixItems.forEach((item, index) => {
      patterns.push(...extractConditionalPatterns(item as JSONSchema, `${location}/prefixItems/${index}`));
    });
  }

  return patterns;
}

/**
 * Creates a conditional schema with proper validation
 * @param ifSchema The condition schema
 * @param thenSchema The schema to apply if condition is true
 * @param elseSchema The schema to apply if condition is false (optional)
 * @param baseSchema Additional base schema properties
 * @returns Valid conditional JSON Schema
 */
export function createConditionalSchema(
  ifSchema: JSONSchema,
  thenSchema?: JSONSchema,
  elseSchema?: JSONSchema,
  baseSchema: Partial<JSONSchema> = {}
): JSONSchema {
  if (!ifSchema || typeof ifSchema !== 'object') {
    throw new Error('if schema is required and must be an object');
  }

  if (!thenSchema && !elseSchema) {
    throw new Error('At least one of then or else schema must be provided');
  }

  if (thenSchema && typeof thenSchema !== 'object') {
    throw new Error('then schema must be an object');
  }

  if (elseSchema && typeof elseSchema !== 'object') {
    throw new Error('else schema must be an object');
  }

  const result: JSONSchema = {
    ...baseSchema,
    if: ifSchema
  };

  if (thenSchema) {
    result.then = thenSchema;
  }

  if (elseSchema) {
    result.else = elseSchema;
  }

  return result;
}

/**
 * Validates that a conditional schema is properly formed
 * @param schema The conditional schema to validate
 * @throws Error if the schema is invalid
 */
export function validateConditionalSchemaStructure(schema: JSONSchema): void {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema must be an object');
  }

  if (!hasConditionalSchema(schema)) {
    throw new Error('Schema does not contain conditional logic');
  }

  validateConditionalSchema(schema, '#/');
}