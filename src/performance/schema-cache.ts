/**
 * Schema transformation caching system for OpenAPI 3.1 performance optimization
 */

import type { JSONSchema } from "json-schema-to-typescript";
import type { OpenAPIVersionInfo } from "../version-detection";
import type { OpenAPI31ParseOptions } from "../GenerateOptions";

export interface CacheKey {
  /** Hash of the schema content */
  schemaHash: string;
  /** OpenAPI version information */
  version: OpenAPIVersionInfo;
  /** Serialized options that affect transformation */
  optionsHash: string;
  /** Type of transformation */
  transformationType: TransformationType;
}

export type TransformationType = 
  | 'null-types'
  | 'conditional'
  | 'discriminator'
  | 'prefix-items'
  | 'const-keyword'
  | 'contains'
  | 'unevaluated-properties'
  | 'webhooks'
  | 'full-schema';

export interface CacheEntry<T = any> {
  /** The cached result */
  result: T;
  /** When this entry was created */
  timestamp: number;
  /** How many times this entry has been accessed */
  accessCount: number;
  /** Size of the cached data in bytes (approximate) */
  size: number;
}

export interface CacheStats {
  /** Total number of cache entries */
  totalEntries: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Total memory usage in bytes */
  memoryUsage: number;
  /** Cache hit rate as percentage */
  hitRate: number;
}

/**
 * High-performance cache for schema transformations with LRU eviction
 */
export class SchemaTransformationCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private stats: CacheStats = {
    totalEntries: 0,
    hits: 0,
    misses: 0,
    memoryUsage: 0,
    hitRate: 0
  };
  
  private accessCounter = 0;
  private readonly maxEntries: number;
  private readonly maxMemoryMB: number;
  private readonly ttlMs: number;

  constructor(options: {
    maxEntries?: number;
    maxMemoryMB?: number;
    ttlMs?: number;
  } = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.maxMemoryMB = options.maxMemoryMB ?? 100;
    this.ttlMs = options.ttlMs ?? 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Gets a cached transformation result
   */
  get<T>(key: CacheKey): T | undefined {
    const keyString = this.serializeKey(key);
    const entry = this.cache.get(keyString);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.delete(keyString);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Update access tracking
    entry.accessCount++;
    this.accessOrder.set(keyString, ++this.accessCounter);
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.result as T;
  }

  /**
   * Stores a transformation result in the cache
   */
  set<T>(key: CacheKey, result: T): void {
    const keyString = this.serializeKey(key);
    const size = this.estimateSize(result);
    
    // Check if we need to evict entries
    this.evictIfNeeded(size);
    
    const entry: CacheEntry<T> = {
      result,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };
    
    // Remove existing entry if present
    if (this.cache.has(keyString)) {
      const oldEntry = this.cache.get(keyString)!;
      this.stats.memoryUsage -= oldEntry.size;
      this.stats.totalEntries--;
    }
    
    this.cache.set(keyString, entry);
    this.accessOrder.set(keyString, ++this.accessCounter);
    this.stats.memoryUsage += size;
    this.stats.totalEntries++;
  }

  /**
   * Checks if a key exists in the cache (without updating access)
   */
  has(key: CacheKey): boolean {
    const keyString = this.serializeKey(key);
    const entry = this.cache.get(keyString);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.delete(keyString);
      return false;
    }
    
    return true;
  }

  /**
   * Removes an entry from the cache
   */
  delete(keyString: string): boolean {
    const entry = this.cache.get(keyString);
    if (!entry) {
      return false;
    }
    
    this.cache.delete(keyString);
    this.accessOrder.delete(keyString);
    this.stats.memoryUsage -= entry.size;
    this.stats.totalEntries--;
    
    return true;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = {
      totalEntries: 0,
      hits: 0,
      misses: 0,
      memoryUsage: 0,
      hitRate: 0
    };
    this.accessCounter = 0;
  }

  /**
   * Gets current cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Evicts expired entries
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.delete(key);
        evicted++;
      }
    }
    
    return evicted;
  }

  /**
   * Serializes a cache key to a string
   */
  private serializeKey(key: CacheKey): string {
    return `${key.transformationType}:${key.schemaHash}:${key.version.version}:${key.optionsHash}`;
  }

  /**
   * Estimates the memory size of an object
   */
  private estimateSize(obj: any): number {
    const jsonString = JSON.stringify(obj);
    return jsonString.length * 2; // Rough estimate: 2 bytes per character
  }

  /**
   * Evicts entries if cache limits are exceeded
   */
  private evictIfNeeded(newEntrySize: number): void {
    const maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;
    
    // Evict if we would exceed memory limit
    while (this.stats.memoryUsage + newEntrySize > maxMemoryBytes && this.cache.size > 0) {
      this.evictLRU();
    }
    
    // Evict if we would exceed entry count limit
    while (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }
  }

  /**
   * Evicts the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Updates the cache hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

/**
 * Creates a hash of schema content for caching
 */
export function createSchemaHash(schema: any): string {
  const jsonString = JSON.stringify(schema, Object.keys(schema).sort());
  return hashString(jsonString);
}

/**
 * Creates a hash of options that affect transformation
 */
export function createOptionsHash(options?: OpenAPI31ParseOptions): string {
  if (!options) {
    return 'default';
  }
  
  const relevantOptions = {
    strictNullHandling: options.strictNullHandling,
    enableWebhooks: options.enableWebhooks,
    enableConditionalSchemas: options.enableConditionalSchemas,
    enablePrefixItems: options.enablePrefixItems,
    enableConstKeyword: options.enableConstKeyword,
    enableContainsKeyword: options.enableContainsKeyword,
    enableEnhancedDiscriminator: options.enableEnhancedDiscriminator,
    enableUnevaluatedProperties: options.enableUnevaluatedProperties,
    fallbackToOpenAPI30: options.fallbackToOpenAPI30
  };
  
  const jsonString = JSON.stringify(relevantOptions, Object.keys(relevantOptions).sort());
  return hashString(jsonString);
}

/**
 * Simple string hashing function
 */
function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Global cache instance
 */
export const globalSchemaCache = new SchemaTransformationCache({
  maxEntries: 1000,
  maxMemoryMB: 100,
  ttlMs: 30 * 60 * 1000 // 30 minutes
});