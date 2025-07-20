import type { GenerateOptions, OpenAPI31ParseOptions } from "./GenerateOptions";

/**
 * Error class for invalid configuration options
 */
export class OptionsValidationError extends Error {
  constructor(
    public option: string,
    public value: any,
    public suggestion?: string
  ) {
    super(`Invalid option '${option}' with value '${value}'. ${suggestion || ''}`);
    this.name = 'OptionsValidationError';
  }
}

/**
 * Default OpenAPI 3.1 parse options
 */
export const DEFAULT_OPENAPI31_OPTIONS: Required<OpenAPI31ParseOptions> = {
  enableWebhooks: false,
  strictNullHandling: true,
  enableConditionalSchemas: true,
  enablePrefixItems: true,
  enableUnevaluatedProperties: true,
  enableConstKeyword: true,
  enableContainsKeyword: true,
  enableEnhancedDiscriminator: true,
  fallbackToOpenAPI30: false,
};

/**
 * Validates and normalizes OpenAPI 3.1 parse options
 * @param options The options to validate and normalize
 * @returns Normalized options with defaults applied
 */
export function validateAndNormalizeOpenAPI31Options(
  options?: OpenAPI31ParseOptions
): OpenAPI31ParseOptions {
  if (!options) {
    return {};
  }

  const normalized: OpenAPI31ParseOptions = {};

  // Validate and normalize boolean options
  const booleanOptions: (keyof OpenAPI31ParseOptions)[] = [
    'enableWebhooks',
    'strictNullHandling',
    'enableConditionalSchemas',
    'enablePrefixItems',
    'enableUnevaluatedProperties',
    'enableConstKeyword',
    'enableContainsKeyword',
    'enableEnhancedDiscriminator',
    'fallbackToOpenAPI30',
  ];

  for (const option of booleanOptions) {
    const value = options[option];
    if (value !== undefined) {
      if (typeof value !== 'boolean') {
        throw new OptionsValidationError(
          option,
          value,
          'Must be a boolean value (true or false)'
        );
      }
      normalized[option] = value;
    }
  }

  return normalized;
}

/**
 * Applies default values to OpenAPI 3.1 options
 * @param options The options to apply defaults to
 * @returns Options with defaults applied
 */
export function applyOpenAPI31Defaults(
  options?: OpenAPI31ParseOptions
): Required<OpenAPI31ParseOptions> {
  const normalized = validateAndNormalizeOpenAPI31Options(options);
  
  return {
    enableWebhooks: normalized.enableWebhooks ?? DEFAULT_OPENAPI31_OPTIONS.enableWebhooks,
    strictNullHandling: normalized.strictNullHandling ?? DEFAULT_OPENAPI31_OPTIONS.strictNullHandling,
    enableConditionalSchemas: normalized.enableConditionalSchemas ?? DEFAULT_OPENAPI31_OPTIONS.enableConditionalSchemas,
    enablePrefixItems: normalized.enablePrefixItems ?? DEFAULT_OPENAPI31_OPTIONS.enablePrefixItems,
    enableUnevaluatedProperties: normalized.enableUnevaluatedProperties ?? DEFAULT_OPENAPI31_OPTIONS.enableUnevaluatedProperties,
    enableConstKeyword: normalized.enableConstKeyword ?? DEFAULT_OPENAPI31_OPTIONS.enableConstKeyword,
    enableContainsKeyword: normalized.enableContainsKeyword ?? DEFAULT_OPENAPI31_OPTIONS.enableContainsKeyword,
    enableEnhancedDiscriminator: normalized.enableEnhancedDiscriminator ?? DEFAULT_OPENAPI31_OPTIONS.enableEnhancedDiscriminator,
    fallbackToOpenAPI30: normalized.fallbackToOpenAPI30 ?? DEFAULT_OPENAPI31_OPTIONS.fallbackToOpenAPI30,
  };
}

/**
 * Validates the complete GenerateOptions configuration
 * @param options The options to validate
 * @returns Validated options
 */
export function validateGenerateOptions(options: GenerateOptions): GenerateOptions {
  // Validate required options
  if (!options.schemaFile) {
    throw new OptionsValidationError(
      'schemaFile',
      options.schemaFile,
      'Schema file path is required'
    );
  }

  if (!options.schemaType) {
    throw new OptionsValidationError(
      'schemaType',
      options.schemaType,
      'Schema type is required (yaml, json, or custom)'
    );
  }

  if (!['yaml', 'json', 'custom'].includes(options.schemaType)) {
    throw new OptionsValidationError(
      'schemaType',
      options.schemaType,
      'Schema type must be one of: yaml, json, custom'
    );
  }

  if (!options.directory) {
    throw new OptionsValidationError(
      'directory',
      options.directory,
      'Output directory is required'
    );
  }

  // Validate directory format
  if (typeof options.directory !== 'string' && !Array.isArray(options.directory)) {
    throw new OptionsValidationError(
      'directory',
      options.directory,
      'Directory must be a string or array of strings'
    );
  }

  if (Array.isArray(options.directory)) {
    if (options.directory.length === 0) {
      throw new OptionsValidationError(
        'directory',
        options.directory,
        'Directory array cannot be empty'
      );
    }
    
    for (const dir of options.directory) {
      if (typeof dir !== 'string') {
        throw new OptionsValidationError(
          'directory',
          dir,
          'All directory entries must be strings'
        );
      }
    }
  }

  // Validate boolean options
  const booleanOptions: (keyof GenerateOptions)[] = [
    'addFormats',
    'skipMetaFile',
    'skipSchemaFile',
    'skipDecoders',
    'esm',
    'debug',
  ];

  for (const option of booleanOptions) {
    const value = options[option];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new OptionsValidationError(
        option,
        value,
        'Must be a boolean value (true or false)'
      );
    }
  }

  // Validate standalone options
  if (options.standalone) {
    if (typeof options.standalone !== 'object') {
      throw new OptionsValidationError(
        'standalone',
        options.standalone,
        'Standalone options must be an object'
      );
    }

    if (options.standalone.validatorOutput && 
        !['module', 'commonjs'].includes(options.standalone.validatorOutput)) {
      throw new OptionsValidationError(
        'standalone.validatorOutput',
        options.standalone.validatorOutput,
        'Validator output must be either "module" or "commonjs"'
      );
    }

    if (options.standalone.mergeDecoders !== undefined && 
        typeof options.standalone.mergeDecoders !== 'boolean') {
      throw new OptionsValidationError(
        'standalone.mergeDecoders',
        options.standalone.mergeDecoders,
        'mergeDecoders must be a boolean value'
      );
    }
  }

  // Validate decoders array
  if (options.decoders !== undefined) {
    if (!Array.isArray(options.decoders)) {
      throw new OptionsValidationError(
        'decoders',
        options.decoders,
        'Decoders must be an array of strings'
      );
    }

    for (const decoder of options.decoders) {
      if (typeof decoder !== 'string') {
        throw new OptionsValidationError(
          'decoders',
          decoder,
          'All decoder entries must be strings'
        );
      }
    }
  }

  // Validate OpenAPI 3.1 options
  if (options.openapi31) {
    validateAndNormalizeOpenAPI31Options(options.openapi31);
  }

  return options;
}

/**
 * Checks if OpenAPI 3.1 features are enabled based on options
 * @param options The OpenAPI 3.1 options
 * @returns Object indicating which features are enabled
 */
export function getEnabledFeatures(options?: OpenAPI31ParseOptions) {
  const normalizedOptions = applyOpenAPI31Defaults(options);
  
  return {
    webhooks: normalizedOptions.enableWebhooks,
    strictNullHandling: normalizedOptions.strictNullHandling,
    conditionalSchemas: normalizedOptions.enableConditionalSchemas,
    prefixItems: normalizedOptions.enablePrefixItems,
    unevaluatedProperties: normalizedOptions.enableUnevaluatedProperties,
    constKeyword: normalizedOptions.enableConstKeyword,
    containsKeyword: normalizedOptions.enableContainsKeyword,
    enhancedDiscriminator: normalizedOptions.enableEnhancedDiscriminator,
    fallbackToOpenAPI30: normalizedOptions.fallbackToOpenAPI30,
  };
}

/**
 * Creates a feature flag checker for gradual rollout
 * @param options The OpenAPI 3.1 options
 * @returns Function to check if a feature is enabled
 */
export function createFeatureChecker(options?: OpenAPI31ParseOptions) {
  const enabledFeatures = getEnabledFeatures(options);
  
  return {
    isWebhooksEnabled: () => enabledFeatures.webhooks,
    isStrictNullHandlingEnabled: () => enabledFeatures.strictNullHandling,
    isConditionalSchemasEnabled: () => enabledFeatures.conditionalSchemas,
    isPrefixItemsEnabled: () => enabledFeatures.prefixItems,
    isUnevaluatedPropertiesEnabled: () => enabledFeatures.unevaluatedProperties,
    isConstKeywordEnabled: () => enabledFeatures.constKeyword,
    isContainsKeywordEnabled: () => enabledFeatures.containsKeyword,
    isEnhancedDiscriminatorEnabled: () => enabledFeatures.enhancedDiscriminator,
    isFallbackToOpenAPI30Enabled: () => enabledFeatures.fallbackToOpenAPI30,
    
    // Convenience method to check multiple features at once
    areAllEnabled: (...features: (keyof typeof enabledFeatures)[]) => 
      features.every(feature => enabledFeatures[feature]),
    
    // Get all enabled features as an array
    getEnabledFeatureNames: () => 
      Object.entries(enabledFeatures)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name),
  };
}