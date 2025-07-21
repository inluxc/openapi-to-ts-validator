/**
 * OpenAPI 3.1 unevaluatedProperties transformer
 * Handles conversion of unevaluatedProperties to compatible JSON Schema for TypeScript generation
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface UnevaluatedPropertiesTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Information about unevaluated properties handling */
  unevaluatedInfo?: {
    /** Whether unevaluatedProperties was set to false */
    disallowed: boolean;
    /** Whether unevaluatedProperties was set to true */
    allowed: boolean;
    /** Whether unevaluatedProperties was a schema object */
    hasSchema: boolean;
    /** The schema used for unevaluated properties (if applicable) */
    schema?: JSONSchema;
  };
}

/**
 * Transforms OpenAPI 3.1 unevaluatedProperties to ensure proper TypeScript type generation
 * and AJV validation compatibility
 * @param schema The JSON Schema to transform
 * @returns Transformation result
 */
export function transformUnevaluatedProperties(schema: JSONSchema): UnevaluatedPropertiesTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  let unevaluatedInfo: UnevaluatedPropertiesTransformResult['unevaluatedInfo'];

  // Handle unevaluatedProperties keyword
  if ('unevaluatedProperties' in transformed) {
    const unevaluatedProps = transformed.unevaluatedProperties;
    
    if (typeof unevaluatedProps === 'boolean') {
      if (unevaluatedProps === false) {
        // unevaluatedProperties: false - no additional properties allowed beyond evaluated ones
        unevaluatedInfo = { disallowed: true, allowed: false, hasSchema: false };
        
        // For compatibility with TypeScript generation, we need to handle this carefully
        // If there's no additionalProperties set, we can set it to false
        // If additionalProperties is already set, we need to be more careful
        if (!('additionalProperties' in transformed)) {
          transformed.additionalProperties = false;
        } else if (transformed.additionalProperties === true) {
          // Conflict: additionalProperties: true but unevaluatedProperties: false
          // In this case, unevaluatedProperties is more restrictive and should take precedence
          // But we need to preserve the intent - this is complex and may need special handling
          transformed.additionalProperties = false;
        }
        
      } else {
        // unevaluatedProperties: true - allow any additional properties
        unevaluatedInfo = { disallowed: false, allowed: true, hasSchema: false };
        
        // For TypeScript generation, this is similar to additionalProperties: true
        if (!('additionalProperties' in transformed)) {
          transformed.additionalProperties = true;
        }
      }
      
      // Keep the original unevaluatedProperties for AJV validation
      // AJV 2020-12 supports this natively
      wasTransformed = true;
      
    } else if (typeof unevaluatedProps === 'object' && unevaluatedProps !== null) {
      // unevaluatedProperties: { schema } - validate additional properties against schema
      unevaluatedInfo = { 
        disallowed: false, 
        allowed: true, 
        hasSchema: true, 
        schema: unevaluatedProps as JSONSchema 
      };
      
      // For TypeScript generation, treat this similar to additionalProperties with schema
      if (!('additionalProperties' in transformed)) {
        // Transform the unevaluated properties schema recursively
        const nestedResult = transformUnevaluatedProperties(unevaluatedProps as JSONSchema);
        transformed.additionalProperties = nestedResult.schema;
        if (nestedResult.wasTransformed) {
          wasTransformed = true;
        }
      }
      
      // Keep the original unevaluatedProperties for AJV validation
      wasTransformed = true;
    }
  }

  // Recursively transform nested schemas
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformUnevaluatedProperties(prop as JSONSchema);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
      }
    }
  }

  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item: any) => {
        const result = transformUnevaluatedProperties(item as JSONSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
        }
        return result.schema;
      });
    } else {
      const result = transformUnevaluatedProperties(transformed.items as JSONSchema);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
      }
    }
  }

  if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
    const result = transformUnevaluatedProperties(transformed.additionalProperties as JSONSchema);
    if (result.wasTransformed) {
      transformed.additionalProperties = result.schema;
      wasTransformed = true;
    }
  }

  // Handle unevaluatedItems for arrays (similar concept)
  if ('unevaluatedItems' in transformed) {
    const unevaluatedItems = transformed.unevaluatedItems;
    
    if (typeof unevaluatedItems === 'boolean') {
      if (unevaluatedItems === false) {
        // No additional items allowed beyond evaluated ones
        if (!('additionalItems' in transformed)) {
          transformed.additionalItems = false;
        }
      } else {
        // Allow any additional items
        if (!('additionalItems' in transformed)) {
          transformed.additionalItems = true;
        }
      }
    } else if (typeof unevaluatedItems === 'object' && unevaluatedItems !== null) {
      // Validate additional items against schema
      if (!('additionalItems' in transformed)) {
        const nestedResult = transformUnevaluatedProperties(unevaluatedItems as JSONSchema);
        transformed.additionalItems = nestedResult.schema;
        if (nestedResult.wasTransformed) {
          wasTransformed = true;
        }
      }
    }
    
    wasTransformed = true;
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map(subSchema => {
        const result = transformUnevaluatedProperties(subSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
        }
        return result.schema;
      });
    }
  }

  // Handle prefixItems (OpenAPI 3.1 tuple support)
  if (Array.isArray(transformed.prefixItems)) {
    transformed.prefixItems = transformed.prefixItems.map((item: any) => {
      const result = transformUnevaluatedProperties(item as JSONSchema);
      if (result.wasTransformed) {
        wasTransformed = true;
      }
      return result.schema;
    });
  }

  // Handle conditional schemas (if/then/else)
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (transformed[conditionalKey] && typeof transformed[conditionalKey] === 'object') {
      const result = transformUnevaluatedProperties(transformed[conditionalKey] as JSONSchema);
      if (result.wasTransformed) {
        transformed[conditionalKey] = result.schema;
        wasTransformed = true;
      }
    }
  }

  return {
    schema: transformed,
    wasTransformed,
    unevaluatedInfo
  };
}

/**
 * Checks if a schema contains unevaluatedProperties that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains unevaluatedProperties
 */
export function hasUnevaluatedProperties(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check for unevaluatedProperties keyword
  if ('unevaluatedProperties' in schema || 'unevaluatedItems' in schema) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasUnevaluatedProperties(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasUnevaluatedProperties(item as JSONSchema))) {
        return true;
      }
    } else if (hasUnevaluatedProperties(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    if (hasUnevaluatedProperties(schema.additionalProperties as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasUnevaluatedProperties(subSchema))) {
        return true;
      }
    }
  }

  // Check prefixItems
  if (Array.isArray(schema.prefixItems)) {
    if (schema.prefixItems.some(item => hasUnevaluatedProperties(item as JSONSchema))) {
      return true;
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      if (hasUnevaluatedProperties(schema[conditionalKey] as JSONSchema)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts unevaluatedProperties information from a schema
 * @param schema The schema to analyze
 * @returns Information about unevaluated properties handling
 */
export function extractUnevaluatedPropertiesInfo(schema: JSONSchema): {
  hasUnevaluatedProperties: boolean;
  hasUnevaluatedItems: boolean;
  unevaluatedPropertiesValue?: boolean | JSONSchema;
  unevaluatedItemsValue?: boolean | JSONSchema;
} {
  if (!schema || typeof schema !== 'object') {
    return { hasUnevaluatedProperties: false, hasUnevaluatedItems: false };
  }

  const result = {
    hasUnevaluatedProperties: 'unevaluatedProperties' in schema,
    hasUnevaluatedItems: 'unevaluatedItems' in schema,
    unevaluatedPropertiesValue: undefined as boolean | JSONSchema | undefined,
    unevaluatedItemsValue: undefined as boolean | JSONSchema | undefined,
  };

  if (result.hasUnevaluatedProperties) {
    result.unevaluatedPropertiesValue = (schema as any).unevaluatedProperties;
  }

  if (result.hasUnevaluatedItems) {
    result.unevaluatedItemsValue = (schema as any).unevaluatedItems;
  }

  return result;
}

/**
 * Validates unevaluatedProperties value
 * @param value The unevaluatedProperties value to validate
 * @param location Current location for error reporting
 * @throws Error if the value is invalid
 */
export function validateUnevaluatedPropertiesValue(value: any, location: string = 'schema'): void {
  if (typeof value === 'boolean') {
    // Boolean values are valid
    return;
  }

  if (value === null || value === undefined) {
    throw new Error(`Invalid unevaluatedProperties value at ${location}: cannot be null or undefined`);
  }

  if (typeof value !== 'object') {
    throw new Error(`Invalid unevaluatedProperties value at ${location}: must be boolean or schema object`);
  }

  // If it's an object, it should be a valid JSON Schema
  // We could add more detailed schema validation here if needed
}

/**
 * Creates a schema with unevaluatedProperties, ensuring proper validation
 * @param value The unevaluatedProperties value (boolean or schema)
 * @param baseSchema Base schema to extend
 * @returns JSON Schema with unevaluatedProperties
 */
export function createUnevaluatedPropertiesSchema(
  value: boolean | JSONSchema, 
  baseSchema: Partial<JSONSchema> = {}
): JSONSchema {
  validateUnevaluatedPropertiesValue(value);
  
  return {
    ...baseSchema,
    unevaluatedProperties: value
  } as JSONSchema;
}

/**
 * Determines if unevaluatedProperties conflicts with additionalProperties
 * @param schema Schema to check
 * @returns Conflict information
 */
export function checkUnevaluatedPropertiesConflict(schema: JSONSchema): {
  hasConflict: boolean;
  conflictType?: 'boolean-mismatch' | 'schema-override' | 'complex';
  resolution?: string;
} {
  if (!schema || typeof schema !== 'object') {
    return { hasConflict: false };
  }

  const hasAdditionalProps = 'additionalProperties' in schema;
  const hasUnevaluatedProps = 'unevaluatedProperties' in schema;

  if (!hasAdditionalProps || !hasUnevaluatedProps) {
    return { hasConflict: false };
  }

  const additionalProps = (schema as any).additionalProperties;
  const unevaluatedProps = (schema as any).unevaluatedProperties;

  // Both are booleans
  if (typeof additionalProps === 'boolean' && typeof unevaluatedProps === 'boolean') {
    if (additionalProps !== unevaluatedProps) {
      return {
        hasConflict: true,
        conflictType: 'boolean-mismatch',
        resolution: 'unevaluatedProperties takes precedence as it is more specific'
      };
    }
    return { hasConflict: false };
  }

  // One is boolean, other is schema
  if (typeof additionalProps !== typeof unevaluatedProps) {
    return {
      hasConflict: true,
      conflictType: 'schema-override',
      resolution: 'Schema-based constraint takes precedence over boolean'
    };
  }

  // Both are schemas - this is complex and may need careful handling
  return {
    hasConflict: true,
    conflictType: 'complex',
    resolution: 'Both define schema constraints - manual review recommended'
  };
}