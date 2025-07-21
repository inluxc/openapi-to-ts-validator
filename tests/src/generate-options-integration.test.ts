import { generate } from "../../src/generate";
import { OptionsValidationError } from "../../src/options-validation";
import type { GenerateOptions } from "../../src/GenerateOptions";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";

describe("Generate Options Integration", () => {
  const testOutputDir = join(__dirname, "../temp-test-output");
  
  beforeEach(() => {
    // Clean up any existing test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test output
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe("Options Validation in Generate Function", () => {
    it("should validate options before processing", async () => {
      const invalidOptions = {
        // Missing required fields
        schemaType: "yaml" as const,
        directory: testOutputDir,
      } as GenerateOptions;

      await expect(generate(invalidOptions)).rejects.toThrow(OptionsValidationError);
    });

    it("should accept valid options", async () => {
      const validOptions: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        skipDecoders: true, // Skip decoders to avoid compilation issues in test
        skipMetaFile: true,
      };

      // This should not throw
      await expect(generate(validOptions)).resolves.not.toThrow();
    });

    it("should validate OpenAPI 3.1 options", async () => {
      const optionsWithInvalidOpenAPI31: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        skipDecoders: true,
        skipMetaFile: true,
        openapi31: {
          enableWebhooks: "true" as any, // Invalid type
        },
      };

      await expect(generate(optionsWithInvalidOpenAPI31)).rejects.toThrow(OptionsValidationError);
    });

    it("should accept valid OpenAPI 3.1 options", async () => {
      const validOptionsWithOpenAPI31: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        skipDecoders: true,
        skipMetaFile: true,
        openapi31: {
          enableWebhooks: true,
          strictNullHandling: false,
          enableConditionalSchemas: true,
        },
      };

      // This should not throw
      await expect(generate(validOptionsWithOpenAPI31)).resolves.not.toThrow();
    });

    it("should validate standalone options", async () => {
      const invalidStandaloneOptions: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        skipMetaFile: true,
        standalone: {
          validatorOutput: "invalid" as any, // Invalid validator output
        },
      };

      await expect(generate(invalidStandaloneOptions)).rejects.toThrow(OptionsValidationError);
    });

    it("should validate directory options", async () => {
      const invalidDirectoryOptions: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: [] as any, // Empty array is invalid
        skipDecoders: true,
        skipMetaFile: true,
      };

      await expect(generate(invalidDirectoryOptions)).rejects.toThrow(OptionsValidationError);
    });

    it("should accept multiple directories", async () => {
      const multiDirOptions: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: [testOutputDir, join(testOutputDir, "alt")],
        skipDecoders: true,
        skipMetaFile: true,
      };

      // Create the alternative directory
      mkdirSync(join(testOutputDir, "alt"), { recursive: true });

      // This should not throw
      await expect(generate(multiDirOptions)).resolves.not.toThrow();
    });
  });

  describe("Feature Flag Integration", () => {
    it("should handle feature flags correctly for OpenAPI 3.1", async () => {
      // This test would require an actual OpenAPI 3.1 schema file
      // For now, we'll test that the options are processed without error
      const optionsWithFeatureFlags: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        skipDecoders: true,
        skipMetaFile: true,
        openapi31: {
          enableWebhooks: false,
          strictNullHandling: true,
          enableConditionalSchemas: false,
          enablePrefixItems: true,
          enableUnevaluatedProperties: false,
          enableConstKeyword: true,
          enableContainsKeyword: false,
          enableEnhancedDiscriminator: true,
          fallbackToOpenAPI30: false,
        },
      };

      // This should not throw and should process the feature flags
      await expect(generate(optionsWithFeatureFlags)).resolves.not.toThrow();
    });
  });

  describe("Error Messages", () => {
    it("should provide helpful error messages for validation failures", async () => {
      const invalidOptions = {
        schemaFile: "",
        schemaType: "invalid" as any,
        directory: null as any,
      } as GenerateOptions;

      try {
        await generate(invalidOptions);
        fail("Expected validation error");
      } catch (error) {
        expect(error).toBeInstanceOf(OptionsValidationError);
        expect((error as OptionsValidationError).message).toContain("Invalid option");
      }
    });

    it("should provide specific error messages for OpenAPI 3.1 options", async () => {
      const invalidOptions: GenerateOptions = {
        schemaFile: join(__dirname, "../schemas/simple-schema.yaml"),
        schemaType: "yaml",
        directory: testOutputDir,
        openapi31: {
          enableWebhooks: 123 as any,
        },
      };

      try {
        await generate(invalidOptions);
        fail("Expected validation error");
      } catch (error) {
        expect(error).toBeInstanceOf(OptionsValidationError);
        expect((error as OptionsValidationError).message).toContain("enableWebhooks");
        expect((error as OptionsValidationError).message).toContain("boolean");
      }
    });
  });
});