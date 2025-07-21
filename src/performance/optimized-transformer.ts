/**
 * Optimized transformer with caching and performance optimizations for OpenAPI 3.1
 */

import type { JSONSchema } from "json-schema-to-typescript";
import type { OpenAPIVersionInfo } from "../version-detection";
import type { OpenAPI31ParseOptions } from "../GenerateOptions";

import { 
  SchemaTransformationCache, 
  globalSchemaCache, 
  createSchemaHash, 
  createOptionsHash,
  type CacheKey,
  type TransformationType 
} from "./schema-cache";
import { globalProfiler } from "./profiler";

// Import existing transformers
import { transformNullTypes, hasNullTypes } from "../transform/openapi31-null-transformer";
import { transformConstKeyword } from "../transform/openapi31-const-transformer";
import { transformPrefixItems } from "../transform/openapi31-prefixitems-transformer";
import { transformConditionalSchemas, hasConditionalSchemas } from "../transform/openapi31-conditional-transformer";
import { transformDiscriminators, hasDiscriminators } from "../transform/openapi31-discriminator-transformer";
import { transformUnevaluatedProperties } from "../transform/openapi31-unevaluatedproperties-transformer";
import { transformContains } from "../transform/openapi31-contains-transformer";

export interface OptimizedTransformOptions {
  /** Whether to use caching */
  useCache?: boolean;
  /** Whether to enable profiling */
  enableProfiling?: boolean;
  /** Whether to skip transformations that don't apply */
  skipUnnecessaryTransforms?: boolean;
  /** Custom cache instance */
  cache?: SchemaTransformationCache;
}

export interface TransformationResult<T = any> {
  /** The transformed result */
  result: T;
  /** Whether the result came from cache */
  fromCache: boolean;
  /** Time taken for transformation in milliseconds */
  duration: number;
  /** Which transformations were applied */
  appliedTransformations: TransformationType[];
}

/**
 * Optimized transformer that applies caching and performance optimizations
 */
export class OptimizedSchemaTransformer {
  private cache: SchemaTransformationCache;
  private options: Required<OptimizedTransformOptions>;

  constructor(options: OptimizedTransformOptions = {}) {
    this.options = {
      useCache: options.useCache ?? true,
      enableProfiling: options.enableProfiling ?? false,
      skipUnnecessaryTransforms: options.skipUnnecessaryTransforms ?? true,
      cache: options.cache ?? globalSchemaCache
    };
    
    this.cache = this.options.cache;
    
    if (this.options.enableProfiling) {
      globalProfiler.setEnabled(true);
    }
  }

  /**
   * Applies all OpenAPI 3.1 transformations with caching and optimization
   */
  transformSchema(
    schema: JSONSchema,
    version: OpenAPIVersionInfo,
    parseOptions?: OpenAPI31ParseOptions
  ): TransformationResult<JSONSchema> {
    const startTime = performance.now();
    
    return globalProfiler.time('optimized-transform-schema', () => {
      const schemaHash = createSchemaHash(schema);
      const optionsHash = createOptionsHash(parseOptions);
      
      const cacheKey: CacheKey = {
        schemaHash,
        version,
        optionsHash,
        transformationType: 'full-schema'
      };

      // Try to get from cache first
      if (this.options.useCache) {
        const cached = this.cache.get<JSONSchema>(cacheKey);
        if (cached) {
          return {
            result: cached,
            fromCache: true,
            duration: performance.now() - startTime,
            appliedTransformations: ['full-schema']
          };
        }
      }

      // Apply transformations
      const transformResult = this.applyTransformations(schema, parseOptions);
      
      // Cache the result
      if (this.options.useCache) {
        this.cache.set(cacheKey, transformResult.result);
      }

      return {
        ...transformResult,
        fromCache: false,
        duration: performance.now() - startTime
      };
    });
  }

  /**
   * Applies individual transformation with caching
   */
  applyTransformation<T>(
    schema: JSONSchema,
    transformationType: TransformationType,
    transformer: (schema: JSONSchema) => T,
    version: OpenAPIVersionInfo,
    parseOptions?: OpenAPI31ParseOptions
  ): TransformationResult<T> {
    const startTime = performance.now();
    
    return globalProfiler.time(`transform-${transformationType}`, () => {
      const schemaHash = createSchemaHash(schema);
      const optionsHash = createOptionsHash(parseOptions);
      
      const cacheKey: CacheKey = {
        schemaHash,
        version,
        optionsHash,
        transformationType
      };

      // Try to get from cache first
      if (this.options.useCache) {
        const cached = this.cache.get<T>(cacheKey);
        if (cached) {
          return {
            result: cached,
            fromCache: true,
            duration: performance.now() - startTime,
            appliedTransformations: [transformationType]
          };
        }
      }

      // Apply transformation
      const result = transformer(schema);
      
      // Cache the result
      if (this.options.useCache) {
        this.cache.set(cacheKey, result);
      }

      return {
        result,
        fromCache: false,
        duration: performance.now() - startTime,
        appliedTransformations: [transformationType]
      };
    });
  }

  /**
   * Applies all transformations in optimized order
   */
  private applyTransformations(
    schema: JSONSchema,
    parseOptions?: OpenAPI31ParseOptions
  ): { result: JSONSchema; appliedTransformations: TransformationType[] } {
    let transformedSchema = schema;
    const appliedTransformations: TransformationType[] = [];

    // Skip transformations that don't apply to save processing time
    if (this.options.skipUnnecessaryTransforms) {
      return this.applyOptimizedTransformations(transformedSchema, parseOptions);
    }

    // Apply all transformations (legacy behavior)
    return this.applyAllTransformations(transformedSchema, parseOptions);
  }

  /**
   * Applies only necessary transformations based on schema analysis
   */
  private applyOptimizedTransformations(
    schema: JSONSchema,
    parseOptions?: OpenAPI31ParseOptions
  ): { result: JSONSchema; appliedTransformations: TransformationType[] } {
    let transformedSchema = schema;
    const appliedTransformations: TransformationType[] = [];

    // Analyze schema to determine which transformations are needed
    const needsNullTransform = this.needsNullTypeTransformation(schema, parseOptions);
    const needsConditionalTransform = this.needsConditionalTransformation(schema, parseOptions);
    const needsDiscriminatorTransform = this.needsDiscriminatorTransformation(schema, parseOptions);
    const needsConstTransform = this.needsConstTransformation(schema, parseOptions);
    const needsPrefixItemsTransform = this.needsPrefixItemsTransformation(schema, parseOptions);
    const needsContainsTransform = this.needsContainsTransformation(schema, parseOptions);
    const needsUnevaluatedTransform = this.needsUnevaluatedPropertiesTransformation(schema, parseOptions);

    // Apply transformations in optimal order (dependencies first)
    
    // 1. Null types (affects type generation)
    if (needsNullTransform) {
      const result = transformNullTypes(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('null-types');
      }
    }

    // 2. Const keyword (simple transformation)
    if (needsConstTransform) {
      const result = transformConstKeyword(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('const-keyword');
      }
    }

    // 3. PrefixItems (affects array types)
    if (needsPrefixItemsTransform) {
      const result = transformPrefixItems(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('prefix-items');
      }
    }

    // 4. Contains (affects array validation)
    if (needsContainsTransform) {
      const result = transformContains(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('contains');
      }
    }

    // 5. Conditional schemas (complex transformation)
    if (needsConditionalTransform) {
      const result = transformConditionalSchemas(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('conditional');
      }
    }

    // 6. Discriminators (affects union types)
    if (needsDiscriminatorTransform) {
      const result = transformDiscriminators(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('discriminator');
      }
    }

    // 7. UnevaluatedProperties (affects object validation)
    if (needsUnevaluatedTransform) {
      const result = transformUnevaluatedProperties(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push('unevaluated-properties');
      }
    }

    return { result: transformedSchema, appliedTransformations };
  }

  /**
   * Applies all transformations (legacy behavior for compatibility)
   */
  private applyAllTransformations(
    schema: JSONSchema,
    parseOptions?: OpenAPI31ParseOptions
  ): { result: JSONSchema; appliedTransformations: TransformationType[] } {
    let transformedSchema = schema;
    const appliedTransformations: TransformationType[] = [];

    // Apply all transformations in order
    const transformations = [
      { type: 'null-types' as const, fn: transformNullTypes },
      { type: 'const-keyword' as const, fn: transformConstKeyword },
      { type: 'prefix-items' as const, fn: transformPrefixItems },
      { type: 'contains' as const, fn: transformContains },
      { type: 'conditional' as const, fn: transformConditionalSchemas },
      { type: 'discriminator' as const, fn: transformDiscriminators },
      { type: 'unevaluated-properties' as const, fn: transformUnevaluatedProperties }
    ];

    for (const { type, fn } of transformations) {
      const result = fn(transformedSchema);
      if (result.wasTransformed) {
        transformedSchema = result.schema;
        appliedTransformations.push(type);
      }
    }

    return { result: transformedSchema, appliedTransformations };
  }

  // Optimization: Check if transformations are needed

  private needsNullTypeTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.strictNullHandling !== false && hasNullTypes(schema);
  }

  private needsConditionalTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.enableConditionalSchemas !== false && hasConditionalSchemas(schema);
  }

  private needsDiscriminatorTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.enableEnhancedDiscriminator !== false && hasDiscriminators(schema);
  }

  private needsConstTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.enableConstKeyword !== false && this.hasConstKeyword(schema);
  }

  private needsPrefixItemsTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.enablePrefixItems !== false && this.hasPrefixItems(schema);
  }

  private needsContainsTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.enableContainsKeyword !== false && this.hasContains(schema);
  }

  private needsUnevaluatedPropertiesTransformation(schema: JSONSchema, options?: OpenAPI31ParseOptions): boolean {
    return options?.enableUnevaluatedProperties !== false && this.hasUnevaluatedProperties(schema);
  }

  // Helper methods to check for specific features

  private hasConstKeyword(schema: JSONSchema): boolean {
    if (!schema || typeof schema !== 'object') return false;
    
    if ('const' in schema) return true;
    
    // Check nested schemas
    return this.checkNestedSchemas(schema, (s) => this.hasConstKeyword(s));
  }

  private hasPrefixItems(schema: JSONSchema): boolean {
    if (!schema || typeof schema !== 'object') return false;
    
    if ('prefixItems' in schema) return true;
    
    return this.checkNestedSchemas(schema, (s) => this.hasPrefixItems(s));
  }

  private hasContains(schema: JSONSchema): boolean {
    if (!schema || typeof schema !== 'object') return false;
    
    if ('contains' in schema) return true;
    
    return this.checkNestedSchemas(schema, (s) => this.hasContains(s));
  }

  private hasUnevaluatedProperties(schema: JSONSchema): boolean {
    if (!schema || typeof schema !== 'object') return false;
    
    if ('unevaluatedProperties' in schema) return true;
    
    return this.checkNestedSchemas(schema, (s) => this.hasUnevaluatedProperties(s));
  }

  private checkNestedSchemas(schema: JSONSchema, predicate: (s: JSONSchema) => boolean): boolean {
    if (!schema || typeof schema !== 'object') return false;

    // Check properties
    if (schema.properties) {
      for (const prop of Object.values(schema.properties)) {
        if (predicate(prop as JSONSchema)) return true;
      }
    }

    // Check items
    if (schema.items) {
      if (Array.isArray(schema.items)) {
        if (schema.items.some(item => predicate(item as JSONSchema))) return true;
      } else if (predicate(schema.items as JSONSchema)) {
        return true;
      }
    }

    // Check additionalProperties
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      if (predicate(schema.additionalProperties as JSONSchema)) return true;
    }

    // Check combiners
    for (const combiner of ['allOf', 'anyOf', 'oneOf'] as const) {
      if (Array.isArray(schema[combiner])) {
        if ((schema[combiner] as JSONSchema[]).some(predicate)) return true;
      }
    }

    return false;
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Evicts expired cache entries
   */
  evictExpiredCache(): number {
    return this.cache.evictExpired();
  }
}

/**
 * Global optimized transformer instance
 */
export const globalOptimizedTransformer = new OptimizedSchemaTransformer({
  useCache: true,
  enableProfiling: false,
  skipUnnecessaryTransforms: true
});