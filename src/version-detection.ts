/**
 * OpenAPI version detection and validation utilities
 */

export interface OpenAPIVersionInfo {
  /** Full version string (e.g., "3.1.0") */
  version: string;
  /** Major version number */
  major: number;
  /** Minor version number */
  minor: number;
  /** Patch version number (optional) */
  patch?: number;
  /** True if this is OpenAPI 3.1.x */
  isVersion31: boolean;
  /** True if this is OpenAPI 3.0.x */
  isVersion30: boolean;
}

/**
 * Detects OpenAPI version from a schema object
 * @param schema The OpenAPI schema object
 * @returns Version information
 * @throws Error if version is missing or invalid
 */
export function detectOpenAPIVersion(schema: any): OpenAPIVersionInfo {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema must be a valid object');
  }

  const versionField = schema.openapi;
  
  if (!versionField) {
    throw new Error('Missing "openapi" field in schema. This may not be a valid OpenAPI specification.');
  }

  if (typeof versionField !== 'string') {
    throw new Error('OpenAPI version must be a string');
  }

  return parseVersionString(versionField);
}

/**
 * Parses a version string into structured version information
 * @param versionString Version string (e.g., "3.1.0")
 * @returns Parsed version information
 * @throws Error if version string is invalid
 */
export function parseVersionString(versionString: string): OpenAPIVersionInfo {
  const versionRegex = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-.*)?$/;
  const match = versionString.match(versionRegex);

  if (!match) {
    throw new Error(`Invalid OpenAPI version format: "${versionString}". Expected format: "major.minor.patch"`);
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = match[3] ? parseInt(match[3], 10) : undefined;

  return {
    version: versionString,
    major,
    minor,
    patch,
    isVersion31: major === 3 && minor === 1,
    isVersion30: major === 3 && minor === 0,
  };
}

/**
 * Validates that the OpenAPI version is supported
 * @param version Version information
 * @throws Error if version is not supported
 */
export function validateVersionSupport(version: OpenAPIVersionInfo): void {
  if (version.major !== 3) {
    throw new Error(`OpenAPI major version ${version.major} is not supported. Only OpenAPI 3.x is supported.`);
  }

  if (version.minor !== 0 && version.minor !== 1) {
    throw new Error(`OpenAPI version ${version.version} is not supported. Only OpenAPI 3.0.x and 3.1.x are supported.`);
  }
}

/**
 * Checks if a version supports specific features
 * @param version Version information
 * @returns Object with feature support flags
 */
export function getFeatureSupport(version: OpenAPIVersionInfo) {
  return {
    webhooks: version.isVersion31,
    jsonSchemaDraft202012: version.isVersion31,
    typeArrays: version.isVersion31,
    conditionalSchemas: version.isVersion31,
    prefixItems: version.isVersion31,
    unevaluatedProperties: version.isVersion31,
    constKeyword: version.isVersion31,
    containsKeyword: version.isVersion31,
    enhancedDiscriminator: version.isVersion31,
  };
}