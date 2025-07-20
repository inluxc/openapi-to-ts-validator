import { parseSchema } from "../../src/parse-schema";
import { validateAndNormalizeOpenAPI31Options, applyOpenAPI31Defaults } from "../../src/options-validation";
import type { OpenAPI31ParseOptions } from "../../src/GenerateOptions";
import { join } from "path";

describe("OpenAPI 3.1 Options Integration", () => {
  const testSchemaPath = join(__dirname, "../schemas/openapi-3.1-test.yaml");

  describe("Options Processing in Schema Parsing", () => {
    it("should parse OpenAPI 3.1 schema with default options", async () => {
      const result = await parseSchema(testSchemaPath, "yaml");
      
      expect(result.version.isVersion31).toBe(true);
      expect(result.definitions).toBeDefined();
      expect(result.definitions.User).toBeDefined();
    });

    it("should parse OpenAPI 3.1 schema with custom options", async () => {
      const options: OpenAPI31ParseOptions = {
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

      const result = await parseSchema(testSchemaPath, "yaml", options);
      
      expect(result.version.isVersion31).toBe(true);
      expect(result.definitions).toBeDefined();
      expect(result.definitions.User).toBeDefined();
    });

    it("should handle disabled features gracefully", async () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: false,
        strictNullHandling: false,
        enableConditionalSchemas: false,
        enablePrefixItems: false,
        enableUnevaluatedProperties: false,
        enableConstKeyword: false,
        enableContainsKeyword: false,
        enableEnhancedDiscriminator: false,
        fallbackToOpenAPI30: true,
      };

      // This should still work, just with features disabled
      const result = await parseSchema(testSchemaPath, "yaml", options);
      
      expect(result.version.isVersion31).toBe(true);
      expect(result.definitions).toBeDefined();
      expect(result.definitions.User).toBeDefined();
    });

    it("should validate options before processing", async () => {
      const invalidOptions = {
        enableWebhooks: "true", // Invalid type
        strictNullHandling: 1, // Invalid type
      } as any;

      // Should throw validation error
      await expect(parseSchema(testSchemaPath, "yaml", invalidOptions))
        .rejects.toThrow();
    });
  });

  describe("Feature Flag Behavior", () => {
    it("should apply null handling based on strictNullHandling flag", async () => {
      // Test with strict null handling enabled (default)
      const strictOptions: OpenAPI31ParseOptions = {
        strictNullHandling: true,
      };

      const strictResult = await parseSchema(testSchemaPath, "yaml", strictOptions);
      expect(strictResult.definitions.User).toBeDefined();

      // Test with strict null handling disabled
      const nonStrictOptions: OpenAPI31ParseOptions = {
        strictNullHandling: false,
      };

      const nonStrictResult = await parseSchema(testSchemaPath, "yaml", nonStrictOptions);
      expect(nonStrictResult.definitions.User).toBeDefined();

      // Both should work, but may have different internal processing
      expect(strictResult.version.isVersion31).toBe(true);
      expect(nonStrictResult.version.isVersion31).toBe(true);
    });

    it("should handle prefixItems based on enablePrefixItems flag", async () => {
      // Test with prefixItems enabled (default)
      const enabledOptions: OpenAPI31ParseOptions = {
        enablePrefixItems: true,
      };

      const enabledResult = await parseSchema(testSchemaPath, "yaml", enabledOptions);
      expect(enabledResult.definitions.User).toBeDefined();

      // Test with prefixItems disabled
      const disabledOptions: OpenAPI31ParseOptions = {
        enablePrefixItems: false,
      };

      const disabledResult = await parseSchema(testSchemaPath, "yaml", disabledOptions);
      expect(disabledResult.definitions.User).toBeDefined();

      // Both should work
      expect(enabledResult.version.isVersion31).toBe(true);
      expect(disabledResult.version.isVersion31).toBe(true);
    });
  });

  describe("Options Normalization", () => {
    it("should normalize partial options correctly", () => {
      const partialOptions: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        // Other options should get defaults
      };

      const normalized = validateAndNormalizeOpenAPI31Options(partialOptions);
      
      expect(normalized.enableWebhooks).toBe(true);
      expect(normalized.strictNullHandling).toBe(false);
      // Other options should be undefined (will get defaults later)
      expect(normalized.enableConditionalSchemas).toBeUndefined();
    });

    it("should apply defaults correctly", () => {
      const partialOptions: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
      };

      const withDefaults = applyOpenAPI31Defaults(partialOptions);
      
      expect(withDefaults.enableWebhooks).toBe(true);
      expect(withDefaults.strictNullHandling).toBe(false);
      expect(withDefaults.enableConditionalSchemas).toBe(true); // default
      expect(withDefaults.enablePrefixItems).toBe(true); // default
      expect(withDefaults.enableUnevaluatedProperties).toBe(true); // default
      expect(withDefaults.enableConstKeyword).toBe(true); // default
      expect(withDefaults.enableContainsKeyword).toBe(true); // default
      expect(withDefaults.enableEnhancedDiscriminator).toBe(true); // default
      expect(withDefaults.fallbackToOpenAPI30).toBe(false); // default
    });

    it("should handle empty options correctly", () => {
      const emptyOptions = {};
      const withDefaults = applyOpenAPI31Defaults(emptyOptions);
      
      // Should get all defaults
      expect(withDefaults.enableWebhooks).toBe(false);
      expect(withDefaults.strictNullHandling).toBe(true);
      expect(withDefaults.enableConditionalSchemas).toBe(true);
      expect(withDefaults.enablePrefixItems).toBe(true);
      expect(withDefaults.enableUnevaluatedProperties).toBe(true);
      expect(withDefaults.enableConstKeyword).toBe(true);
      expect(withDefaults.enableContainsKeyword).toBe(true);
      expect(withDefaults.enableEnhancedDiscriminator).toBe(true);
      expect(withDefaults.fallbackToOpenAPI30).toBe(false);
    });

    it("should handle undefined options correctly", () => {
      const withDefaults = applyOpenAPI31Defaults(undefined);
      
      // Should get all defaults
      expect(withDefaults.enableWebhooks).toBe(false);
      expect(withDefaults.strictNullHandling).toBe(true);
      expect(withDefaults.enableConditionalSchemas).toBe(true);
      expect(withDefaults.enablePrefixItems).toBe(true);
      expect(withDefaults.enableUnevaluatedProperties).toBe(true);
      expect(withDefaults.enableConstKeyword).toBe(true);
      expect(withDefaults.enableContainsKeyword).toBe(true);
      expect(withDefaults.enableEnhancedDiscriminator).toBe(true);
      expect(withDefaults.fallbackToOpenAPI30).toBe(false);
    });
  });

  describe("Backward Compatibility", () => {
    it("should not affect OpenAPI 3.0 schema processing", async () => {
      const openapi30SchemaPath = join(__dirname, "../schemas/simple-schema.yaml");
      
      // Parse without options
      const resultWithoutOptions = await parseSchema(openapi30SchemaPath, "yaml");
      
      // Parse with OpenAPI 3.1 options (should be ignored for 3.0 schemas)
      const openapi31Options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: false,
      };
      
      const resultWithOptions = await parseSchema(openapi30SchemaPath, "yaml", openapi31Options);
      
      // Results should be identical for OpenAPI 3.0 schemas
      expect(resultWithoutOptions.version.isVersion31).toBe(false);
      expect(resultWithOptions.version.isVersion31).toBe(false);
      expect(resultWithoutOptions.json).toBe(resultWithOptions.json);
    });
  });
});