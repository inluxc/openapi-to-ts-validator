/**
 * Version-specific processing logic to ensure backward compatibility
 * This module provides clear separation between OpenAPI 3.0 and 3.1 processing
 */

import type { JSONSchema } from "json-schema-to-typescript";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";
import type { OpenAPIVersionInfo } from "./version-detection";
import type { OpenAPI31ParseOptions } from "./GenerateOptions";
import { applyOpenAPI31Defaults } from "./options-validation";
import { globalOptimizedTransformer } from "./performance/optimized-transformer";
import { globalProfiler } from "./performance/profiler";

// Import OpenAPI 3.1 transformers
import { transformNullTypes } from "./transform/openapi31-null-transformer";
import { transformConstKeyword } from "./transform/openapi31-const-transformer";
import { transformPrefixItems } from "./transform/openapi31-prefixitems-transformer";
import { transformConditionalSchemas } from "./transform/openapi31-conditional-transformer";
import { transformDiscriminators } from "./transform/openapi31-discriminator-transformer";
import { transformUnevaluatedProperties } from "./transform/openapi31-unevaluatedproperties-transformer";
import { transformContains } from "./transform/openapi31-contains-transformer";

/**
 * Processes schema definitions based on OpenAPI version
 * This ensures backward compatibility by routing to appropriate processing logic
 */
export function processSchemaDefinitions(
  schemas: Record<string, any>,
  version: OpenAPIVersionInfo,
  options?: OpenAPI31ParseOptions
): Record<string, JSONSchema> {
  const definitions: Record<string, JSONSchema> = {};

  for (const [key, value] of Object.entries(schemas)) {
    if (version.isVersion30) {
      // OpenAPI 3.0 processing - use legacy path exactly as before
      definitions[key] = processOpenAPI30Schema(value);
    } else if (version.isVersion31) {
      // OpenAPI 3.1 processing - use new transformation pipeline
      definitions[key] = processOpenAPI31Schema(value, options, `#/components/schemas/${key}`);
    } else {
      // Fallback to OpenAPI 3.0 processing for unknown versions
      definitions[key] = processOpenAPI30Schema(value);
    }
  }

  return definitions;
}

/**
 * Processes OpenAPI 3.0 schema using the original, unchanged logic
 * This ensures complete backward compatibility
 */
function processOpenAPI30Schema(schema: any): JSONSchema {
  // Use the original toJsonSchema converter without any modifications
  // This preserves the exact behavior from before OpenAPI 3.1 support was added
  return toJsonSchema(schema);
}

/**
 * Processes OpenAPI 3.1 schema with all the new transformations
 * This is only called for OpenAPI 3.1 schemas
 */
function processOpenAPI31Schema(
  schema: any,
  options?: OpenAPI31ParseOptions,
  location: string = '#/'
): JSONSchema {
  return globalProfiler.time('process-openapi31-schema', () => {
    try {
      // Apply defaults to options for consistent behavior
      const normalizedOptions = applyOpenAPI31Defaults(options);
      
      // First preprocess OpenAPI 3.1 specific features
      const preprocessedSchema = preprocessOpenAPI31Features(schema, normalizedOptions, location);
      
      // Convert to JSON Schema using the existing converter
      let jsonSchema = toJsonSchema(preprocessedSchema);
      
      // Use optimized transformer for better performance
      const version = { version: '3.1.0', major: 3, minor: 1, isVersion31: true, isVersion30: false };
      const transformResult = globalOptimizedTransformer.transformSchema(jsonSchema, version, normalizedOptions);
      
      return transformResult.result;
    } catch (error) {
      // If OpenAPI 3.1 processing fails and fallback is enabled, use 3.0 processing
      if (options?.fallbackToOpenAPI30) {
        console.warn(`Warning: OpenAPI 3.1 processing failed for schema at ${location}. Falling back to OpenAPI 3.0 processing.`);
        return processOpenAPI30Schema(schema);
      }
      throw error;
    }
  });
}

/**
 * Applies all OpenAPI 3.1 transformations to a JSON schema
 */
function applyOpenAPI31Transformations(
  jsonSchema: JSONSchema,
  options: Required<OpenAPI31ParseOptions>
): JSONSchema {
  let transformedSchema = jsonSchema;

  // Apply null type transformations for OpenAPI 3.1
  if (options.strictNullHandling) {
    const transformResult = transformNullTypes(transformedSchema);
    if (transformResult.wasTransformed) {
      transformedSchema = transformResult.schema;
    }
  }
  
  // Apply const keyword transformations for OpenAPI 3.1
  if (options.enableConstKeyword) {
    const constTransformResult = transformConstKeyword(transformedSchema);
    if (constTransformResult.wasTransformed) {
      transformedSchema = constTransformResult.schema;
    }
  }
  
  // Apply prefixItems transformations for OpenAPI 3.1
  if (options.enablePrefixItems) {
    const prefixItemsTransformResult = transformPrefixItems(transformedSchema);
    if (prefixItemsTransformResult.wasTransformed) {
      transformedSchema = prefixItemsTransformResult.schema;
    }
  }
  
  // Apply conditional schema transformations for OpenAPI 3.1
  if (options.enableConditionalSchemas) {
    const conditionalTransformResult = transformConditionalSchemas(transformedSchema);
    if (conditionalTransformResult.wasTransformed) {
      transformedSchema = conditionalTransformResult.schema;
    }
  }
  
  // Apply discriminator transformations for OpenAPI 3.1
  if (options.enableEnhancedDiscriminator) {
    const discriminatorTransformResult = transformDiscriminators(transformedSchema);
    if (discriminatorTransformResult.wasTransformed) {
      transformedSchema = discriminatorTransformResult.schema;
    }
  }
  
  // Apply unevaluatedProperties transformations for OpenAPI 3.1
  if (options.enableUnevaluatedProperties) {
    const unevaluatedTransformResult = transformUnevaluatedProperties(transformedSchema);
    if (unevaluatedTransformResult.wasTransformed) {
      transformedSchema = unevaluatedTransformResult.schema;
    }
  }
  
  // Apply contains transformations for OpenAPI 3.1
  if (options.enableContainsKeyword) {
    const containsTransformResult = transformContains(transformedSchema);
    if (containsTransformResult.wasTransformed) {
      transformedSchema = containsTransformResult.schema;
    }
  }

  return transformedSchema;
}

/**
 * Preprocesses OpenAPI 3.1 specific features before JSON Schema conversion
 * This is only called for OpenAPI 3.1 schemas
 */
function preprocessOpenAPI31Features(
  schema: any,
  options: Required<OpenAPI31ParseOptions>,
  location: string = '#/'
): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const processed = { ...schema };

  // Handle type arrays (OpenAPI 3.1 null handling)
  if (options.strictNullHandling && Array.isArray(processed.type)) {
    processed.type = normalizeTypeArray(processed.type, location);
  }

  // Handle conditional schemas (if/then/else)
  if (options.enableConditionalSchemas) {
    if (processed.if || processed.then || processed.else) {
      validateConditionalSchema(processed, location);
    }
  }

  // Handle prefixItems (tuple types)
  if (options.enablePrefixItems && processed.prefixItems) {
    if (!Array.isArray(processed.prefixItems)) {
      throw new Error(`prefixItems must be an array of schemas at ${location}`);
    }
  }

  // Handle unevaluatedProperties
  if (options.enableUnevaluatedProperties && 'unevaluatedProperties' in processed) {
    if (typeof processed.unevaluatedProperties !== 'boolean' && 
        typeof processed.unevaluatedProperties !== 'object') {
      throw new Error(`unevaluatedProperties must be a boolean or schema object at ${location}`);
    }
  }

  // Handle contains keyword
  if (options.enableContainsKeyword && processed.contains) {
    if (typeof processed.contains !== 'object') {
      throw new Error(`contains must be a schema object at ${location}`);
    }
  }

  // Recursively process nested schemas
  if (processed.properties) {
    for (const [key, prop] of Object.entries(processed.properties)) {
      processed.properties[key] = preprocessOpenAPI31Features(
        prop,
        options,
        `${location}/properties/${key}`
      );
    }
  }

  if (processed.items) {
    if (Array.isArray(processed.items)) {
      processed.items = processed.items.map((item: any, index: number) =>
        preprocessOpenAPI31Features(item, options, `${location}/items/${index}`)
      );
    } else {
      processed.items = preprocessOpenAPI31Features(processed.items, options, `${location}/items`);
    }
  }

  if (processed.additionalProperties && typeof processed.additionalProperties === 'object') {
    processed.additionalProperties = preprocessOpenAPI31Features(
      processed.additionalProperties,
      options,
      `${location}/additionalProperties`
    );
  }

  // Handle allOf, anyOf, oneOf
  for (const combiner of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(processed[combiner])) {
      processed[combiner] = processed[combiner].map((subSchema: any, index: number) =>
        preprocessOpenAPI31Features(subSchema, options, `${location}/${combiner}/${index}`)
      );
    }
  }

  return processed;
}

/**
 * Normalizes type arrays to handle OpenAPI 3.1 null types
 */
function normalizeTypeArray(typeArray: string[], location: string): string | string[] {
  if (!Array.isArray(typeArray)) {
    return typeArray;
  }

  // Validate all types are strings
  if (!typeArray.every(type => typeof type === 'string')) {
    throw new Error(`All types in type array must be strings at ${location}`);
  }

  // Validate that all types are valid JSON Schema types
  const validTypes = ['null', 'boolean', 'object', 'array', 'number', 'string', 'integer'];
  const invalidTypes = typeArray.filter(type => !validTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw new Error(`Invalid types in type array: ${invalidTypes.join(', ')} at ${location}`);
  }

  // If only one type, return as string
  if (typeArray.length === 1) {
    return typeArray[0];
  }

  // Return the array for union type handling
  return typeArray;
}

/**
 * Validates conditional schema structure
 */
function validateConditionalSchema(schema: any, location: string): void {
  if (schema.if && typeof schema.if !== 'object') {
    throw new Error(`if clause must be a schema object at ${location}`);
  }

  if (schema.then && typeof schema.then !== 'object') {
    throw new Error(`then clause must be a schema object at ${location}`);
  }

  if (schema.else && typeof schema.else !== 'object') {
    throw new Error(`else clause must be a schema object at ${location}`);
  }

  // If there's an if, there should be at least a then or else
  if (schema.if && !schema.then && !schema.else) {
    throw new Error(`if clause requires at least a then or else clause at ${location}`);
  }
}

/**
 * Determines if OpenAPI 3.1 options should be ignored for a given version
 * This ensures that 3.1 options don't affect 3.0 processing
 */
export function shouldIgnoreOpenAPI31Options(version: OpenAPIVersionInfo): boolean {
  return version.isVersion30;
}

/**
 * Gets the appropriate processing mode based on version
 */
export function getProcessingMode(version: OpenAPIVersionInfo): 'openapi30' | 'openapi31' | 'fallback' {
  if (version.isVersion30) {
    return 'openapi30';
  } else if (version.isVersion31) {
    return 'openapi31';
  } else {
    return 'fallback';
  }
}