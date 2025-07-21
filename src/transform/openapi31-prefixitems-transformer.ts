/**
 * OpenAPI 3.1 prefixItems transformer
 * Handles conversion of prefixItems to TypeScript tuple types and AJV validation
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface PrefixItemsTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Tuple type information that was created */
  tupleInfo?: TupleTypeInfo;
}

export interface TupleTypeInfo {
  /** The schemas for each tuple position */
  prefixItems: JSONSchema[];
  /** Whether additional items are allowed */
  additionalItems?: boolean | JSONSchema;
  /** The minimum number of items (based on prefixItems length) */
  minItems?: number;
  /** The maximum number of items (if additionalItems is false) */
  maxItems?: number;
}

/**
 * Transforms OpenAPI 3.1 prefixItems to compatible JSON Schema for tuple type generation
 * @param schema The JSON Schema to transform
 * @returns Transformation result
 */
export function transformPrefixItems(schema: JSONSchema): PrefixItemsTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  let tupleInfo: TupleTypeInfo | undefined;

  // Handle prefixItems
  if (Array.isArray(transformed.prefixItems)) {
    const prefixItems = transformed.prefixItems as JSONSchema[];
    
    // Validate prefixItems array
    if (prefixItems.length === 0) {
      // Empty prefixItems array is valid but doesn't create a tuple
      delete transformed.prefixItems;
      wasTransformed = true;
      return { schema: transformed, wasTransformed };
    }

    // Create tuple type information
    tupleInfo = {
      prefixItems: [...prefixItems],
      minItems: prefixItems.length
    };

    // Handle additionalItems/items interaction
    if ('items' in transformed) {
      if (transformed.items === false || (typeof transformed.items === 'boolean' && !transformed.items)) {
        // No additional items allowed - fixed tuple
        tupleInfo.additionalItems = false;
        tupleInfo.maxItems = prefixItems.length;
        
        // For JSON Schema compatibility, convert to items array
        transformed.items = prefixItems;
        transformed.minItems = prefixItems.length;
        transformed.maxItems = prefixItems.length;
      } else if (typeof transformed.items === 'object') {
        // Additional items allowed with schema
        tupleInfo.additionalItems = transformed.items as JSONSchema;
        
        // Convert to JSON Schema Draft 7 compatible format
        // Use items array for prefix items and additionalItems for the rest
        transformed.items = prefixItems;
        transformed.additionalItems = tupleInfo.additionalItems;
        transformed.minItems = prefixItems.length;
      } else if (transformed.items === true) {
        // Additional items allowed (any type)
        tupleInfo.additionalItems = true;
        
        transformed.items = prefixItems;
        transformed.additionalItems = true;
        transformed.minItems = prefixItems.length;
      }
    } else {
      // No items property - default behavior depends on additionalItems
      if ('additionalItems' in transformed) {
        tupleInfo.additionalItems = transformed.additionalItems as boolean | JSONSchema;
        
        if (transformed.additionalItems === false) {
          // Fixed tuple
          tupleInfo.maxItems = prefixItems.length;
          transformed.items = prefixItems;
          transformed.minItems = prefixItems.length;
          transformed.maxItems = prefixItems.length;
        } else {
          // Tuple with additional items
          transformed.items = prefixItems;
          transformed.minItems = prefixItems.length;
        }
      } else {
        // Default: additional items allowed
        tupleInfo.additionalItems = true;
        transformed.items = prefixItems;
        transformed.additionalItems = true;
        transformed.minItems = prefixItems.length;
      }
    }

    // Remove prefixItems as it's not supported in JSON Schema Draft 7
    delete transformed.prefixItems;
    wasTransformed = true;
  }

  // Recursively transform nested schemas
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformPrefixItems(prop as JSONSchema);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
      }
    }
  }

  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      // Items is already an array (possibly from prefixItems transformation)
      // Transform each item schema
      transformed.items = transformed.items.map((item: any) => {
        const result = transformPrefixItems(item as JSONSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
        }
        return result.schema;
      });
    } else if (typeof transformed.items === 'object') {
      const result = transformPrefixItems(transformed.items as JSONSchema);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
      }
    }
  }

  if (transformed.additionalItems && typeof transformed.additionalItems === 'object') {
    const result = transformPrefixItems(transformed.additionalItems as JSONSchema);
    if (result.wasTransformed) {
      transformed.additionalItems = result.schema;
      wasTransformed = true;
    }
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map(subSchema => {
        const result = transformPrefixItems(subSchema);
        if (result.wasTransformed) {
          wasTransformed = true;
        }
        return result.schema;
      });
    }
  }

  // Handle conditional schemas (if/then/else)
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (transformed[conditionalKey] && typeof transformed[conditionalKey] === 'object') {
      const result = transformPrefixItems(transformed[conditionalKey] as JSONSchema);
      if (result.wasTransformed) {
        transformed[conditionalKey] = result.schema;
        wasTransformed = true;
      }
    }
  }

  return {
    schema: transformed,
    wasTransformed,
    tupleInfo
  };
}

/**
 * Checks if a schema contains prefixItems that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains prefixItems
 */
export function hasPrefixItems(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check for prefixItems
  if (Array.isArray(schema.prefixItems)) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasPrefixItems(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasPrefixItems(item as JSONSchema))) {
        return true;
      }
    } else if (typeof schema.items === 'object' && hasPrefixItems(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalItems && typeof schema.additionalItems === 'object') {
    if (hasPrefixItems(schema.additionalItems as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasPrefixItems(subSchema))) {
        return true;
      }
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      if (hasPrefixItems(schema[conditionalKey] as JSONSchema)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts tuple type information from a schema
 * @param schema The schema to analyze
 * @returns Array of tuple type information found in the schema
 */
export function extractTupleInfo(schema: JSONSchema): TupleTypeInfo[] {
  if (!schema || typeof schema !== 'object') {
    return [];
  }

  const tupleInfos: TupleTypeInfo[] = [];

  // Check for converted tuple (items array with minItems/maxItems)
  if (Array.isArray(schema.items) && typeof schema.minItems === 'number') {
    const tupleInfo: TupleTypeInfo = {
      prefixItems: schema.items as JSONSchema[],
      minItems: schema.minItems
    };

    if (typeof schema.maxItems === 'number' && schema.maxItems === schema.minItems) {
      // Fixed tuple
      tupleInfo.maxItems = schema.maxItems;
      tupleInfo.additionalItems = false;
    } else if ('additionalItems' in schema) {
      tupleInfo.additionalItems = schema.additionalItems as boolean | JSONSchema;
    } else {
      tupleInfo.additionalItems = true;
    }

    tupleInfos.push(tupleInfo);
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      tupleInfos.push(...extractTupleInfo(prop as JSONSchema));
    }
  }

  if (schema.items && !Array.isArray(schema.items) && typeof schema.items === 'object') {
    tupleInfos.push(...extractTupleInfo(schema.items as JSONSchema));
  }

  if (schema.additionalItems && typeof schema.additionalItems === 'object') {
    tupleInfos.push(...extractTupleInfo(schema.additionalItems as JSONSchema));
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      for (const subSchema of schema[combiner] as JSONSchema[]) {
        tupleInfos.push(...extractTupleInfo(subSchema));
      }
    }
  }

  // Check conditional schemas
  for (const conditionalKey of ['if', 'then', 'else'] as const) {
    if (schema[conditionalKey] && typeof schema[conditionalKey] === 'object') {
      tupleInfos.push(...extractTupleInfo(schema[conditionalKey] as JSONSchema));
    }
  }

  return tupleInfos;
}

/**
 * Validates prefixItems configuration
 * @param prefixItems The prefixItems array to validate
 * @param items The items property (if present)
 * @param additionalItems The additionalItems property (if present)
 * @throws Error if the configuration is invalid
 */
export function validatePrefixItemsConfig(
  prefixItems: JSONSchema[],
  items?: boolean | JSONSchema | JSONSchema[],
  additionalItems?: boolean | JSONSchema
): void {
  if (!Array.isArray(prefixItems)) {
    throw new Error('prefixItems must be an array of schemas');
  }

  if (prefixItems.length === 0) {
    throw new Error('prefixItems array cannot be empty');
  }

  // Validate each prefix item is a valid schema
  prefixItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`prefixItems[${index}] must be a valid schema object`);
    }
  });

  // Validate items/additionalItems interaction
  if (Array.isArray(items)) {
    throw new Error('Cannot use both prefixItems and items array - use prefixItems with additionalItems instead');
  }

  if (items === false && additionalItems !== undefined) {
    throw new Error('Cannot specify additionalItems when items is false');
  }
}

/**
 * Creates a tuple schema with prefixItems
 * @param prefixItems Array of schemas for each tuple position
 * @param options Additional options for the tuple
 * @returns JSON Schema with prefixItems configuration
 */
export function createTupleSchema(
  prefixItems: JSONSchema[],
  options: {
    additionalItems?: boolean | JSONSchema;
    minItems?: number;
    maxItems?: number;
  } = {}
): JSONSchema {
  validatePrefixItemsConfig(prefixItems, options.additionalItems, options.additionalItems);

  const schema: JSONSchema = {
    type: 'array',
    prefixItems: [...prefixItems],
    minItems: options.minItems ?? prefixItems.length
  };

  if (options.additionalItems !== undefined) {
    if (options.additionalItems === false) {
      (schema as any).items = false;
      schema.maxItems = options.maxItems ?? prefixItems.length;
    } else {
      schema.additionalItems = options.additionalItems;
    }
  }

  if (options.maxItems !== undefined) {
    schema.maxItems = options.maxItems;
  }

  return schema;
}