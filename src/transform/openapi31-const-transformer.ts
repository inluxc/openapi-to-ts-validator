/**
 * OpenAPI 3.1 const keyword transformer
 * Handles conversion of const values to literal types for TypeScript generation
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface ConstTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Const values that were processed */
  constValues?: any[];
}

/**
 * Transforms OpenAPI 3.1 const keywords to ensure proper TypeScript literal type generation
 * @param schema The JSON Schema to transform
 * @returns Transformation result
 */
export function transformConstKeyword(schema: JSONSchema): ConstTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  let constValues: any[] | undefined;

  // Handle const keyword
  if ('const' in transformed) {
    const constValue = transformed.const;
    constValues = [constValue];

    // Ensure the schema has the correct type for the const value
    if (!transformed.type) {
      transformed.type = inferTypeFromValue(constValue) as any;
    }

    // For better TypeScript literal type generation, we can also add an enum with single value
    // This helps json-schema-to-typescript generate proper literal types
    if (!transformed.enum) {
      transformed.enum = [constValue];
    }

    wasTransformed = true;
  }

  // Recursively transform nested schemas
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformConstKeyword(prop as JSONSchema);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
        if (result.constValues) {
          constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
        }
      }
    }
  }

  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item: any, index: number) => {
        const result = transformConstKeyword(item as JSONSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.constValues) {
            constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
          }
        }
        return result.schema;
      });
    } else {
      const result = transformConstKeyword(transformed.items as JSONSchema);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
        if (result.constValues) {
          constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
        }
      }
    }
  }

  if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
    const result = transformConstKeyword(transformed.additionalProperties as JSONSchema);
    if (result.wasTransformed) {
      transformed.additionalProperties = result.schema;
      wasTransformed = true;
      if (result.constValues) {
        constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
      }
    }
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map(subSchema => {
        const result = transformConstKeyword(subSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.constValues) {
            constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
          }
        }
        return result.schema;
      });
    }
  }

  // Handle prefixItems (OpenAPI 3.1 tuple support)
  if (Array.isArray(transformed.prefixItems)) {
    transformed.prefixItems = transformed.prefixItems.map((item: any, index: number) => {
      const result = transformConstKeyword(item as JSONSchema);
      if (result.wasTransformed) {
        wasTransformed = true;
        if (result.constValues) {
          constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
        }
      }
      return result.schema;
    });
  }

  // Handle conditional schemas (if/then/else)
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (transformed[conditionalKey] && typeof transformed[conditionalKey] === 'object') {
      const result = transformConstKeyword(transformed[conditionalKey] as JSONSchema);
      if (result.wasTransformed) {
        transformed[conditionalKey] = result.schema;
        wasTransformed = true;
        if (result.constValues) {
          constValues = constValues ? [...constValues, ...result.constValues] : result.constValues;
        }
      }
    }
  }

  return {
    schema: transformed,
    wasTransformed,
    constValues
  };
}

/**
 * Checks if a schema contains const keywords that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains const keywords
 */
export function hasConstKeywords(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check for const keyword
  if ('const' in schema) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasConstKeywords(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasConstKeywords(item as JSONSchema))) {
        return true;
      }
    } else if (hasConstKeywords(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    if (hasConstKeywords(schema.additionalProperties as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasConstKeywords(subSchema))) {
        return true;
      }
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    if (schema.prefixItems.some(item => hasConstKeywords(item as JSONSchema))) {
      return true;
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      if (hasConstKeywords(schema[conditionalKey] as JSONSchema)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts const values from a schema
 * @param schema The schema to analyze
 * @returns Array of const values found in the schema
 */
export function extractConstValues(schema: JSONSchema): any[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const constValues: any[] = [];

  // Check for const keyword
  if ('const' in schema) {
    constValues.push(schema.const);
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      constValues.push(...extractConstValues(prop as JSONSchema));
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) {
        constValues.push(...extractConstValues(item as JSONSchema));
      }
    } else {
      constValues.push(...extractConstValues(schema.items as JSONSchema));
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    constValues.push(...extractConstValues(schema.additionalProperties as JSONSchema));
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      for (const subSchema of schema[combiner] as JSONSchema[]) {
        constValues.push(...extractConstValues(subSchema));
      }
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    for (const item of schema.prefixItems) {
      constValues.push(...extractConstValues(item as JSONSchema));
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      constValues.push(...extractConstValues(schema[conditionalKey] as JSONSchema));
    }
  }

  return constValues;
}

/**
 * Infers the JSON Schema type from a JavaScript value
 * @param value The value to analyze
 * @returns The inferred JSON Schema type
 */
function inferTypeFromValue(value: any): string {
  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  
  if (typeof value === 'string') {
    return 'string';
  }
  
  if (Array.isArray(value)) {
    return 'array';
  }
  
  if (typeof value === 'object') {
    return 'object';
  }
  
  // Fallback for unknown types
  return 'string';
}

/**
 * Validates that a const value is valid for JSON Schema
 * @param value The const value to validate
 * @throws Error if the value is not valid
 */
export function validateConstValue(value: any): void {
  // JSON Schema const can be any JSON value
  // We need to ensure it's serializable to JSON
  try {
    JSON.stringify(value);
  } catch (error) {
    throw new Error(`Invalid const value: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Check for undefined (not valid in JSON)
  if (value === undefined) {
    throw new Error('const value cannot be undefined');
  }
  
  // Check for functions (not valid in JSON)
  if (typeof value === 'function') {
    throw new Error('const value cannot be a function');
  }
  
  // Check for symbols (not valid in JSON)
  if (typeof value === 'symbol') {
    throw new Error('const value cannot be a symbol');
  }
}

/**
 * Creates a schema with a const value, ensuring proper type inference
 * @param value The const value
 * @param additionalProperties Additional schema properties
 * @returns JSON Schema with const keyword
 */
export function createConstSchema(value: any, additionalProperties: Partial<JSONSchema> = {}): JSONSchema {
  validateConstValue(value);
  
  return {
    const: value,
    type: inferTypeFromValue(value) as any,
    enum: [value], // Add enum for better TypeScript literal type generation
    ...additionalProperties
  };
}