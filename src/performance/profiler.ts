/**
 * Performance profiler for OpenAPI 3.1 schema processing
 */

export interface ProfilerOptions {
  /** Whether profiling is enabled */
  enabled?: boolean;
  /** Whether to log detailed timing information */
  verbose?: boolean;
  /** Minimum duration in ms to log operations */
  minLogDuration?: number;
}

export interface TimingEntry {
  /** Name of the operation */
  operation: string;
  /** Start time in milliseconds */
  startTime: number;
  /** End time in milliseconds */
  endTime?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Child operations */
  children?: TimingEntry[];
}

export interface ProfilerStats {
  /** Total operations profiled */
  totalOperations: number;
  /** Total time spent in all operations */
  totalTime: number;
  /** Average operation time */
  averageTime: number;
  /** Slowest operation */
  slowestOperation?: TimingEntry;
  /** Operations by type */
  operationStats: Record<string, {
    count: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
  }>;
}

/**
 * High-performance profiler for schema processing operations
 */
export class SchemaProfiler {
  private options: Required<ProfilerOptions>;
  private timingStack: TimingEntry[] = [];
  private completedTimings: TimingEntry[] = [];
  private operationCounts = new Map<string, number>();
  private operationTimes = new Map<string, number[]>();

  constructor(options: ProfilerOptions = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      verbose: options.verbose ?? false,
      minLogDuration: options.minLogDuration ?? 1
    };
  }

  /**
   * Starts timing an operation
   */
  startOperation(operation: string, metadata?: Record<string, any>): string {
    if (!this.options.enabled) {
      return '';
    }

    const entry: TimingEntry = {
      operation,
      startTime: performance.now(),
      metadata,
      children: []
    };

    // Add as child to current operation if there is one
    if (this.timingStack.length > 0) {
      const parent = this.timingStack[this.timingStack.length - 1];
      parent.children!.push(entry);
    }

    this.timingStack.push(entry);
    
    return this.generateOperationId(operation, entry.startTime);
  }

  /**
   * Ends timing an operation
   */
  endOperation(operationId?: string): TimingEntry | undefined {
    if (!this.options.enabled || this.timingStack.length === 0) {
      return undefined;
    }

    const entry = this.timingStack.pop()!;
    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;

    // Update statistics
    this.updateStats(entry.operation, entry.duration);

    // Log if verbose and meets minimum duration
    if (this.options.verbose && entry.duration >= this.options.minLogDuration) {
      this.logOperation(entry);
    }

    // If this is a top-level operation, add to completed timings
    if (this.timingStack.length === 0) {
      this.completedTimings.push(entry);
    }

    return entry;
  }

  /**
   * Times a synchronous operation
   */
  time<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.options.enabled) {
      return fn();
    }

    this.startOperation(operation, metadata);
    try {
      const result = fn();
      return result;
    } finally {
      this.endOperation();
    }
  }

  /**
   * Times an asynchronous operation
   */
  async timeAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.options.enabled) {
      return fn();
    }

    this.startOperation(operation, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endOperation();
    }
  }

  /**
   * Gets profiler statistics
   */
  getStats(): ProfilerStats {
    const operationStats: Record<string, any> = {};
    
    for (const [operation, times] of this.operationTimes.entries()) {
      const totalTime = times.reduce((sum, time) => sum + time, 0);
      operationStats[operation] = {
        count: times.length,
        totalTime,
        averageTime: totalTime / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times)
      };
    }

    const allTimes = Array.from(this.operationTimes.values()).flat();
    const totalTime = allTimes.reduce((sum, time) => sum + time, 0);
    
    let slowestOperation: TimingEntry | undefined;
    let maxDuration = 0;
    
    for (const timing of this.completedTimings) {
      if (timing.duration && timing.duration > maxDuration) {
        maxDuration = timing.duration;
        slowestOperation = timing;
      }
    }

    return {
      totalOperations: allTimes.length,
      totalTime,
      averageTime: allTimes.length > 0 ? totalTime / allTimes.length : 0,
      slowestOperation,
      operationStats
    };
  }

  /**
   * Gets all completed timing entries
   */
  getTimings(): TimingEntry[] {
    return [...this.completedTimings];
  }

  /**
   * Clears all timing data
   */
  clear(): void {
    this.timingStack = [];
    this.completedTimings = [];
    this.operationCounts.clear();
    this.operationTimes.clear();
  }

  /**
   * Enables or disables profiling
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
  }

  /**
   * Sets verbose logging
   */
  setVerbose(verbose: boolean): void {
    this.options.verbose = verbose;
  }

  /**
   * Generates a report of profiling results
   */
  generateReport(): string {
    const stats = this.getStats();
    const lines: string[] = [];
    
    lines.push('=== Schema Processing Performance Report ===');
    lines.push(`Total Operations: ${stats.totalOperations}`);
    lines.push(`Total Time: ${stats.totalTime.toFixed(2)}ms`);
    lines.push(`Average Time: ${stats.averageTime.toFixed(2)}ms`);
    
    if (stats.slowestOperation) {
      lines.push(`Slowest Operation: ${stats.slowestOperation.operation} (${stats.slowestOperation.duration?.toFixed(2)}ms)`);
    }
    
    lines.push('');
    lines.push('=== Operation Breakdown ===');
    
    const sortedOperations = Object.entries(stats.operationStats)
      .sort(([,a], [,b]) => b.totalTime - a.totalTime);
    
    for (const [operation, opStats] of sortedOperations) {
      lines.push(`${operation}:`);
      lines.push(`  Count: ${opStats.count}`);
      lines.push(`  Total Time: ${opStats.totalTime.toFixed(2)}ms`);
      lines.push(`  Average Time: ${opStats.averageTime.toFixed(2)}ms`);
      lines.push(`  Min Time: ${opStats.minTime.toFixed(2)}ms`);
      lines.push(`  Max Time: ${opStats.maxTime.toFixed(2)}ms`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Updates operation statistics
   */
  private updateStats(operation: string, duration: number): void {
    // Update count
    const currentCount = this.operationCounts.get(operation) || 0;
    this.operationCounts.set(operation, currentCount + 1);
    
    // Update times
    const currentTimes = this.operationTimes.get(operation) || [];
    currentTimes.push(duration);
    this.operationTimes.set(operation, currentTimes);
  }

  /**
   * Logs an operation timing
   */
  private logOperation(entry: TimingEntry): void {
    const indent = '  '.repeat(this.timingStack.length);
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    console.log(`${indent}⏱️  ${entry.operation}: ${entry.duration?.toFixed(2)}ms${metadata}`);
  }

  /**
   * Generates a unique operation ID
   */
  private generateOperationId(operation: string, startTime: number): string {
    return `${operation}_${startTime.toFixed(3)}`;
  }
}

/**
 * Global profiler instance
 */
export const globalProfiler = new SchemaProfiler({
  enabled: false,
  verbose: false,
  minLogDuration: 1
});

/**
 * Decorator for timing methods
 */
export function timed(operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return globalProfiler.time(operationName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Decorator for timing async methods
 */
export function timedAsync(operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return globalProfiler.timeAsync(operationName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}