// Global variable declarations for performance monitoring
declare global {
  var globalProfiler: import('./performance/profiler').SchemaProfiler;
  var globalSchemaCache: import('./performance/schema-cache').SchemaTransformationCache;
  var globalPerformanceMonitor: import('./performance/performance-monitor').PerformanceMonitor;
}

export {};