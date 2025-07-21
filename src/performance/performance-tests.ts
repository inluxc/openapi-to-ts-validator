/**
 * Performance tests for OpenAPI 3.1 processing
 */

import { OpenAPI31Benchmark } from "./benchmark";
import { globalOptimizedTransformer } from "./optimized-transformer";
import { globalProfiler } from "./profiler";
import { globalSchemaCache } from "./schema-cache";

/**
 * Runs all performance tests and generates a comprehensive report
 */
export async function runPerformanceTests(): Promise<string> {
  console.log('🚀 Starting OpenAPI 3.1 Performance Tests...\n');
  
  const benchmark = new OpenAPI31Benchmark({
    iterations: 100,
    warmup: true,
    warmupIterations: 10,
    measureMemory: true,
    testScalability: true
  });

  const results: any = {};

  try {
    // 1. Comprehensive benchmark (3.0 vs 3.1)
    console.log('1️⃣ Running comprehensive benchmark...');
    const comprehensive = await benchmark.runComprehensiveBenchmark();
    results.version30 = comprehensive.version30;
    results.version31 = comprehensive.version31;
    results.comparisons = comprehensive.comparisons;

    // 2. Caching effectiveness
    console.log('\n2️⃣ Testing caching effectiveness...');
    results.caching = await benchmark.benchmarkCaching();

    // 3. Scalability testing
    console.log('\n3️⃣ Testing scalability...');
    results.scalability = await benchmark.benchmarkScalability();

    // 4. Individual transformations
    console.log('\n4️⃣ Testing individual transformations...');
    results.individual = await benchmark.benchmarkIndividualTransformations();

    // 5. Memory usage analysis
    console.log('\n5️⃣ Analyzing memory usage...');
    results.memory = await analyzeMemoryUsage();

    // 6. Cache statistics
    console.log('\n6️⃣ Gathering cache statistics...');
    results.cacheStats = globalSchemaCache.getStats();

    console.log('\n✅ All performance tests completed!');
    
    return benchmark.generateReport(results);
    
  } catch (error) {
    console.error('❌ Performance tests failed:', error);
    throw error;
  }
}

/**
 * Runs a quick performance check
 */
export async function runQuickPerformanceCheck(): Promise<{
  transformationTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}> {
  const benchmark = new OpenAPI31Benchmark({
    iterations: 10,
    warmup: false,
    measureMemory: true,
    testScalability: false
  });

  // Clear cache to get accurate measurements
  globalSchemaCache.clear();
  
  // Run a simple benchmark
  const results = await benchmark.runComprehensiveBenchmark();
  const avgTime = results.comparisons.reduce((sum, comp) => sum + comp.optimized.averageTime, 0) / results.comparisons.length;
  
  const cacheStats = globalSchemaCache.getStats();
  const memoryUsage = process.memoryUsage?.()?.heapUsed || 0;

  return {
    transformationTime: avgTime,
    cacheHitRate: cacheStats.hitRate,
    memoryUsage
  };
}

/**
 * Analyzes memory usage patterns
 */
async function analyzeMemoryUsage(): Promise<{
  baseline: number;
  afterTransformations: number;
  afterCaching: number;
  improvement: number;
}> {
  const getMemory = () => process.memoryUsage?.()?.heapUsed || 0;
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const baseline = getMemory();
  
  // Run transformations without caching
  const transformer = globalOptimizedTransformer;
  const testSchema = {
    type: 'object',
    properties: {
      test: { type: ['string', 'null'] as any }
    }
  } as any;
  
  for (let i = 0; i < 100; i++) {
    transformer.transformSchema(testSchema, { version: '3.1.0', major: 3, minor: 1, isVersion31: true, isVersion30: false });
  }
  
  const afterTransformations = getMemory();
  
  // Enable caching and run again
  globalSchemaCache.clear();
  for (let i = 0; i < 100; i++) {
    transformer.transformSchema(testSchema, { version: '3.1.0', major: 3, minor: 1, isVersion31: true, isVersion30: false });
  }
  
  const afterCaching = getMemory();
  
  return {
    baseline,
    afterTransformations,
    afterCaching,
    improvement: ((afterTransformations - afterCaching) / afterTransformations) * 100
  };
}

/**
 * Profiles schema parsing performance
 */
export async function profileSchemaProcessing(schema: any, iterations: number = 100): Promise<string> {
  globalProfiler.setEnabled(true);
  globalProfiler.setVerbose(true);
  globalProfiler.clear();

  const transformer = globalOptimizedTransformer;
  const version = { version: '3.1.0', major: 3, minor: 1, isVersion31: true, isVersion30: false };

  console.log(`🔍 Profiling schema processing (${iterations} iterations)...`);

  for (let i = 0; i < iterations; i++) {
    await globalProfiler.timeAsync('full-processing', async () => {
      transformer.transformSchema(schema, version);
    });
  }

  const report = globalProfiler.generateReport();
  globalProfiler.setEnabled(false);
  
  return report;
}

/**
 * Benchmarks generation speed compared to 3.0 processing
 */
export async function benchmarkGenerationSpeed(): Promise<{
  openapi30Speed: number;
  openapi31Speed: number;
  speedRatio: number;
  recommendation: string;
}> {
  const benchmark = new OpenAPI31Benchmark({
    iterations: 50,
    warmup: true,
    warmupIterations: 5
  });

  console.log('⚡ Benchmarking generation speed...');

  const results = await benchmark.runComprehensiveBenchmark();
  
  // Calculate average speeds
  const avg30Speed = results.version30.reduce((sum, r) => sum + r.operationsPerSecond, 0) / results.version30.length;
  const avg31Speed = results.version31.reduce((sum, r) => sum + r.operationsPerSecond, 0) / results.version31.length;
  
  const speedRatio = avg31Speed / avg30Speed;
  
  let recommendation: string;
  if (speedRatio > 1.2) {
    recommendation = 'OpenAPI 3.1 processing is significantly faster. Excellent optimization!';
  } else if (speedRatio > 1.0) {
    recommendation = 'OpenAPI 3.1 processing is faster. Good optimization.';
  } else if (speedRatio > 0.8) {
    recommendation = 'OpenAPI 3.1 processing is slightly slower but acceptable for the added features.';
  } else {
    recommendation = 'OpenAPI 3.1 processing needs optimization. Consider reviewing transformation logic.';
  }

  return {
    openapi30Speed: avg30Speed,
    openapi31Speed: avg31Speed,
    speedRatio,
    recommendation
  };
}

/**
 * Establishes performance benchmarks for regression testing
 */
export async function establishBenchmarks(): Promise<{
  benchmarks: Record<string, number>;
  thresholds: Record<string, number>;
}> {
  console.log('📏 Establishing performance benchmarks...');
  
  const benchmark = new OpenAPI31Benchmark({
    iterations: 200,
    warmup: true,
    warmupIterations: 20
  });

  const results = await benchmark.runComprehensiveBenchmark();
  
  const benchmarks: Record<string, number> = {};
  const thresholds: Record<string, number> = {};
  
  // Establish benchmarks for each test case
  for (const result of results.version31) {
    benchmarks[result.name] = result.averageTime;
    // Set threshold at 20% slower than current performance
    thresholds[result.name] = result.averageTime * 1.2;
  }
  
  // Cache performance benchmarks
  const cachingResult = await benchmark.benchmarkCaching();
  benchmarks['caching-improvement'] = cachingResult.withoutCache.averageTime / cachingResult.withCache.averageTime;
  thresholds['caching-improvement'] = 1.5; // Cache should provide at least 50% improvement
  
  console.log('✅ Benchmarks established');
  
  return { benchmarks, thresholds };
}

/**
 * Validates performance against established benchmarks
 */
export async function validatePerformance(
  benchmarks: Record<string, number>,
  thresholds: Record<string, number>
): Promise<{
  passed: boolean;
  results: Array<{
    test: string;
    current: number;
    benchmark: number;
    threshold: number;
    passed: boolean;
    degradation: number;
  }>;
}> {
  console.log('✅ Validating performance against benchmarks...');
  
  const benchmark = new OpenAPI31Benchmark({
    iterations: 50,
    warmup: true
  });

  const results = await benchmark.runComprehensiveBenchmark();
  const validationResults = [];
  let allPassed = true;

  for (const result of results.version31) {
    const benchmark_value = benchmarks[result.name];
    const threshold = thresholds[result.name];
    
    if (benchmark_value && threshold) {
      const passed = result.averageTime <= threshold;
      const degradation = ((result.averageTime - benchmark_value) / benchmark_value) * 100;
      
      validationResults.push({
        test: result.name,
        current: result.averageTime,
        benchmark: benchmark_value,
        threshold,
        passed,
        degradation
      });
      
      if (!passed) {
        allPassed = false;
      }
    }
  }

  return {
    passed: allPassed,
    results: validationResults
  };
}

/**
 * Optimizes cache settings based on usage patterns
 */
export function optimizeCacheSettings(): {
  recommendedSettings: {
    maxEntries: number;
    maxMemoryMB: number;
    ttlMs: number;
  };
  reasoning: string;
} {
  const stats = globalSchemaCache.getStats();
  
  let maxEntries = 1000;
  let maxMemoryMB = 100;
  let ttlMs = 30 * 60 * 1000; // 30 minutes
  
  let reasoning = 'Default settings';
  
  if (stats.hitRate > 80) {
    // High hit rate - increase cache size
    maxEntries = 2000;
    maxMemoryMB = 200;
    reasoning = 'High cache hit rate detected - increased cache size for better performance';
  } else if (stats.hitRate < 30) {
    // Low hit rate - decrease cache size
    maxEntries = 500;
    maxMemoryMB = 50;
    ttlMs = 15 * 60 * 1000; // 15 minutes
    reasoning = 'Low cache hit rate detected - reduced cache size to save memory';
  } else if (stats.memoryUsage > 150 * 1024 * 1024) {
    // High memory usage - reduce cache size
    maxEntries = 750;
    maxMemoryMB = 75;
    reasoning = 'High memory usage detected - reduced cache size';
  }

  return {
    recommendedSettings: {
      maxEntries,
      maxMemoryMB,
      ttlMs
    },
    reasoning
  };
}