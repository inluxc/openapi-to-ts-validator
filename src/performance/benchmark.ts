/**
 * Benchmark suite for OpenAPI 3.1 performance testing
 */

import type { JSONSchema } from "json-schema-to-typescript";
import type { OpenAPIVersionInfo } from "../version-detection";
import type { OpenAPI31ParseOptions } from "../GenerateOptions";
import { parseVersionString } from "../version-detection";
import { OptimizedSchemaTransformer } from "./optimized-transformer";
import { SchemaTransformationCache } from "./schema-cache";
import { SchemaProfiler } from "./profiler";

// Import transformers for comparison
import { transformNullTypes } from "../transform/openapi31-null-transformer";
import { transformConstKeyword } from "../transform/openapi31-const-transformer";
import { transformPrefixItems } from "../transform/openapi31-prefixitems-transformer";
import { transformConditionalSchemas } from "../transform/openapi31-conditional-transformer";
import { transformDiscriminators } from "../transform/openapi31-discriminator-transformer";
import { transformUnevaluatedProperties } from "../transform/openapi31-unevaluatedproperties-transformer";
import { transformContains } from "../transform/openapi31-contains-transformer";

export interface BenchmarkOptions {
  /** Number of iterations to run */
  iterations?: number;
  /** Whether to warm up before benchmarking */
  warmup?: boolean;
  /** Number of warmup iterations */
  warmupIterations?: number;
  /** Whether to include memory usage measurements */
  measureMemory?: boolean;
  /** Whether to test with different schema sizes */
  testScalability?: boolean;
}

export interface BenchmarkResult {
  /** Name of the benchmark */
  name: string;
  /** Number of iterations run */
  iterations: number;
  /** Total time in milliseconds */
  totalTime: number;
  /** Average time per iteration in milliseconds */
  averageTime: number;
  /** Minimum time in milliseconds */
  minTime: number;
  /** Maximum time in milliseconds */
  maxTime: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** Memory usage in bytes (if measured) */
  memoryUsage?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface ComparisonResult {
  /** Baseline benchmark result */
  baseline: BenchmarkResult;
  /** Optimized benchmark result */
  optimized: BenchmarkResult;
  /** Performance improvement factor */
  improvementFactor: number;
  /** Percentage improvement */
  improvementPercentage: number;
  /** Cache hit rate (if applicable) */
  cacheHitRate?: number;
}

/**
 * Comprehensive benchmark suite for OpenAPI 3.1 performance
 */
export class OpenAPI31Benchmark {
  private profiler: SchemaProfiler;
  private options: Required<BenchmarkOptions>;

  constructor(options: BenchmarkOptions = {}) {
    this.options = {
      iterations: options.iterations ?? 100,
      warmup: options.warmup ?? true,
      warmupIterations: options.warmupIterations ?? 10,
      measureMemory: options.measureMemory ?? true,
      testScalability: options.testScalability ?? true
    };
    
    this.profiler = new SchemaProfiler({ enabled: true, verbose: false });
  }

  /**
   * Runs a comprehensive benchmark comparing OpenAPI 3.0 vs 3.1 processing
   */
  async runComprehensiveBenchmark(): Promise<{
    version30: BenchmarkResult[];
    version31: BenchmarkResult[];
    comparisons: ComparisonResult[];
  }> {
    console.log('🚀 Starting comprehensive OpenAPI benchmark...');
    
    const testSchemas = this.generateTestSchemas();
    const version30 = parseVersionString('3.0.3');
    const version31 = parseVersionString('3.1.0');
    
    const version30Results: BenchmarkResult[] = [];
    const version31Results: BenchmarkResult[] = [];
    const comparisons: ComparisonResult[] = [];

    for (const [schemaName, schema] of Object.entries(testSchemas)) {
      console.log(`\n📊 Benchmarking ${schemaName}...`);
      
      // Benchmark OpenAPI 3.0 processing (baseline)
      const result30 = await this.benchmarkLegacyProcessing(
        schema,
        version30,
        `${schemaName}-3.0`
      );
      version30Results.push(result30);
      
      // Benchmark OpenAPI 3.1 processing (optimized)
      const result31 = await this.benchmarkOptimizedProcessing(
        schema,
        version31,
        `${schemaName}-3.1`
      );
      version31Results.push(result31);
      
      // Compare results
      const comparison = this.compareResults(result30, result31);
      comparisons.push(comparison);
      
      console.log(`  ✅ ${schemaName}: ${comparison.improvementPercentage.toFixed(1)}% improvement`);
    }

    return { version30: version30Results, version31: version31Results, comparisons };
  }

  /**
   * Benchmarks caching effectiveness
   */
  async benchmarkCaching(): Promise<{
    withoutCache: BenchmarkResult;
    withCache: BenchmarkResult;
    cacheStats: any;
  }> {
    console.log('🗄️ Benchmarking caching effectiveness...');
    
    const schema = this.generateComplexSchema();
    const version = parseVersionString('3.1.0');
    const options: OpenAPI31ParseOptions = {
      strictNullHandling: true,
      enableConditionalSchemas: true,
      enableEnhancedDiscriminator: true
    };

    // Benchmark without cache
    const transformerNoCache = new OptimizedSchemaTransformer({ useCache: false });
    const withoutCache = await this.benchmarkTransformer(
      transformerNoCache,
      schema,
      version,
      options,
      'without-cache'
    );

    // Benchmark with cache (including cache misses and hits)
    const cache = new SchemaTransformationCache();
    const transformerWithCache = new OptimizedSchemaTransformer({ 
      useCache: true, 
      cache 
    });
    
    const withCache = await this.benchmarkTransformer(
      transformerWithCache,
      schema,
      version,
      options,
      'with-cache'
    );

    const cacheStats = cache.getStats();

    return { withoutCache, withCache, cacheStats };
  }

  /**
   * Benchmarks scalability with different schema sizes
   */
  async benchmarkScalability(): Promise<BenchmarkResult[]> {
    if (!this.options.testScalability) {
      return [];
    }

    console.log('📈 Benchmarking scalability...');
    
    const schemaSizes = [10, 50, 100, 500, 1000];
    const results: BenchmarkResult[] = [];
    const version = parseVersionString('3.1.0');
    const transformer = new OptimizedSchemaTransformer();

    for (const size of schemaSizes) {
      console.log(`  Testing schema with ${size} properties...`);
      
      const schema = this.generateSchemaWithSize(size);
      const result = await this.benchmarkTransformer(
        transformer,
        schema,
        version,
        undefined,
        `scalability-${size}`
      );
      
      result.metadata = { schemaSize: size };
      results.push(result);
    }

    return results;
  }

  /**
   * Benchmarks individual transformations
   */
  async benchmarkIndividualTransformations(): Promise<BenchmarkResult[]> {
    console.log('🔧 Benchmarking individual transformations...');
    
    const results: BenchmarkResult[] = [];
    const schemas = this.generateFeatureSpecificSchemas();

    for (const [feature, schema] of Object.entries(schemas)) {
      const result = await this.benchmarkSingleTransformation(feature, schema);
      results.push(result);
    }

    return results;
  }

  /**
   * Benchmarks legacy (non-optimized) processing
   */
  private async benchmarkLegacyProcessing(
    schema: JSONSchema,
    version: OpenAPIVersionInfo,
    name: string
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    // Warmup
    if (this.options.warmup) {
      for (let i = 0; i < this.options.warmupIterations; i++) {
        this.applyLegacyTransformations(schema);
      }
    }

    // Measure memory before
    const memoryBefore = this.options.measureMemory ? this.getMemoryUsage() : 0;

    // Benchmark
    for (let i = 0; i < this.options.iterations; i++) {
      const start = performance.now();
      this.applyLegacyTransformations(schema);
      const end = performance.now();
      times.push(end - start);
    }

    // Measure memory after
    const memoryAfter = this.options.measureMemory ? this.getMemoryUsage() : 0;

    return this.calculateBenchmarkResult(name, times, memoryAfter - memoryBefore);
  }

  /**
   * Benchmarks optimized processing
   */
  private async benchmarkOptimizedProcessing(
    schema: JSONSchema,
    version: OpenAPIVersionInfo,
    name: string
  ): Promise<BenchmarkResult> {
    const transformer = new OptimizedSchemaTransformer();
    return this.benchmarkTransformer(transformer, schema, version, undefined, name);
  }

  /**
   * Benchmarks a specific transformer
   */
  private async benchmarkTransformer(
    transformer: OptimizedSchemaTransformer,
    schema: JSONSchema,
    version: OpenAPIVersionInfo,
    options?: OpenAPI31ParseOptions,
    name: string = 'transformer'
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    // Warmup
    if (this.options.warmup) {
      for (let i = 0; i < this.options.warmupIterations; i++) {
        transformer.transformSchema(schema, version, options);
      }
    }

    // Measure memory before
    const memoryBefore = this.options.measureMemory ? this.getMemoryUsage() : 0;

    // Benchmark
    for (let i = 0; i < this.options.iterations; i++) {
      const start = performance.now();
      transformer.transformSchema(schema, version, options);
      const end = performance.now();
      times.push(end - start);
    }

    // Measure memory after
    const memoryAfter = this.options.measureMemory ? this.getMemoryUsage() : 0;

    return this.calculateBenchmarkResult(name, times, memoryAfter - memoryBefore);
  }

  /**
   * Benchmarks a single transformation function
   */
  private async benchmarkSingleTransformation(
    transformationName: string,
    schema: JSONSchema
  ): Promise<BenchmarkResult> {
    const transformers: Record<string, (schema: JSONSchema) => any> = {
      'null-types': transformNullTypes,
      'const-keyword': transformConstKeyword,
      'prefix-items': transformPrefixItems,
      'conditional': transformConditionalSchemas,
      'discriminator': transformDiscriminators,
      'unevaluated-properties': transformUnevaluatedProperties,
      'contains': transformContains
    };

    const transformer = transformers[transformationName];
    if (!transformer) {
      throw new Error(`Unknown transformation: ${transformationName}`);
    }

    const times: number[] = [];
    
    // Warmup
    if (this.options.warmup) {
      for (let i = 0; i < this.options.warmupIterations; i++) {
        transformer(schema);
      }
    }

    // Benchmark
    for (let i = 0; i < this.options.iterations; i++) {
      const start = performance.now();
      transformer(schema);
      const end = performance.now();
      times.push(end - start);
    }

    return this.calculateBenchmarkResult(transformationName, times);
  }

  /**
   * Applies legacy transformations (without optimization)
   */
  private applyLegacyTransformations(schema: JSONSchema): JSONSchema {
    let result = schema;
    
    // Apply all transformations sequentially without optimization
    result = transformNullTypes(result).schema;
    result = transformConstKeyword(result).schema;
    result = transformPrefixItems(result).schema;
    result = transformConditionalSchemas(result).schema;
    result = transformDiscriminators(result).schema;
    result = transformUnevaluatedProperties(result).schema;
    result = transformContains(result).schema;
    
    return result;
  }

  /**
   * Calculates benchmark result from timing data
   */
  private calculateBenchmarkResult(
    name: string,
    times: number[],
    memoryUsage?: number
  ): BenchmarkResult {
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);
    
    const operationsPerSecond = 1000 / averageTime;

    return {
      name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond,
      memoryUsage
    };
  }

  /**
   * Compares two benchmark results
   */
  private compareResults(baseline: BenchmarkResult, optimized: BenchmarkResult): ComparisonResult {
    const improvementFactor = baseline.averageTime / optimized.averageTime;
    const improvementPercentage = ((baseline.averageTime - optimized.averageTime) / baseline.averageTime) * 100;

    return {
      baseline,
      optimized,
      improvementFactor,
      improvementPercentage
    };
  }

  /**
   * Gets current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Generates test schemas for benchmarking
   */
  private generateTestSchemas(): Record<string, JSONSchema> {
    return {
      simple: this.generateSimpleSchema(),
      complex: this.generateComplexSchema(),
      nested: this.generateNestedSchema(),
      union: this.generateUnionSchema(),
      array: this.generateArraySchema()
    };
  }

  private generateSimpleSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: ['string', 'null'] },
        age: { type: 'number' },
        active: { type: 'boolean' }
      },
      required: ['id']
    };
  }

  private generateComplexSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        id: { type: 'string' },
        profile: {
          type: 'object',
          properties: {
            name: { type: ['string', 'null'] },
            email: { type: 'string' },
            preferences: {
              if: { properties: { type: { const: 'premium' } } },
              then: {
                properties: {
                  features: {
                    type: 'array',
                    prefixItems: [
                      { type: 'string' },
                      { type: 'number' }
                    ],
                    items: false
                  }
                }
              },
              else: {
                properties: {
                  basicFeatures: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        tags: {
          type: 'array',
          contains: { type: 'string', pattern: '^tag-' }
        }
      },
      discriminator: {
        propertyName: 'type'
      },
      oneOf: [
        { properties: { type: { const: 'user' } } },
        { properties: { type: { const: 'admin' } } }
      ]
    };
  }

  private generateNestedSchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: {
                  type: 'object',
                  properties: {
                    value: { type: ['string', 'null'] }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  private generateUnionSchema(): JSONSchema {
    return {
      oneOf: [
        {
          type: 'object',
          properties: {
            type: { const: 'A' },
            valueA: { type: 'string' }
          }
        },
        {
          type: 'object',
          properties: {
            type: { const: 'B' },
            valueB: { type: 'number' }
          }
        },
        {
          type: 'object',
          properties: {
            type: { const: 'C' },
            valueC: { type: ['boolean', 'null'] }
          }
        }
      ],
      discriminator: {
        propertyName: 'type'
      }
    };
  }

  private generateArraySchema(): JSONSchema {
    return {
      type: 'object',
      properties: {
        tupleArray: {
          type: 'array',
          prefixItems: [
            { type: 'string' },
            { type: 'number' },
            { type: ['boolean', 'null'] }
          ],
          items: false as any
        },
        containsArray: {
          type: 'array',
          contains: { type: 'string' },
          minContains: 1,
          maxContains: 5
        }
      }
    };
  }

  private generateSchemaWithSize(propertyCount: number): JSONSchema {
    const properties: Record<string, JSONSchema> = {};
    
    for (let i = 0; i < propertyCount; i++) {
      properties[`prop${i}`] = {
        type: i % 2 === 0 ? 'string' : ['string', 'null']
      };
    }

    return {
      type: 'object',
      properties
    };
  }

  private generateFeatureSpecificSchemas(): Record<string, JSONSchema> {
    return {
      'null-types': {
        type: 'object',
        properties: {
          nullable1: { type: ['string', 'null'] },
          nullable2: { type: ['number', 'null'] },
          nullable3: { type: ['boolean', 'null'] }
        }
      },
      'const-keyword': {
        type: 'object',
        properties: {
          const1: { const: 'value1' },
          const2: { const: 42 },
          const3: { const: true }
        }
      },
      'prefix-items': {
        type: 'object',
        properties: {
          tuple: {
            type: 'array',
            prefixItems: [
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' }
            ]
          }
        }
      },
      'conditional': {
        type: 'object',
        if: { properties: { type: { const: 'special' } } },
        then: { properties: { specialValue: { type: 'string' } } },
        else: { properties: { normalValue: { type: 'string' } } }
      },
      'discriminator': {
        oneOf: [
          { properties: { type: { const: 'A' }, valueA: { type: 'string' } } },
          { properties: { type: { const: 'B' }, valueB: { type: 'number' } } }
        ],
        discriminator: { propertyName: 'type' }
      },
      'contains': {
        type: 'object',
        properties: {
          array: {
            type: 'array',
            contains: { type: 'string' }
          }
        }
      },
      'unevaluated-properties': {
        type: 'object',
        properties: { known: { type: 'string' } },
        unevaluatedProperties: { type: 'number' }
      }
    };
  }

  /**
   * Generates a performance report
   */
  generateReport(results: {
    version30?: BenchmarkResult[];
    version31?: BenchmarkResult[];
    comparisons?: ComparisonResult[];
    caching?: any;
    scalability?: BenchmarkResult[];
    individual?: BenchmarkResult[];
  }): string {
    const lines: string[] = [];
    
    lines.push('=== OpenAPI 3.1 Performance Benchmark Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    if (results.comparisons) {
      lines.push('=== OpenAPI 3.0 vs 3.1 Comparison ===');
      for (const comparison of results.comparisons) {
        lines.push(`${comparison.baseline.name}:`);
        lines.push(`  3.0 Average: ${comparison.baseline.averageTime.toFixed(2)}ms`);
        lines.push(`  3.1 Average: ${comparison.optimized.averageTime.toFixed(2)}ms`);
        lines.push(`  Improvement: ${comparison.improvementPercentage.toFixed(1)}%`);
        lines.push('');
      }
    }

    if (results.caching) {
      lines.push('=== Caching Effectiveness ===');
      lines.push(`Without Cache: ${results.caching.withoutCache.averageTime.toFixed(2)}ms`);
      lines.push(`With Cache: ${results.caching.withCache.averageTime.toFixed(2)}ms`);
      lines.push(`Cache Hit Rate: ${results.caching.cacheStats.hitRate.toFixed(1)}%`);
      lines.push('');
    }

    if (results.scalability) {
      lines.push('=== Scalability Results ===');
      for (const result of results.scalability) {
        lines.push(`${result.metadata?.schemaSize} properties: ${result.averageTime.toFixed(2)}ms`);
      }
      lines.push('');
    }

    if (results.individual) {
      lines.push('=== Individual Transformation Performance ===');
      for (const result of results.individual) {
        lines.push(`${result.name}: ${result.averageTime.toFixed(2)}ms (${result.operationsPerSecond.toFixed(0)} ops/sec)`);
      }
    }

    return lines.join('\n');
  }
}