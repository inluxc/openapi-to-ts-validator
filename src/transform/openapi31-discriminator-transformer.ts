/**
 * OpenAPI 3.1 discriminator transformer
 * Handles enhanced discriminator functionality including mapping inference and nested discriminators
 */

import type { JSONSchema } from "json-schema-to-typescript";

export interface DiscriminatorInfo {
  /** The discriminator property name */
  propertyName: string;
  /** Explicit mapping from discriminator values to schema references */
  mapping?: Record<string, string>;
  /** Inferred mapping when explicit mapping is not provided */
  inferredMapping?: Record<string, string>;
  /** Whether this discriminator is nested within another schema */
  isNested?: boolean;
  /** Location of the discriminator for error reporting */
  location?: string;
}

export interface DiscriminatorTransformResult {
  /** The transformed schema */
  schema: JSONSchema;
  /** Whether the schema was modified */
  wasTransformed: boolean;
  /** Information about discriminators found and processed */
  discriminators?: DiscriminatorInfo[];
}

/**
 * Transforms OpenAPI 3.1 discriminator schemas to enhanced discriminated union types
 * @param schema The JSON Schema to transform
 * @param location Current location in schema for error reporting
 * @returns Transformation result
 */
export function transformDiscriminators(schema: JSONSchema, location: string = '#/'): DiscriminatorTransformResult {
  if (!schema || typeof schema !== 'object') {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  let wasTransformed = false;
  const discriminators: DiscriminatorInfo[] = [];

  // Handle discriminator in oneOf/anyOf schemas
  if (transformed.discriminator && (transformed.oneOf || transformed.anyOf)) {
    const discriminatorResult = processDiscriminator(
      transformed,
      transformed.discriminator,
      location
    );
    
    if (discriminatorResult.wasTransformed) {
      Object.assign(transformed, discriminatorResult.schema);
      wasTransformed = true;
      if (discriminatorResult.discriminatorInfo) {
        discriminators.push(discriminatorResult.discriminatorInfo);
      }
    }
  }

  // Handle discriminator in allOf schemas (inheritance scenarios)
  if (transformed.discriminator && transformed.allOf) {
    const discriminatorResult = processInheritanceDiscriminator(
      transformed,
      transformed.discriminator,
      location
    );
    
    if (discriminatorResult.wasTransformed) {
      Object.assign(transformed, discriminatorResult.schema);
      wasTransformed = true;
      if (discriminatorResult.discriminatorInfo) {
        discriminators.push(discriminatorResult.discriminatorInfo);
      }
    }
  }

  // Recursively transform nested schemas
  const nestedResults = transformNestedSchemas(transformed, location);
  if (nestedResults.wasTransformed) {
    Object.assign(transformed, nestedResults.schema);
    wasTransformed = true;
    discriminators.push(...(nestedResults.discriminators || []));
  }

  return {
    schema: transformed,
    wasTransformed,
    discriminators: discriminators.length > 0 ? discriminators : undefined
  };
}

/**
 * Processes discriminator in oneOf/anyOf schemas
 */
function processDiscriminator(
  schema: JSONSchema,
  discriminator: any,
  location: string
): DiscriminatorTransformResult & { discriminatorInfo?: DiscriminatorInfo } {
  if (!discriminator || typeof discriminator !== 'object' || !discriminator.propertyName) {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  const propertyName = discriminator.propertyName;
  const explicitMapping = discriminator.mapping;
  
  // Get the union schemas (oneOf or anyOf)
  const unionSchemas = (transformed.oneOf || transformed.anyOf) as JSONSchema[];
  if (!Array.isArray(unionSchemas) || unionSchemas.length === 0) {
    return { schema, wasTransformed: false };
  }

  // Infer mapping if not explicitly provided
  const mapping = explicitMapping || inferDiscriminatorMapping(unionSchemas, propertyName, location);
  
  // Enhance union schemas with discriminator information
  const enhancedSchemas = enhanceUnionSchemasWithDiscriminator(
    unionSchemas,
    propertyName,
    mapping,
    location
  );

  // Update the schema with enhanced union schemas
  if (transformed.oneOf) {
    transformed.oneOf = enhancedSchemas;
  } else if (transformed.anyOf) {
    transformed.anyOf = enhancedSchemas;
  }

  // Add discriminator metadata for TypeScript generation
  (transformed as any)['x-discriminator-enhanced'] = {
    propertyName,
    mapping,
    location
  };

  const discriminatorInfo: DiscriminatorInfo = {
    propertyName,
    mapping: explicitMapping,
    inferredMapping: explicitMapping ? undefined : mapping,
    location
  };

  return {
    schema: transformed,
    wasTransformed: true,
    discriminatorInfo
  };
}

/**
 * Processes discriminator in allOf schemas (inheritance scenarios)
 */
function processInheritanceDiscriminator(
  schema: JSONSchema,
  discriminator: any,
  location: string
): DiscriminatorTransformResult & { discriminatorInfo?: DiscriminatorInfo } {
  if (!discriminator || typeof discriminator !== 'object' || !discriminator.propertyName) {
    return { schema, wasTransformed: false };
  }

  const transformed = { ...schema };
  const propertyName = discriminator.propertyName;
  
  // For inheritance scenarios, we need to ensure the discriminator property
  // is properly defined in the base schema
  if (!transformed.properties) {
    transformed.properties = {};
  }

  // Add discriminator property if not already present
  if (!transformed.properties[propertyName]) {
    transformed.properties[propertyName] = {
      type: 'string',
      description: `Discriminator property for ${location}`
    };
  }

  // Ensure discriminator property is required
  if (!transformed.required) {
    transformed.required = [];
  }
  if (Array.isArray(transformed.required) && !transformed.required.includes(propertyName)) {
    transformed.required.push(propertyName);
  }

  // Add discriminator metadata
  (transformed as any)['x-discriminator-enhanced'] = {
    propertyName,
    mapping: discriminator.mapping,
    location,
    isInheritance: true
  };

  const discriminatorInfo: DiscriminatorInfo = {
    propertyName,
    mapping: discriminator.mapping,
    location,
    isNested: false
  };

  return {
    schema: transformed,
    wasTransformed: true,
    discriminatorInfo
  };
}

/**
 * Infers discriminator mapping from union schemas when explicit mapping is not provided
 */
function inferDiscriminatorMapping(
  unionSchemas: JSONSchema[],
  propertyName: string,
  location: string
): Record<string, string> {
  const mapping: Record<string, string> = {};

  unionSchemas.forEach((unionSchema, index) => {
    if (!unionSchema || typeof unionSchema !== 'object') {
      return;
    }

    let discriminatorValue: string | undefined;
    let schemaRef: string | undefined;

    // Check if schema has a $ref
    if (unionSchema.$ref) {
      schemaRef = unionSchema.$ref;
      // Extract schema name from $ref (e.g., "#/components/schemas/Cat" -> "Cat")
      const refParts = unionSchema.$ref.split('/');
      discriminatorValue = refParts[refParts.length - 1];
    }
    // Check if discriminator property has a const value
    else if (unionSchema.properties && unionSchema.properties[propertyName]) {
      const discriminatorProp = unionSchema.properties[propertyName] as any;
      if (discriminatorProp.const) {
        discriminatorValue = String(discriminatorProp.const);
      } else if (discriminatorProp.enum && discriminatorProp.enum.length === 1) {
        discriminatorValue = String(discriminatorProp.enum[0]);
      }
    }
    // Check if schema has a title that can be used as discriminator value
    else if (unionSchema.title) {
      discriminatorValue = unionSchema.title;
    }

    // If we found a discriminator value, add it to the mapping
    if (discriminatorValue) {
      const targetRef = schemaRef || `${location}/unionSchemas/${index}`;
      mapping[discriminatorValue] = targetRef;
    }
  });

  return mapping;
}

/**
 * Enhances union schemas with discriminator information
 */
function enhanceUnionSchemasWithDiscriminator(
  unionSchemas: JSONSchema[],
  propertyName: string,
  mapping: Record<string, string>,
  location: string
): JSONSchema[] {
  return unionSchemas.map((unionSchema, index) => {
    if (!unionSchema || typeof unionSchema !== 'object') {
      return unionSchema;
    }

    const enhanced = { ...unionSchema };

    // Find the discriminator value for this schema
    let discriminatorValue: string | undefined;
    
    // Check mapping first
    for (const [value, ref] of Object.entries(mapping)) {
      if (ref === unionSchema.$ref || ref.endsWith(`/${index}`)) {
        discriminatorValue = value;
        break;
      }
    }

    // If not found in mapping, try to infer from schema
    if (!discriminatorValue) {
      if (unionSchema.$ref) {
        const refParts = unionSchema.$ref.split('/');
        discriminatorValue = refParts[refParts.length - 1];
      } else if (unionSchema.title) {
        discriminatorValue = unionSchema.title;
      }
    }

    // Ensure discriminator property is properly defined in the schema
    if (discriminatorValue && !enhanced.$ref) {
      if (!enhanced.properties) {
        enhanced.properties = {};
      }

      // Add or enhance discriminator property
      enhanced.properties[propertyName] = {
        type: 'string',
        const: discriminatorValue,
        description: `Discriminator value for this variant`
      };

      // Ensure discriminator property is required
      if (!enhanced.required) {
        enhanced.required = [];
      }
      if (Array.isArray(enhanced.required) && !enhanced.required.includes(propertyName)) {
        enhanced.required.push(propertyName);
      }
    }

    return enhanced;
  });
}

/**
 * Recursively transforms nested schemas for discriminators
 */
function transformNestedSchemas(schema: JSONSchema, location: string): DiscriminatorTransformResult {
  const transformed = { ...schema };
  let wasTransformed = false;
  const discriminators: DiscriminatorInfo[] = [];

  // Transform properties
  if (transformed.properties) {
    for (const [key, prop] of Object.entries(transformed.properties)) {
      const result = transformDiscriminators(prop as JSONSchema, `${location}/properties/${key}`);
      if (result.wasTransformed) {
        transformed.properties[key] = result.schema;
        wasTransformed = true;
        if (result.discriminators) {
          discriminators.push(...result.discriminators.map(d => ({ ...d, isNested: true })));
        }
      }
    }
  }

  // Transform items
  if (transformed.items) {
    if (Array.isArray(transformed.items)) {
      transformed.items = transformed.items.map((item, index) => {
        const result = transformDiscriminators(item as JSONSchema, `${location}/items/${index}`);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.discriminators) {
            discriminators.push(...result.discriminators.map(d => ({ ...d, isNested: true })));
          }
        }
        return result.schema;
      });
    } else {
      const result = transformDiscriminators(transformed.items as JSONSchema, `${location}/items`);
      if (result.wasTransformed) {
        transformed.items = result.schema;
        wasTransformed = true;
        if (result.discriminators) {
          discriminators.push(...result.discriminators.map(d => ({ ...d, isNested: true })));
        }
      }
    }
  }

  // Transform additionalProperties
  if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
    const result = transformDiscriminators(
      transformed.additionalProperties as JSONSchema,
      `${location}/additionalProperties`
    );
    if (result.wasTransformed) {
      transformed.additionalProperties = result.schema;
      wasTransformed = true;
      if (result.discriminators) {
        discriminators.push(...result.discriminators.map(d => ({ ...d, isNested: true })));
      }
    }
  }

  // Transform combiners (allOf, anyOf, oneOf)
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(transformed[combiner])) {
      transformed[combiner] = (transformed[combiner] as JSONSchema[]).map((subSchema, index) => {
        const result = transformDiscriminators(subSchema, `${location}/${combiner}/${index}`);
        if (result.wasTransformed) {
          wasTransformed = true;
          if (result.discriminators) {
            discriminators.push(...result.discriminators.map(d => ({ ...d, isNested: true })));
          }
        }
        return result.schema;
      });
    }
  }

  return {
    schema: transformed,
    wasTransformed,
    discriminators: discriminators.length > 0 ? discriminators : undefined
  };
}

/**
 * Checks if a schema contains discriminators that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains discriminators
 */
export function hasDiscriminators(schema: JSONSchema): boolean {
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Check for direct discriminator
  if (schema.discriminator) {
    return true;
  }

  // Check nested schemas
  if (schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      if (hasDiscriminators(prop as JSONSchema)) {
        return true;
      }
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      if (schema.items.some(item => hasDiscriminators(item as JSONSchema))) {
        return true;
      }
    } else if (hasDiscriminators(schema.items as JSONSchema)) {
      return true;
    }
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    if (hasDiscriminators(schema.additionalProperties as JSONSchema)) {
      return true;
    }
  }

  // Check combiners
  for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (Array.isArray(schema[combiner])) {
      if ((schema[combiner] as JSONSchema[]).some(subSchema => hasDiscriminators(subSchema))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts discriminator information from a schema
 * @param schema The schema to analyze
 * @returns Array of discriminator information
 */
export function extractDiscriminatorInfo(schema: JSONSchema): DiscriminatorInfo[] {
  const result = transformDiscriminators(schema);
  return result.discriminators || [];
}

/**
 * Validates discriminator configuration
 * @param discriminator The discriminator object to validate
 * @param location Current location for error reporting
 * @throws Error if discriminator configuration is invalid
 */
import { DiscriminatorError, loggers } from '../errors';

export function validateDiscriminator(discriminator: any, location: string): void {
  loggers.discriminator.debug(`Validating discriminator at ${location}`);
  
  if (!discriminator || typeof discriminator !== 'object') {
    throw new DiscriminatorError(
      location,
      'must be an object',
      'Ensure discriminator is defined as an object with at least a propertyName field'
    );
  }

  if (!discriminator.propertyName || typeof discriminator.propertyName !== 'string') {
    throw new DiscriminatorError(
      location,
      'propertyName must be a non-empty string',
      'Add a propertyName field with the name of the property used for discrimination'
    );
  }

  if (discriminator.mapping && typeof discriminator.mapping !== 'object') {
    throw new DiscriminatorError(
      location,
      'mapping must be an object',
      'Ensure mapping is an object with string keys and values, or remove it to use implicit mapping'
    );
  }

  if (discriminator.mapping) {
    for (const [key, value] of Object.entries(discriminator.mapping)) {
      if (typeof value !== 'string') {
        throw new DiscriminatorError(
          location,
          `mapping value for '${key}' must be a string`,
          'All mapping values must be strings pointing to schema references'
        );
      }
    }
  }
  
  loggers.discriminator.debug(`Discriminator validation passed at ${location}`);
}