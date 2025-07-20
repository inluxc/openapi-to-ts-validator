/**
 * Performance monitoring utilities for OpenAPI 3.1 processing
 */

import { globalProfiler } from "./profiler";
import { globalSchemaCache } from "./schema-cache";
import { runQuickPerformanceCheck } from "./performance-tests";

export interface PerformanceMetrics {
  /** Total processing time in milliseconds */
  totalTime: number;
  /** Schema parsing time in milliseconds */
  parsingTime: number;
  /** Transformation time in milliseconds */
  transformationTime: number;
  /** Type generation time in milliseconds */
  typeGenerationTime: number;
  /** Validator generation time in milliseconds */
  validatorGenerationTime: number;
  /** Cache hit rate percentage */
  cacheHitRate: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Number of schemas processed */
  schemasProcessed: number;
  /** OpenAPI version */
  openApiVersion: string;
}

export interface PerformanceAlert {
  /** Type of alert */
  type: 'warning' | 'error' | 'info';
  /** Alert message */
  message: string;
  /** Metric that triggered the alert */
  metric: string;
  /** Current value */
  currentValue: number;
  /** Threshold value */
  threshold: number;
  /** Suggested action */
  suggestion?: string;
}

/**
 * Performance monitoring class for tracking OpenAPI processing performance
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private thresholds = {
    maxProcessingTime: 5000, // 5 seconds
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    minCacheHitRate: 50, // 50%
    maxTransformationTime: 1000 // 1 second
  };

  /**
   * Starts monitoring a processing session
   */
  startSession(openApiVersion: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    globalProfiler.setEnabled(true);
    globalProfiler.clear();
    
    return sessionId;
  }

  /**
   * Ends monitoring session and collects metrics
   */
  endSession(sessionId: string, schemasProcessed: number): PerformanceMetrics {
    const stats = globalProfiler.getStats();
    const cacheStats = globalSchemaCache.getStats();
    const memoryUsage = this.getMemoryUsage();

    const metrics: PerformanceMetrics = {
      totalTime: stats.totalTime,
      parsingTime: this.getOperationTime('parse-schema') || 0,
      transformationTime: this.getOperationTime('process-openapi31-schema') || 0,
      typeGenerationTime: this.getOperationTime('generate-models') || 0,
      validatorGenerationTime: this.getOperationTime('generate-validators') || 0,
      cacheHitRate: cacheStats.hitRate,
      memoryUsage,
      schemasProcessed,
      openApiVersion: this.detectVersionFromStats()
    };

    this.metrics.push(metrics);
    globalProfiler.setEnabled(false);

    return metrics;
  }

  /**
   * Analyzes current performance and generates alerts
   */
  analyzePerformance(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Check processing time
    if (metrics.totalTime > this.thresholds.maxProcessingTime) {
      alerts.push({
        type: 'warning',
        message: 'Processing time exceeds recommended threshold',
        metric: 'totalTime',
        currentValue: metrics.totalTime,
        threshold: this.thresholds.maxProcessingTime,
        suggestion: 'Consider enabling caching or optimizing schema complexity'
      });
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      alerts.push({
        type: 'warning',
        message: 'Memory usage is high',
        metric: 'memoryUsage',
        currentValue: metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        suggestion: 'Consider reducing cache size or processing schemas in smaller batches'
      });
    }

    // Check cache hit rate
    if (metrics.cacheHitRate < this.thresholds.minCacheHitRate && metrics.schemasProcessed > 10) {
      alerts.push({
        type: 'info',
        message: 'Cache hit rate is low',
        metric: 'cacheHitRate',
        currentValue: metrics.cacheHitRate,
        threshold: this.thresholds.minCacheHitRate,
        suggestion: 'Schema variations may be too diverse for effective caching'
      });
    }

    // Check transformation time
    if (metrics.transformationTime > this.thresholds.maxTransformationTime) {
      alerts.push({
        type: 'warning',
        message: 'Schema transformation is slow',
        metric: 'transformationTime',
        currentValue: metrics.transformationTime,
        threshold: this.thresholds.maxTransformationTime,
        suggestion: 'Complex schemas may benefit from simplification or feature-specific optimization'
      });
    }

    return alerts;
  }

  /**
   * Gets performance trends over time
   */
  getPerformanceTrends(): {
    averageProcessingTime: number;
    processingTimetrend: 'improving' | 'degrading' | 'stable';
    averageCacheHitRate: number;
    cacheHitRateTrend: 'improving' | 'degrading' | 'stable';
    memoryUsageTrend: 'improving' | 'degrading' | 'stable';
  } {
    if (this.metrics.length < 2) {
      return {
        averageProcessingTime: this.metrics[0]?.totalTime || 0,
        processingTimetrend: 'stable',
        averageCacheHitRate: this.metrics[0]?.cacheHitRate || 0,
        cacheHitRateTrend: 'stable',
        memoryUsageTrend: 'stable'
      };
    }

    const recentMetrics = this.metrics.slice(-10); // Last 10 sessions
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.totalTime, 0) / recentMetrics.length;
    const averageCacheHitRate = recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length;

    // Calculate trends
    const processingTimeSlope = this.calculateTrend(recentMetrics.map(m => m.totalTime));
    const cacheHitRateSlope = this.calculateTrend(recentMetrics.map(m => m.cacheHitRate));
    const memoryUsageSlope = this.calculateTrend(recentMetrics.map(m => m.memoryUsage));

    return {
      averageProcessingTime,
      processingTimetrend: this.interpretTrend(processingTimeSlope, true), // Lower is better
      averageCacheHitRate,
      cacheHitRateTrend: this.interpretTrend(cacheHitRateSlope, false), // Higher is better
      memoryUsageTrend: this.interpretTrend(memoryUsageSlope, true) // Lower is better
    };
  }

  /**
   * Generates a performance report
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return 'No performance data available';
    }

    const latest = this.metrics[this.metrics.length - 1];
    const trends = this.getPerformanceTrends();
    const alerts = this.analyzePerformance(latest);

    const lines: string[] = [];
    lines.push('=== OpenAPI Performance Report ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    lines.push('=== Latest Session Metrics ===');
    lines.push(`Total Processing Time: ${latest.totalTime.toFixed(2)}ms`);
    lines.push(`Parsing Time: ${latest.parsingTime.toFixed(2)}ms`);
    lines.push(`Transformation Time: ${latest.transformationTime.toFixed(2)}ms`);
    lines.push(`Type Generation Time: ${latest.typeGenerationTime.toFixed(2)}ms`);
    lines.push(`Validator Generation Time: ${latest.validatorGenerationTime.toFixed(2)}ms`);
    lines.push(`Cache Hit Rate: ${latest.cacheHitRate.toFixed(1)}%`);
    lines.push(`Memory Usage: ${(latest.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    lines.push(`Schemas Processed: ${latest.schemasProcessed}`);
    lines.push(`OpenAPI Version: ${latest.openApiVersion}`);
    lines.push('');

    lines.push('=== Performance Trends ===');
    lines.push(`Average Processing Time: ${trends.averageProcessingTime.toFixed(2)}ms (${trends.processingTimetrend})`);
    lines.push(`Average Cache Hit Rate: ${trends.averageCacheHitRate.toFixed(1)}% (${trends.cacheHitRateTrend})`);
    lines.push(`Memory Usage Trend: ${trends.memoryUsageTrend}`);
    lines.push('');

    if (alerts.length > 0) {
      lines.push('=== Performance Alerts ===');
      for (const alert of alerts) {
        const icon = alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`${icon} ${alert.message}`);
        lines.push(`   Current: ${alert.currentValue}, Threshold: ${alert.threshold}`);
        if (alert.suggestion) {
          lines.push(`   Suggestion: ${alert.suggestion}`);
        }
        lines.push('');
      }
    } else {
      lines.push('✅ No performance issues detected');
    }

    return lines.join('\n');
  }

  /**
   * Optimizes performance based on current metrics
   */
  async optimizePerformance(): Promise<{
    cacheOptimized: boolean;
    recommendedSettings: any;
    estimatedImprovement: string;
  }> {
    const cacheStats = globalSchemaCache.getStats();
    let cacheOptimized = false;
    let recommendedSettings: any = {};
    let estimatedImprovement = 'No optimization needed';

    // Optimize cache settings based on usage patterns
    if (cacheStats.hitRate < 50 && cacheStats.totalEntries > 100) {
      // Low hit rate with many entries - reduce cache size
      recommendedSettings.cache = {
        maxEntries: Math.max(500, Math.floor(cacheStats.totalEntries * 0.7)),
        maxMemoryMB: 50,
        ttlMs: 15 * 60 * 1000 // 15 minutes
      };
      estimatedImprovement = '10-20% memory reduction';
      cacheOptimized = true;
    } else if (cacheStats.hitRate > 80 && cacheStats.memoryUsage < 50 * 1024 * 1024) {
      // High hit rate with low memory usage - increase cache size
      recommendedSettings.cache = {
        maxEntries: Math.min(2000, cacheStats.totalEntries * 1.5),
        maxMemoryMB: 150,
        ttlMs: 45 * 60 * 1000 // 45 minutes
      };
      estimatedImprovement = '15-30% performance improvement';
      cacheOptimized = true;
    }

    // Recommend profiling settings
    if (this.metrics.length > 0) {
      const avgTime = this.metrics.reduce((sum, m) => sum + m.totalTime, 0) / this.metrics.length;
      if (avgTime > 2000) {
        recommendedSettings.profiling = {
          enabled: true,
          verbose: true,
          minLogDuration: 10
        };
      }
    }

    return {
      cacheOptimized,
      recommendedSettings,
      estimatedImprovement
    };
  }

  /**
   * Clears all performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Gets all collected metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Updates performance thresholds
   */
  updateThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  private getOperationTime(operationName: string): number | undefined {
    const stats = globalProfiler.getStats();
    return stats.operationStats[operationName]?.averageTime;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private detectVersionFromStats(): string {
    // Try to detect version from profiler stats or default to unknown
    const stats = globalProfiler.getStats();
    if (stats.operationStats['process-openapi31-schema']) {
      return '3.1.x';
    } else if (stats.operationStats['parse-schema']) {
      return '3.0.x';
    }
    return 'unknown';
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private interpretTrend(slope: number, lowerIsBetter: boolean): 'improving' | 'degrading' | 'stable' {
    const threshold = 0.1;
    
    if (Math.abs(slope) < threshold) {
      return 'stable';
    }
    
    if (lowerIsBetter) {
      return slope < 0 ? 'improving' : 'degrading';
    } else {
      return slope > 0 ? 'improving' : 'degrading';
    }
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();