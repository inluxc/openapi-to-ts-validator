/**
 * Debug logging system for OpenAPI 3.1 processing
 */

import { OpenAPIVersionInfo } from '../version-detection';

/**
 * Log levels for debug output
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Debug logging configuration
 */
export interface DebugConfig {
  /** Enable debug logging */
  enabled: boolean;
  /** Minimum log level to output */
  level: LogLevel;
  /** Include timestamps in log output */
  includeTimestamp: boolean;
  /** Include stack traces for errors */
  includeStackTrace: boolean;
  /** Custom log output function */
  logFunction?: (level: LogLevel, message: string) => void;
}

/**
 * Default debug configuration
 */
const DEFAULT_CONFIG: DebugConfig = {
  enabled: false,
  level: LogLevel.INFO,
  includeTimestamp: true,
  includeStackTrace: false
};

/**
 * Global debug configuration
 */
let debugConfig: DebugConfig = { ...DEFAULT_CONFIG };

/**
 * Configure debug logging
 */
export function configureDebugLogging(config: Partial<DebugConfig>): void {
  debugConfig = { ...debugConfig, ...config };
}

/**
 * Get current debug configuration
 */
export function getDebugConfig(): DebugConfig {
  return { ...debugConfig };
}

/**
 * Check if debug logging is enabled for a specific level
 */
export function isDebugEnabled(level: LogLevel = LogLevel.DEBUG): boolean {
  return debugConfig.enabled && debugConfig.level >= level;
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const levelName = LogLevel[level];
  const timestamp = debugConfig.includeTimestamp ? new Date().toISOString() : '';
  
  return `${timestamp ? `[${timestamp}] ` : ''}[${levelName}] ${message}`;
}

/**
 * Internal logging function
 */
function log(level: LogLevel, message: string): void {
  if (!isDebugEnabled(level)) {
    return;
  }

  const formattedMessage = formatMessage(level, message);
  
  if (debugConfig.logFunction) {
    debugConfig.logFunction(level, formattedMessage);
  } else {
    // Default to console output
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
        break;
    }
  }
}

/**
 * Debug logger for OpenAPI 3.1 processing
 */
export class OpenAPI31Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error): void {
    const fullMessage = `[${this.context}] ${message}`;
    log(LogLevel.ERROR, fullMessage);
    
    if (error && debugConfig.includeStackTrace) {
      log(LogLevel.ERROR, `Stack trace: ${error.stack}`);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    log(LogLevel.WARN, `[${this.context}] ${message}`);
  }

  /**
   * Log info message
   */
  info(message: string): void {
    log(LogLevel.INFO, `[${this.context}] ${message}`);
  }

  /**
   * Log debug message
   */
  debug(message: string): void {
    log(LogLevel.DEBUG, `[${this.context}] ${message}`);
  }

  /**
   * Log trace message
   */
  trace(message: string): void {
    log(LogLevel.TRACE, `[${this.context}] ${message}`);
  }

  /**
   * Log processing step
   */
  step(stepName: string, details?: Record<string, any>): void {
    let message = `Processing step: ${stepName}`;
    if (details) {
      message += ` - ${JSON.stringify(details)}`;
    }
    this.debug(message);
  }

  /**
   * Log feature detection
   */
  featureDetected(feature: string, location: string, supported: boolean): void {
    const status = supported ? 'SUPPORTED' : 'UNSUPPORTED';
    this.info(`Feature '${feature}' detected at '${location}' - ${status}`);
  }

  /**
   * Log schema transformation
   */
  transformation(feature: string, location: string, before: any, after: any): void {
    if (isDebugEnabled(LogLevel.TRACE)) {
      this.trace(`Transforming '${feature}' at '${location}':`);
      this.trace(`  Before: ${JSON.stringify(before, null, 2)}`);
      this.trace(`  After: ${JSON.stringify(after, null, 2)}`);
    } else {
      this.debug(`Transformed '${feature}' at '${location}'`);
    }
  }

  /**
   * Log version information
   */
  version(version: OpenAPIVersionInfo): void {
    this.info(`Processing OpenAPI ${version.version} (3.1: ${version.isVersion31})`);
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: string): OpenAPI31Logger {
    return new OpenAPI31Logger(`${this.context}:${additionalContext}`);
  }
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string): OpenAPI31Logger {
  return new OpenAPI31Logger(context);
}

/**
 * Convenience loggers for common contexts
 */
export const loggers = {
  parser: createLogger('Parser'),
  transformer: createLogger('Transformer'),
  generator: createLogger('Generator'),
  validator: createLogger('Validator'),
  discriminator: createLogger('Discriminator'),
  webhook: createLogger('Webhook'),
  conditional: createLogger('Conditional'),
  version: createLogger('Version')
};

/**
 * Enable debug logging with environment variable
 */
if (process.env.OPENAPI_31_DEBUG === 'true' || process.env.DEBUG === 'openapi-31') {
  configureDebugLogging({
    enabled: true,
    level: LogLevel.DEBUG,
    includeStackTrace: true
  });
}

/**
 * Enable trace logging with environment variable
 */
if (process.env.OPENAPI_31_TRACE === 'true' || process.env.DEBUG === 'openapi-31:trace') {
  configureDebugLogging({
    enabled: true,
    level: LogLevel.TRACE,
    includeStackTrace: true
  });
}