"use strict";
/**
 * OpenAPI version detection and validation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeatureSupport = exports.validateVersionSupport = exports.parseVersionString = exports.detectOpenAPIVersion = void 0;
/**
 * Detects OpenAPI version from a schema object
 * @param schema The OpenAPI schema object
 * @returns Version information
 * @throws Error if version is missing or invalid
 */
function detectOpenAPIVersion(schema) {
    if (!schema || typeof schema !== 'object') {
        throw new Error('Schema must be a valid object');
    }
    var versionField = schema.openapi;
    if (!versionField) {
        throw new Error('Missing "openapi" field in schema. This may not be a valid OpenAPI specification.');
    }
    if (typeof versionField !== 'string') {
        throw new Error('OpenAPI version must be a string');
    }
    return parseVersionString(versionField);
}
exports.detectOpenAPIVersion = detectOpenAPIVersion;
/**
 * Parses a version string into structured version information
 * @param versionString Version string (e.g., "3.1.0")
 * @returns Parsed version information
 * @throws Error if version string is invalid
 */
function parseVersionString(versionString) {
    var versionRegex = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-.*)?$/;
    var match = versionString.match(versionRegex);
    if (!match) {
        throw new Error("Invalid OpenAPI version format: \"".concat(versionString, "\". Expected format: \"major.minor.patch\""));
    }
    var major = parseInt(match[1], 10);
    var minor = parseInt(match[2], 10);
    var patch = match[3] ? parseInt(match[3], 10) : undefined;
    return {
        version: versionString,
        major: major,
        minor: minor,
        patch: patch,
        isVersion31: major === 3 && minor === 1,
        isVersion30: major === 3 && minor === 0,
    };
}
exports.parseVersionString = parseVersionString;
/**
 * Validates that the OpenAPI version is supported
 * @param version Version information
 * @throws Error if version is not supported
 */
function validateVersionSupport(version) {
    if (version.major !== 3) {
        throw new Error("OpenAPI major version ".concat(version.major, " is not supported. Only OpenAPI 3.x is supported."));
    }
    if (version.minor !== 0 && version.minor !== 1) {
        throw new Error("OpenAPI version ".concat(version.version, " is not supported. Only OpenAPI 3.0.x and 3.1.x are supported."));
    }
}
exports.validateVersionSupport = validateVersionSupport;
/**
 * Checks if a version supports specific features
 * @param version Version information
 * @returns Object with feature support flags
 */
function getFeatureSupport(version) {
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
exports.getFeatureSupport = getFeatureSupport;
//# sourceMappingURL=version-detection.js.map