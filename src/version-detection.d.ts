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
export declare function detectOpenAPIVersion(schema: any): OpenAPIVersionInfo;
/**
 * Parses a version string into structured version information
 * @param versionString Version string (e.g., "3.1.0")
 * @returns Parsed version information
 * @throws Error if version string is invalid
 */
export declare function parseVersionString(versionString: string): OpenAPIVersionInfo;
/**
 * Validates that the OpenAPI version is supported
 * @param version Version information
 * @throws Error if version is not supported
 */
export declare function validateVersionSupport(version: OpenAPIVersionInfo): void;
/**
 * Checks if a version supports specific features
 * @param version Version information
 * @returns Object with feature support flags
 */
export declare function getFeatureSupport(version: OpenAPIVersionInfo): {
    webhooks: boolean;
    jsonSchemaDraft202012: boolean;
    typeArrays: boolean;
    conditionalSchemas: boolean;
    prefixItems: boolean;
    unevaluatedProperties: boolean;
    constKeyword: boolean;
    containsKeyword: boolean;
    enhancedDiscriminator: boolean;
};
