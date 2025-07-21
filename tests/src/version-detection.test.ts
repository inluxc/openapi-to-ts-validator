import { 
  detectOpenAPIVersion, 
  parseVersionString, 
  validateVersionSupport, 
  getFeatureSupport,
  type OpenAPIVersionInfo 
} from "openapi-to-ts-validator/src/version-detection";

describe("version-detection", () => {
  describe("parseVersionString", () => {
    test("should parse valid OpenAPI 3.0.0 version", () => {
      const result = parseVersionString("3.0.0");
      expect(result).toEqual({
        version: "3.0.0",
        major: 3,
        minor: 0,
        patch: 0,
        isVersion31: false,
        isVersion30: true,
      });
    });

    test("should parse valid OpenAPI 3.1.0 version", () => {
      const result = parseVersionString("3.1.0");
      expect(result).toEqual({
        version: "3.1.0",
        major: 3,
        minor: 1,
        patch: 0,
        isVersion31: true,
        isVersion30: false,
      });
    });

    test("should parse version without patch", () => {
      const result = parseVersionString("3.0");
      expect(result).toEqual({
        version: "3.0",
        major: 3,
        minor: 0,
        patch: undefined,
        isVersion31: false,
        isVersion30: true,
      });
    });

    test("should parse version with pre-release suffix", () => {
      const result = parseVersionString("3.1.0-beta.1");
      expect(result).toEqual({
        version: "3.1.0-beta.1",
        major: 3,
        minor: 1,
        patch: 0,
        isVersion31: true,
        isVersion30: false,
      });
    });

    test("should handle different patch versions", () => {
      const result = parseVersionString("3.0.3");
      expect(result).toEqual({
        version: "3.0.3",
        major: 3,
        minor: 0,
        patch: 3,
        isVersion31: false,
        isVersion30: true,
      });
    });

    test("should throw error for invalid version format", () => {
      expect(() => parseVersionString("invalid")).toThrow(
        'Invalid OpenAPI version format: "invalid". Expected format: "major.minor.patch"'
      );
    });

    test("should throw error for empty string", () => {
      expect(() => parseVersionString("")).toThrow(
        'Invalid OpenAPI version format: "". Expected format: "major.minor.patch"'
      );
    });

    test("should throw error for version with only major", () => {
      expect(() => parseVersionString("3")).toThrow(
        'Invalid OpenAPI version format: "3". Expected format: "major.minor.patch"'
      );
    });
  });

  describe("detectOpenAPIVersion", () => {
    test("should detect OpenAPI 3.0.0 from schema", () => {
      const schema = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
      };
      
      const result = detectOpenAPIVersion(schema);
      expect(result.version).toBe("3.0.0");
      expect(result.isVersion30).toBe(true);
      expect(result.isVersion31).toBe(false);
    });

    test("should detect OpenAPI 3.1.0 from schema", () => {
      const schema = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
      };
      
      const result = detectOpenAPIVersion(schema);
      expect(result.version).toBe("3.1.0");
      expect(result.isVersion30).toBe(false);
      expect(result.isVersion31).toBe(true);
    });

    test("should throw error for missing openapi field", () => {
      const schema = {
        info: { title: "Test API", version: "1.0.0" },
      };
      
      expect(() => detectOpenAPIVersion(schema)).toThrow(
        'Missing "openapi" field in schema. This may not be a valid OpenAPI specification.'
      );
    });

    test("should throw error for non-string openapi field", () => {
      const schema = {
        openapi: 3.0,
        info: { title: "Test API", version: "1.0.0" },
      };
      
      expect(() => detectOpenAPIVersion(schema)).toThrow(
        "OpenAPI version must be a string"
      );
    });

    test("should throw error for null schema", () => {
      expect(() => detectOpenAPIVersion(null)).toThrow(
        "Schema must be a valid object"
      );
    });

    test("should throw error for undefined schema", () => {
      expect(() => detectOpenAPIVersion(undefined)).toThrow(
        "Schema must be a valid object"
      );
    });

    test("should throw error for non-object schema", () => {
      expect(() => detectOpenAPIVersion("not an object")).toThrow(
        "Schema must be a valid object"
      );
    });
  });

  describe("validateVersionSupport", () => {
    test("should accept OpenAPI 3.0.x versions", () => {
      const version: OpenAPIVersionInfo = {
        version: "3.0.0",
        major: 3,
        minor: 0,
        patch: 0,
        isVersion30: true,
        isVersion31: false,
      };
      
      expect(() => validateVersionSupport(version)).not.toThrow();
    });

    test("should accept OpenAPI 3.1.x versions", () => {
      const version: OpenAPIVersionInfo = {
        version: "3.1.0",
        major: 3,
        minor: 1,
        patch: 0,
        isVersion30: false,
        isVersion31: true,
      };
      
      expect(() => validateVersionSupport(version)).not.toThrow();
    });

    test("should reject OpenAPI 2.x versions", () => {
      const version: OpenAPIVersionInfo = {
        version: "2.0.0",
        major: 2,
        minor: 0,
        patch: 0,
        isVersion30: false,
        isVersion31: false,
      };
      
      expect(() => validateVersionSupport(version)).toThrow(
        "OpenAPI major version 2 is not supported. Only OpenAPI 3.x is supported."
      );
    });

    test("should reject OpenAPI 4.x versions", () => {
      const version: OpenAPIVersionInfo = {
        version: "4.0.0",
        major: 4,
        minor: 0,
        patch: 0,
        isVersion30: false,
        isVersion31: false,
      };
      
      expect(() => validateVersionSupport(version)).toThrow(
        "OpenAPI major version 4 is not supported. Only OpenAPI 3.x is supported."
      );
    });

    test("should reject OpenAPI 3.2.x versions", () => {
      const version: OpenAPIVersionInfo = {
        version: "3.2.0",
        major: 3,
        minor: 2,
        patch: 0,
        isVersion30: false,
        isVersion31: false,
      };
      
      expect(() => validateVersionSupport(version)).toThrow(
        "OpenAPI version 3.2.0 is not supported. Only OpenAPI 3.0.x and 3.1.x are supported."
      );
    });
  });

  describe("getFeatureSupport", () => {
    test("should return correct feature support for OpenAPI 3.0", () => {
      const version: OpenAPIVersionInfo = {
        version: "3.0.0",
        major: 3,
        minor: 0,
        patch: 0,
        isVersion30: true,
        isVersion31: false,
      };
      
      const features = getFeatureSupport(version);
      expect(features).toEqual({
        webhooks: false,
        jsonSchemaDraft202012: false,
        typeArrays: false,
        conditionalSchemas: false,
        prefixItems: false,
        unevaluatedProperties: false,
        constKeyword: false,
        containsKeyword: false,
        enhancedDiscriminator: false,
      });
    });

    test("should return correct feature support for OpenAPI 3.1", () => {
      const version: OpenAPIVersionInfo = {
        version: "3.1.0",
        major: 3,
        minor: 1,
        patch: 0,
        isVersion30: false,
        isVersion31: true,
      };
      
      const features = getFeatureSupport(version);
      expect(features).toEqual({
        webhooks: true,
        jsonSchemaDraft202012: true,
        typeArrays: true,
        conditionalSchemas: true,
        prefixItems: true,
        unevaluatedProperties: true,
        constKeyword: true,
        containsKeyword: true,
        enhancedDiscriminator: true,
      });
    });
  });

  describe("integration with various OpenAPI spec formats", () => {
    test("should handle minimal OpenAPI 3.0 spec", () => {
      const schema = {
        openapi: "3.0.0",
        info: {
          title: "Minimal API",
          version: "1.0.0"
        },
        paths: {}
      };
      
      const version = detectOpenAPIVersion(schema);
      expect(version.isVersion30).toBe(true);
      expect(() => validateVersionSupport(version)).not.toThrow();
    });

    test("should handle minimal OpenAPI 3.1 spec", () => {
      const schema = {
        openapi: "3.1.0",
        info: {
          title: "Minimal API",
          version: "1.0.0"
        },
        paths: {}
      };
      
      const version = detectOpenAPIVersion(schema);
      expect(version.isVersion31).toBe(true);
      expect(() => validateVersionSupport(version)).not.toThrow();
    });

    test("should handle complex OpenAPI 3.0 spec with components", () => {
      const schema = {
        openapi: "3.0.2",
        info: {
          title: "Complex API",
          version: "2.1.0"
        },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "Success"
                }
              }
            }
          }
        },
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" }
              }
            }
          }
        }
      };
      
      const version = detectOpenAPIVersion(schema);
      expect(version.version).toBe("3.0.2");
      expect(version.isVersion30).toBe(true);
      expect(() => validateVersionSupport(version)).not.toThrow();
    });

    test("should handle OpenAPI 3.1 spec with webhooks", () => {
      const schema = {
        openapi: "3.1.0",
        info: {
          title: "API with Webhooks",
          version: "1.0.0"
        },
        paths: {},
        webhooks: {
          userCreated: {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        userId: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const version = detectOpenAPIVersion(schema);
      expect(version.isVersion31).toBe(true);
      const features = getFeatureSupport(version);
      expect(features.webhooks).toBe(true);
    });
  });
});