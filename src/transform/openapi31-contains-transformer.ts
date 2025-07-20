/**
 * OpenAPI 3.1 contains keyword transformer
 * Handles conversion of contains keyword for array validation
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface ContainsTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Contains patterns that were processed */
  containsPatterns?: ContainsPattern[];
}

export interface ContainsPattern {
  /** The contains schema */
  schema: JSONSchema;
  /** Minimum number of items that must match (minContains) */
  minContains?: number;
  /** Maximum number of items that must match (maxContains) */
  maxContains?: number;
  /** Location in the schema where this pattern was found */
  location: string;
}

/**
 * Transforms OpenAPI 3.1 contains keywords to ensure proper array validation
 * @param schema The JSON Schema to transform
 * @returns Transformation result
 */
export function transformContains(schema: JSONSchema): ContainsTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  let containsPatterns: ContainsPattern[] | undefined;

  // Handle contains keyword for arrays
  if ('contains' in transformed && transformed.type === 'array') {
    const containsSchema = transformed.contains;
    
    if (typeof containsSchema !== 'object' || containsSchema === null) {
      throw new Error('contains must be a schema object');
    }

    // Extract minContains and maxContains if present
    const minContains = typeof transformed.minContains === 'number' ? transformed.minContains : undefined;
    const maxContains = typeof transformed.maxContains === 'number' ? transformed.maxContains : undefined;

    // Validate minContains and maxContains
    if (minContains !== undefined && minContains < 0) {
      throw new Error('minContains must be a non-negative integer');
    }
    
    if (maxContains !== undefined && maxContains < 0) {
      throw new Error('maxContains must be a non-negative integer');
    }
    
    if (minContains !== undefined && maxContains !== undefined && minContains > maxContains) {
      throw new Error('minContains must be less than or equal to maxContains');
    }

    // Store the contains pattern for later processing
    const pattern: ContainsPattern = {
      schema: containsSchema as JSONSchema,
      minContains,
      maxContains,
      location: '#/contains'
    };

    containsPatterns = [pattern];

    // For TypeScript type generation, we need to preserve the contains information
    // The actual validation will be handled by AJV, but we need to ensure the schema
    // is properly structured for both type generation and validation

    // Keep the contains keyword as-is for AJV validation
    // AJV 8+ supports contains, minContains, and maxContains natively

    wasTransformed = true;
  }

  // Recursively transform nested schemas
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformContains(prop as JSONSchema);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
        if (result.containsPatterns) {
          const updatedPatterns = result.containsPatterns.map(pattern => ({
            ...pattern,
            location: `#/properties/${key}${pattern.location.substring(1)}`
          }));
          containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
        }
      }
    }
  }

  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item: any, index: number) => {
        const result = transformContains(item as JSONSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.containsPatterns) {
            const updatedPatterns = result.containsPatterns.map(pattern => ({
              ...pattern,
              location: `#/items/${index}${pattern.location.substring(1)}`
            }));
            containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
          }
        }
        return result.schema;
      });
    } else {
      const result = transformContains(transformed.items as JSONSchema);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
        if (result.containsPatterns) {
          const updatedPatterns = result.containsPatterns.map(pattern => ({
            ...pattern,
            location: `#/items${pattern.location.substring(1)}`
          }));
          containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
        }
      }
    }
  }

  if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
    const result = transformContains(transformed.additionalProperties as JSONSchema);
    if (result.wasTransformed) {
      transformed.additionalProperties = result.schema;
      wasTransformed = true;
      if (result.containsPatterns) {
        const updatedPatterns = result.containsPatterns.map(pattern => ({
          ...pattern,
          location: `#/additionalProperties${pattern.location.substring(1)}`
        }));
        containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
      }
    }
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map((subSchema, index) => {
        const result = transformContains(subSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.containsPatterns) {
            const updatedPatterns = result.containsPatterns.map(pattern => ({
              ...pattern,
              location: `#/${combiner}/${index}${pattern.location.substring(1)}`
            }));
            containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
          }
        }
        return result.schema;
      });
    }
  }

  // Handle prefixItems (OpenAPI 3.1 tuple support)
  if (Array.isArray(transformed.prefixItems)) {
    transformed.prefixItems = transformed.prefixItems.map((item: any, index: number) => {
      const result = transformContains(item as JSONSchema);
      if (result.wasTransformed) {
        wasTransformed = true;
        if (result.containsPatterns) {
          const updatedPatterns = result.containsPatterns.map(pattern => ({
            ...pattern,
            location: `#/prefixItems/${index}${pattern.location.substring(1)}`
          }));
          containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
        }
      }
      return result.schema;
    });
  }

  // Handle conditional schemas (if/then/else)
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (transformed[conditionalKey] && typeof transformed[conditionalKey] === 'object') {
      const result = transformContains(transformed[conditionalKey] as JSONSchema);
      if (result.wasTransformed) {
        transformed[conditionalKey] = result.schema;
        wasTransformed = true;
        if (result.containsPatterns) {
          const updatedPatterns = result.containsPatterns.map(pattern => ({
            ...pattern,
            location: `#/${conditionalKey}${pattern.location.substring(1)}`
          }));
          containsPatterns = containsPatterns ? [...containsPatterns, ...updatedPatterns] : updatedPatterns;
        }
      }
    }
  }

  return {
    schema: transformed,
    wasTransformed,
    containsPatterns
  };
}

/**
 * Checks if a schema contains contains keywords that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains contains keywords
 */
export function hasContains(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check for contains keyword
  if ('contains' in schema) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasContains(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasContains(item as JSONSchema))) {
        return true;
      }
    } else if (hasContains(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    if (hasContains(schema.additionalProperties as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasContains(subSchema))) {
        return true;
      }
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    if (schema.prefixItems.some(item => hasContains(item as JSONSchema))) {
      return true;
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      if (hasContains(schema[conditionalKey] as JSONSchema)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts contains patterns from a schema
 * @param schema The schema to analyze
 * @returns Array of contains patterns found in the schema
 */
export function extractContainsPatterns(schema: JSONSchema): ContainsPattern[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const patterns: ContainsPattern[] = [];

  // Check for contains keyword
  if ('contains' in schema && schema.type === 'array') {
    const containsSchema = schema.contains;
    if (typeof containsSchema === 'object' && containsSchema !== null) {
      const minContains = typeof schema.minContains === 'number' ? schema.minContains : undefined;
      const maxContains = typeof schema.maxContains === 'number' ? schema.maxContains : undefined;
      
      patterns.push({
        schema: containsSchema as JSONSchema,
        minContains,
        maxContains,
        location: '#/contains'
      });
    }
  }

  // Check nested schemas
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const nestedPatterns = extractContainsPatterns(prop as JSONSchema);
      patterns.push(...nestedPatterns.map(pattern => ({
        ...pattern,
        location: `#/properties/${key}${pattern.location.substring(1)}`
      })));
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      for (const [index, item] of schema.items.entries()) {
        const nestedPatterns = extractContainsPatterns(item as JSONSchema);
        patterns.push(...nestedPatterns.map(pattern => ({
          ...pattern,
          location: `#/items/${index}${pattern.location.substring(1)}`
        })));
      }
    } else {
      const nestedPatterns = extractContainsPatterns(schema.items as JSONSchema);
      patterns.push(...nestedPatterns.map(pattern => ({
        ...pattern,
        location: `#/items${pattern.location.substring(1)}`
      })));
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    const nestedPatterns = extractContainsPatterns(schema.additionalProperties as JSONSchema);
    patterns.push(...nestedPatterns.map(pattern => ({
      ...pattern,
      location: `#/additionalProperties${pattern.location.substring(1)}`
    })));
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      for (const [index, subSchema] of (schema[combiner] as JSONSchema[]).entries()) {
        const nestedPatterns = extractContainsPatterns(subSchema);
        patterns.push(...nestedPatterns.map(pattern => ({
          ...pattern,
          location: `#/${combiner}/${index}${pattern.location.substring(1)}`
        })));
      }
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    for (const [index, item] of schema.prefixItems.entries()) {
      const nestedPatterns = extractContainsPatterns(item as JSONSchema);
      patterns.push(...nestedPatterns.map(pattern => ({
        ...pattern,
        location: `#/prefixItems/${index}${pattern.location.substring(1)}`
      })));
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      const nestedPatterns = extractContainsPatterns(schema[conditionalKey] as JSONSchema);
      patterns.push(...nestedPatterns.map(pattern => ({
        ...pattern,
        location: `#/${conditionalKey}${pattern.location.substring(1)}`
      })));
    }
  }

  return patterns;
}

/**
 * Validates contains configuration
 * @param containsSchema The contains schema to validate
 * @param minContains Optional minimum contains value
 * @param maxContains Optional maximum contains value
 * @returns Validation result
 */
export function validateContainsConfig(
  containsSchema: any,
  minContains?: number,
  maxContains?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate contains schema
  if (!containsSchema || typeof containsSchema !== 'object') {
    errors.push('contains must be a schema object');
  }

  // Validate minContains
  if (minContains !== undefined) {
    if (typeof minContains !== 'number' || !Number.isInteger(minContains) || minContains < 0) {
      errors.push('minContains must be a non-negative integer');
    }
  }

  // Validate maxContains
  if (maxContains !== undefined) {
    if (typeof maxContains !== 'number' || !Number.isInteger(maxContains) || maxContains < 0) {
      errors.push('maxContains must be a non-negative integer');
    }
  }

  // Validate minContains <= maxContains
  if (minContains !== undefined && maxContains !== undefined && minContains > maxContains) {
    errors.push('minContains must be less than or equal to maxContains');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a schema with contains validation
 * @param containsSchema The schema that array items must match
 * @param options Additional options for contains validation
 * @returns JSON Schema with contains keyword
 */
export function createContainsSchema(
  containsSchema: JSONSchema,
  options: {
    minContains?: number;
    maxContains?: number;
    additionalProperties?: Partial<JSONSchema>;
  } = {}
): JSONSchema {
  const { minContains, maxContains, additionalProperties = {} } = options;

  // Validate the configuration
  const validation = validateContainsConfig(containsSchema, minContains, maxContains);
  if (!validation.isValid) {
    throw new Error(`Invalid contains configuration: ${validation.errors.join(', ')}`);
  }

  const schema: JSONSchema = {
    type: 'array',
    contains: containsSchema,
    ...additionalProperties
  };

  if (minContains !== undefined) {
    schema.minContains = minContains;
  }

  if (maxContains !== undefined) {
    schema.maxContains = maxContains;
  }

  return schema;
}