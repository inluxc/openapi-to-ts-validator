import {
  validateAndNormalizeOpenAPI31Options,
  applyOpenAPI31Defaults,
  validateGenerateOptions,
  getEnabledFeatures,
  createFeatureChecker,
  OptionsValidationError,
  DEFAULT_OPENAPI31_OPTIONS,
} from "../../src/options-validation";
import type { GenerateOptions, OpenAPI31ParseOptions } from "../../src/GenerateOptions";

describe("OpenAPI 3.1 Options Validation", () => {
  describe("validateAndNormalizeOpenAPI31Options", () => {
    it("should return empty object for undefined options", () => {
      const result = validateAndNormalizeOpenAPI31Options(undefined);
      expect(result).toEqual({});
    });

    it("should return empty object for empty options", () => {
      const result = validateAndNormalizeOpenAPI31Options({});
      expect(result).toEqual({});
    });

    it("should validate and normalize valid boolean options", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: true,
        enablePrefixItems: false,
        enableUnevaluatedProperties: true,
        enableConstKeyword: false,
        enableContainsKeyword: true,
        enableEnhancedDiscriminator: false,
        fallbackToOpenAPI30: true,
      };

      const result = validateAndNormalizeOpenAPI31Options(options);
      expect(result).toEqual(options);
    });

    it("should throw error for invalid boolean option types", () => {
      const invalidOptions = [
        { enableWebhooks: "true" },
        { strictNullHandling: 1 },
        { enableConditionalSchemas: null },
        { enablePrefixItems: {} },
        { enableUnevaluatedProperties: [] },
        { enableConstKeyword: "false" },
        { enableContainsKeyword: 0 },
        { enableEnhancedDiscriminator: undefined },
        { fallbackToOpenAPI30: "yes" },
      ];

      invalidOptions.forEach((options) => {
        expect(() => validateAndNormalizeOpenAPI31Options(options as any))
          .toThrow(OptionsValidationError);
      });
    });

    it("should provide helpful error messages for invalid options", () => {
      expect(() => validateAndNormalizeOpenAPI31Options({ enableWebhooks: "true" } as any))
        .toThrow("Invalid option 'enableWebhooks' with value 'true'. Must be a boolean value (true or false)");
    });
  });

  describe("applyOpenAPI31Defaults", () => {
    it("should apply all default values for undefined options", () => {
      const result = applyOpenAPI31Defaults(undefined);
      expect(result).toEqual(DEFAULT_OPENAPI31_OPTIONS);
    });

    it("should apply all default values for empty options", () => {
      const result = applyOpenAPI31Defaults({});
      expect(result).toEqual(DEFAULT_OPENAPI31_OPTIONS);
    });

    it("should preserve provided values and apply defaults for missing ones", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
      };

      const result = applyOpenAPI31Defaults(options);
      expect(result).toEqual({
        ...DEFAULT_OPENAPI31_OPTIONS,
        enableWebhooks: true,
        strictNullHandling: false,
      });
    });

    it("should validate options before applying defaults", () => {
      expect(() => applyOpenAPI31Defaults({ enableWebhooks: "invalid" } as any))
        .toThrow(OptionsValidationError);
    });
  });

  describe("DEFAULT_OPENAPI31_OPTIONS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_OPENAPI31_OPTIONS).toEqual({
        enableWebhooks: false,
        strictNullHandling: true,
        enableConditionalSchemas: true,
        enablePrefixItems: true,
        enableUnevaluatedProperties: true,
        enableConstKeyword: true,
        enableContainsKeyword: true,
        enableEnhancedDiscriminator: true,
        fallbackToOpenAPI30: false,
      });
    });
  });
});

describe("GenerateOptions Validation", () => {
  const validBaseOptions: GenerateOptions = {
    schemaFile: "test.yaml",
    schemaType: "yaml",
    directory: "output",
  };

  describe("validateGenerateOptions", () => {
    it("should validate valid options successfully", () => {
      const result = validateGenerateOptions(validBaseOptions);
      expect(result).toEqual(validBaseOptions);
    });

    it("should throw error for missing required options", () => {
      const requiredFields = ["schemaFile", "schemaType", "directory"];
      
      requiredFields.forEach((field) => {
        const invalidOptions = { ...validBaseOptions };
        delete (invalidOptions as any)[field];
        
        expect(() => validateGenerateOptions(invalidOptions))
          .toThrow(OptionsValidationError);
      });
    });

    it("should validate schemaType values", () => {
      const validTypes = ["yaml", "json", "custom"];
      const invalidTypes = ["xml", "txt", "", null, undefined];

      validTypes.forEach((type) => {
        const options = { ...validBaseOptions, schemaType: type as any };
        expect(() => validateGenerateOptions(options)).not.toThrow();
      });

      invalidTypes.forEach((type) => {
        const options = { ...validBaseOptions, schemaType: type as any };
        expect(() => validateGenerateOptions(options)).toThrow(OptionsValidationError);
      });
    });

    it("should validate directory as string", () => {
      const options = { ...validBaseOptions, directory: "single-dir" };
      expect(() => validateGenerateOptions(options)).not.toThrow();
    });

    it("should validate directory as array of strings", () => {
      const options = { ...validBaseOptions, directory: ["dir1", "dir2", "dir3"] };
      expect(() => validateGenerateOptions(options)).not.toThrow();
    });

    it("should throw error for invalid directory types", () => {
      const invalidDirectories = [
        null,
        undefined,
        123,
        {},
        [],
        ["dir1", 123],
        ["dir1", null],
      ];

      invalidDirectories.forEach((directory) => {
        const options = { ...validBaseOptions, directory: directory as any };
        expect(() => validateGenerateOptions(options)).toThrow(OptionsValidationError);
      });
    });

    it("should validate boolean options", () => {
      const booleanOptions = [
        "addFormats",
        "skipMetaFile",
        "skipSchemaFile",
        "skipDecoders",
        "esm",
        "debug",
      ];

      booleanOptions.forEach((option) => {
        // Valid boolean values
        [true, false].forEach((value) => {
          const options = { ...validBaseOptions, [option]: value };
          expect(() => validateGenerateOptions(options)).not.toThrow();
        });

        // Invalid boolean values
        ["true", "false", 1, 0, null, {}].forEach((value) => {
          const options = { ...validBaseOptions, [option]: value };
          expect(() => validateGenerateOptions(options)).toThrow(OptionsValidationError);
        });
      });
    });

    it("should validate standalone options", () => {
      const validStandaloneOptions = [
        { validatorOutput: "module" as const },
        { validatorOutput: "commonjs" as const },
        { validatorOutput: "module" as const, mergeDecoders: true },
        { validatorOutput: "commonjs" as const, mergeDecoders: false },
      ];

      validStandaloneOptions.forEach((standalone) => {
        const options = { ...validBaseOptions, standalone };
        expect(() => validateGenerateOptions(options)).not.toThrow();
      });

      const invalidStandaloneOptions = [
        "not-an-object",
        { validatorOutput: "invalid" },
        { validatorOutput: "module", mergeDecoders: "true" },
        { validatorOutput: null },
      ];

      invalidStandaloneOptions.forEach((standalone) => {
        const options = { ...validBaseOptions, standalone: standalone as any };
        expect(() => validateGenerateOptions(options)).toThrow(OptionsValidationError);
      });
    });

    it("should validate decoders array", () => {
      const validDecoders = [
        ["decoder1", "decoder2"],
        [],
        ["single-decoder"],
      ];

      validDecoders.forEach((decoders) => {
        const options = { ...validBaseOptions, decoders };
        expect(() => validateGenerateOptions(options)).not.toThrow();
      });

      const invalidDecoders = [
        "not-an-array",
        [123, "decoder"],
        ["decoder", null],
        [{}],
      ];

      invalidDecoders.forEach((decoders) => {
        const options = { ...validBaseOptions, decoders: decoders as any };
        expect(() => validateGenerateOptions(options)).toThrow(OptionsValidationError);
      });
    });

    it("should validate OpenAPI 3.1 options", () => {
      const validOpenAPI31Options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
      };

      const options = { ...validBaseOptions, openapi31: validOpenAPI31Options };
      expect(() => validateGenerateOptions(options)).not.toThrow();

      const invalidOpenAPI31Options = {
        enableWebhooks: "true",
        strictNullHandling: 1,
      };

      const invalidOptions = { ...validBaseOptions, openapi31: invalidOpenAPI31Options as any };
      expect(() => validateGenerateOptions(invalidOptions)).toThrow(OptionsValidationError);
    });
  });
});

describe("Feature Management", () => {
  describe("getEnabledFeatures", () => {
    it("should return default features for undefined options", () => {
      const features = getEnabledFeatures(undefined);
      expect(features).toEqual({
        webhooks: false,
        strictNullHandling: true,
        conditionalSchemas: true,
        prefixItems: true,
        unevaluatedProperties: true,
        constKeyword: true,
        containsKeyword: true,
        enhancedDiscriminator: true,
        fallbackToOpenAPI30: false,
      });
    });

    it("should return custom features for provided options", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: false,
      };

      const features = getEnabledFeatures(options);
      expect(features).toEqual({
        webhooks: true,
        strictNullHandling: false,
        conditionalSchemas: false,
        prefixItems: true, // default
        unevaluatedProperties: true, // default
        constKeyword: true, // default
        containsKeyword: true, // default
        enhancedDiscriminator: true, // default
        fallbackToOpenAPI30: false, // default
      });
    });
  });

  describe("createFeatureChecker", () => {
    it("should create feature checker with default options", () => {
      const checker = createFeatureChecker(undefined);
      
      expect(checker.isWebhooksEnabled()).toBe(false);
      expect(checker.isStrictNullHandlingEnabled()).toBe(true);
      expect(checker.isConditionalSchemasEnabled()).toBe(true);
      expect(checker.isPrefixItemsEnabled()).toBe(true);
      expect(checker.isUnevaluatedPropertiesEnabled()).toBe(true);
      expect(checker.isConstKeywordEnabled()).toBe(true);
      expect(checker.isContainsKeywordEnabled()).toBe(true);
      expect(checker.isEnhancedDiscriminatorEnabled()).toBe(true);
      expect(checker.isFallbackToOpenAPI30Enabled()).toBe(false);
    });

    it("should create feature checker with custom options", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: false,
      };

      const checker = createFeatureChecker(options);
      
      expect(checker.isWebhooksEnabled()).toBe(true);
      expect(checker.isStrictNullHandlingEnabled()).toBe(false);
      expect(checker.isConditionalSchemasEnabled()).toBe(false);
      expect(checker.isPrefixItemsEnabled()).toBe(true); // default
    });

    it("should check multiple features with areAllEnabled", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: true,
        enableConditionalSchemas: false,
      };

      const checker = createFeatureChecker(options);
      
      expect(checker.areAllEnabled("webhooks", "strictNullHandling")).toBe(true);
      expect(checker.areAllEnabled("webhooks", "conditionalSchemas")).toBe(false);
      expect(checker.areAllEnabled("prefixItems", "constKeyword")).toBe(true);
    });

    it("should get enabled feature names", () => {
      const options: OpenAPI31ParseOptions = {
        enableWebhooks: true,
        strictNullHandling: false,
        enableConditionalSchemas: false,
        enablePrefixItems: false,
      };

      const checker = createFeatureChecker(options);
      const enabledFeatures = checker.getEnabledFeatureNames();
      
      expect(enabledFeatures).toContain("webhooks");
      expect(enabledFeatures).not.toContain("strictNullHandling");
      expect(enabledFeatures).not.toContain("conditionalSchemas");
      expect(enabledFeatures).not.toContain("prefixItems");
      expect(enabledFeatures).toContain("unevaluatedProperties"); // default true
      expect(enabledFeatures).toContain("constKeyword"); // default true
    });
  });
});

describe("Error Handling", () => {
  describe("OptionsValidationError", () => {
    it("should create error with correct properties", () => {
      const error = new OptionsValidationError("testOption", "testValue", "Test suggestion");
      
      expect(error.name).toBe("OptionsValidationError");
      expect(error.option).toBe("testOption");
      expect(error.value).toBe("testValue");
      expect(error.suggestion).toBe("Test suggestion");
      expect(error.message).toBe("Invalid option 'testOption' with value 'testValue'. Test suggestion");
    });

    it("should create error without suggestion", () => {
      const error = new OptionsValidationError("testOption", "testValue");
      
      expect(error.suggestion).toBeUndefined();
      expect(error.message).toBe("Invalid option 'testOption' with value 'testValue'. ");
    });
  });
});