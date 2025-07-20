/**
 * Performance optimization module for OpenAPI 3.1 processing
 * 
 * This module provides comprehensive performance optimization features including:
 * - Schema transformation caching
 * - Performance profiling and monitoring
 * - Optimized transformation pipeline
 * - Benchmarking and performance testing
 */

// Core performance components
export { SchemaTransformationCache, globalSchemaCache } from './schema-cache';
export { SchemaProfiler, globalProfiler, timed, timedAsync } from './profiler';
export { OptimizedSchemaTransformer, globalOptimizedTransformer } from './optimized-transformer';
export { PerformanceMonitor, globalPerformanceMonitor } from './performance-monitor';

// Performance testing and benchmarking
export { OpenAPI31Benchmark } from './benchmark';
export { 
  runPerformanceTests, 
  runQuickPerformanceCheck, 
  establishBenchmarks,
  validatePerformance,
  optimizeCacheSettings
} from './performance-tests';

// Type definitions
export type { 
  CacheKey, 
  CacheEntry, 
  CacheStats, 
  TransformationType 
} from './schema-cache';

export type { 
  ProfilerOptions, 
  TimingEntry, 
  ProfilerStats 
} from './profiler';

export type { 
  OptimizedTransformOptions, 
  TransformationResult 
} from './optimized-transformer';

export type { 
  PerformanceMetrics, 
  PerformanceAlert 
} from './performance-monitor';

export type { 
  BenchmarkOptions, 
  BenchmarkResult, 
  ComparisonResult 
} from './benchmark';

/**
 * Enables performance optimizations globally
 * @param options Configuration options for performance features
 */
export function enablePerformanceOptimizations(options: {
  caching?: boolean;
  profiling?: boolean;
  monitoring?: boolean;
  verbose?: boolean;
} = {}) {
  const {
    caching = true,
    profiling = false,
    monitoring = false,
    verbose = false
  } = options;

  if (caching) {
    // Cache is enabled by default in globalOptimizedTransformer
    console.log('✅ Schema caching enabled');
  }

  if (profiling) {
    globalProfiler.setEnabled(true);
    globalProfiler.setVerbose(verbose);
    console.log('✅ Performance profiling enabled');
  }

  if (monitoring) {
    // Performance monitoring is enabled by default in generate function
    console.log('✅ Performance monitoring enabled');
  }

  if (verbose) {
    console.log('✅ Verbose performance logging enabled');
  }
}

/**
 * Disables performance optimizations globally
 */
export function disablePerformanceOptimizations() {
  globalProfiler.setEnabled(false);
  globalSchemaCache.clear();
  globalPerformanceMonitor.clearMetrics();
  console.log('✅ Performance optimizations disabled');
}

/**
 * Gets a summary of current performance status
 */
export function getPerformanceStatus() {
  const cacheStats = globalSchemaCache.getStats();
  const profilerStats = globalProfiler.getStats();
  
  return {
    caching: {
      enabled: true,
      entries: cacheStats.totalEntries,
      hitRate: cacheStats.hitRate,
      memoryUsage: cacheStats.memoryUsage
    },
    profiling: {
      enabled: profilerStats.totalOperations > 0,
      totalOperations: profilerStats.totalOperations,
      totalTime: profilerStats.totalTime,
      averageTime: profilerStats.averageTime
    },
    monitoring: {
      enabled: true,
      metricsCollected: globalPerformanceMonitor.getAllMetrics().length
    }
  };
}

/**
 * Optimizes performance settings based on current usage patterns
 */
export async function optimizePerformanceSettings() {
  const optimization = await globalPerformanceMonitor.optimizePerformance();
  
  if (optimization.cacheOptimized) {
    console.log('🔧 Cache settings optimized');
    console.log(`   Estimated improvement: ${optimization.estimatedImprovement}`);
    
    if (optimization.recommendedSettings.cache) {
      const settings = optimization.recommendedSettings.cache;
      console.log(`   Recommended cache settings:`);
      console.log(`     Max entries: ${settings.maxEntries}`);
      console.log(`     Max memory: ${settings.maxMemoryMB}MB`);
      console.log(`     TTL: ${settings.ttlMs / 1000 / 60} minutes`);
    }
  }
  
  return optimization;
}