/**
 * OpenAPI 3.1 null type transformer
 * Handles conversion of type arrays to union types for proper null handling
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface NullTypeTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Union types that were created */
  unionTypes?: string[];
}

/**
 * Transforms OpenAPI 3.1 type arrays to union types for TypeScript generation
 * @param schema The JSON Schema to transform
 * @returns Transformation result
 */
export function transformNullTypes(schema: JSONSchema): NullTypeTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  let unionTypes: string[] | undefined;

  // Handle type arrays (e.g., ["string", "null"])
  if (Array.isArray(transformed.type)) {
    const typeArray = transformed.type as string[];
    
    if (typeArray.length > 1) {
      // Create union type representation
      unionTypes = [...typeArray];
      
      // For JSON Schema compatibility, we need to handle this differently
      // If null is present with other types, we use anyOf with individual type schemas
      if (typeArray.includes('null')) {
        const nonNullTypes = typeArray.filter(type => type !== 'null');
        
        if (nonNullTypes.length === 1) {
          // Simple case: one type + null (e.g., ["string", "null"])
          transformed.type = nonNullTypes[0];
          // Add nullable flag for compatibility with some tools
          (transformed as any).nullable = true;
        } else {
          // Complex case: multiple types + null (e.g., ["string", "number", "null"])
          delete transformed.type;
          transformed.anyOf = [
            ...nonNullTypes.map(type => ({ type })),
            { type: 'null' }
          ];
        }
      } else {
        // No null type, just multiple types (e.g., ["string", "number"])
        delete transformed.type;
        transformed.anyOf = typeArray.map(type => ({ type }));
      }
      
      wasTransformed = true;
    }
  }

  // Handle mixed scenarios where both nullable and type array exist
  if (transformed.nullable === true && transformed.type && !Array.isArray(transformed.type)) {
    // Convert nullable property to type array approach
    const originalType = transformed.type as string;
    unionTypes = [originalType, 'null'];
    
    // Remove nullable property and use anyOf instead
    delete transformed.nullable;
    transformed.anyOf = [
      { type: originalType },
      { type: 'null' }
    ];
    delete transformed.type;
    
    wasTransformed = true;
  }

  // Recursively transform nested schemas
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformNullTypes(prop as JSONSchema);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
      }
    }
  }

  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map(item => {
        const result = transformNullTypes(item as JSONSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
        }
        return result.schema;
      });
    } else {
      const result = transformNullTypes(transformed.items as JSONSchema);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
      }
    }
  }

  if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
    const result = transformNullTypes(transformed.additionalProperties as JSONSchema);
    if (result.wasTransformed) {
      transformed.additionalProperties = result.schema;
      wasTransformed = true;
    }
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map(subSchema => {
        const result = transformNullTypes(subSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
        }
        return result.schema;
      });
    }
  }

  return {
    schema: transformed,
    wasTransformed,
    unionTypes
  };
}

/**
 * Checks if a schema contains null types that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains null types
 */
export function hasNullTypes(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check for type arrays containing null
  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    return true;
  }

  // Check for nullable property
  if (schema.nullable === true) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasNullTypes(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasNullTypes(item as JSONSchema))) {
        return true;
      }
    } else if (hasNullTypes(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    if (hasNullTypes(schema.additionalProperties as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasNullTypes(subSchema))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts union type information from a transformed schema
 * @param schema The schema to analyze
 * @returns Array of type strings that form the union
 */
export function extractUnionTypes(schema: JSONSchema): string[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  // Handle anyOf unions
  if (Array.isArray(schema.anyOf)) {
    const types: string[] = [];
    for (const subSchema of schema.anyOf) {
      if (typeof subSchema === 'object' && subSchema.type && typeof subSchema.type === 'string') {
        types.push(subSchema.type);
      }
    }
    return types;
  }

  // Handle simple nullable types
  if (schema.type && typeof schema.type === 'string' && (schema as any).nullable === true) {
    return [schema.type, 'null'];
  }

  // Handle type arrays (should be transformed by now, but just in case)
  if (Array.isArray(schema.type)) {
    return schema.type as string[];
  }

  return [];
}