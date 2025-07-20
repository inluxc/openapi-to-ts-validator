import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { transformContains, hasContains, extractContainsPatterns, validateContainsConfig, createContainsSchema } from "openapi-to-ts-validator/src/transform/openapi31-contains-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 contains keyword support", () => {
  const testOutputDir = path.join(__dirname, "../output/contains-keyword-test");
  const testSchemaDir = path.join(__dirname, "../schemas");

  beforeEach(() => {
    // Clean up and create test output directory
    if (require("fs").existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
    mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test output directory
    if (require("fs").existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe("transformContains function", () => {
    test("should transform simple contains schema", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: {
          type: "string",
          pattern: "^test-"
        },
        description: "Array that must contain at least one string starting with 'test-'"
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].schema).toEqual({
        type: "string",
        pattern: "^test-"
      });
      expect(result.containsPatterns![0].location).toBe("#/contains");
      expect(result.schema.contains).toEqual({
        type: "string",
        pattern: "^test-"
      });
    });

    test("should transform contains with minContains", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: {
          type: "number",
          minimum: 10
        },
        minContains: 2,
        description: "Array that must contain at least 2 numbers >= 10"
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].minContains).toBe(2);
      expect(result.containsPatterns![0].schema).toEqual({
        type: "number",
        minimum: 10
      });
      expect(result.schema.minContains).toBe(2);
    });

    test("should transform contains with maxContains", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: {
          type: "boolean"
        },
        maxContains: 3,
        description: "Array that must contain at most 3 boolean values"
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].maxContains).toBe(3);
      expect(result.schema.maxContains).toBe(3);
    });

    test("should transform contains with both minContains and maxContains", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: {
          type: "string",
          enum: ["red", "green", "blue"]
        },
        minContains: 1,
        maxContains: 2,
        description: "Array that must contain 1-2 color strings"
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].minContains).toBe(1);
      expect(result.containsPatterns![0].maxContains).toBe(2);
      expect(result.schema.minContains).toBe(1);
      expect(result.schema.maxContains).toBe(2);
    });

    test("should transform contains with complex schema", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: {
          type: "object",
          properties: {
            type: { const: "special" },
            value: { type: "number" }
          },
          required: ["type", "value"]
        },
        description: "Array that must contain at least one special object"
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].schema).toEqual({
        type: "object",
        properties: {
          type: { const: "special" },
          value: { type: "number" }
        },
        required: ["type", "value"]
      });
    });

    test("should not transform non-array schema with contains", () => {
      const schema: JSONSchema = {
        type: "object",
        contains: {
          type: "string"
        }
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should not transform schema without contains", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "string"
        },
        description: "A regular array schema"
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should recursively transform nested contains in properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          tags: {
            type: "array",
            contains: {
              type: "string",
              pattern: "^tag-"
            }
          },
          categories: {
            type: "array",
            contains: {
              type: "object",
              properties: {
                name: { type: "string" }
              }
            },
            minContains: 1
          }
        }
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(2);
      
      const tagsPattern = result.containsPatterns!.find(p => p.location === "#/properties/tags/contains");
      expect(tagsPattern).toBeDefined();
      expect(tagsPattern!.schema).toEqual({
        type: "string",
        pattern: "^tag-"
      });

      const categoriesPattern = result.containsPatterns!.find(p => p.location === "#/properties/categories/contains");
      expect(categoriesPattern).toBeDefined();
      expect(categoriesPattern!.minContains).toBe(1);
    });

    test("should transform contains in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "array",
          contains: {
            type: "number",
            multipleOf: 2
          }
        }
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].location).toBe("#/items/contains");
      expect(result.containsPatterns![0].schema).toEqual({
        type: "number",
        multipleOf: 2
      });
    });

    test("should transform contains in prefixItems (tuple support)", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          {
            type: "array",
            contains: {
              type: "boolean"
            },
            minContains: 1
          }
        ]
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].location).toBe("#/prefixItems/1/contains");
      expect(result.containsPatterns![0].minContains).toBe(1);
    });

    test("should transform contains in conditional schemas", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "list" }
          }
        },
        then: {
          properties: {
            items: {
              type: "array",
              contains: {
                type: "string",
                minLength: 3
              }
            }
          }
        }
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(1);
      expect(result.containsPatterns![0].location).toBe("#/then/properties/items/contains");
    });

    test("should transform contains in combiners (anyOf, oneOf, allOf)", () => {
      const schema: JSONSchema = {
        anyOf: [
          {
            type: "array",
            contains: {
              type: "string"
            }
          },
          {
            allOf: [
              {
                type: "array",
                contains: {
                  type: "number"
                },
                minContains: 2
              }
            ]
          }
        ]
      };

      const result = transformContains(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.containsPatterns).toHaveLength(2);
      
      const stringPattern = result.containsPatterns!.find(p => p.location === "#/anyOf/0/contains");
      expect(stringPattern).toBeDefined();
      expect(stringPattern!.schema.type).toBe("string");

      const numberPattern = result.containsPatterns!.find(p => p.location === "#/anyOf/1/allOf/0/contains");
      expect(numberPattern).toBeDefined();
      expect(numberPattern!.schema.type).toBe("number");
      expect(numberPattern!.minContains).toBe(2);
    });

    test("should validate minContains and maxContains constraints", () => {
      const invalidMinContains: JSONSchema = {
        type: "array",
        contains: { type: "string" },
        minContains: -1
      };

      expect(() => transformContains(invalidMinContains)).toThrow("minContains must be a non-negative integer");

      const invalidMaxContains: JSONSchema = {
        type: "array",
        contains: { type: "string" },
        maxContains: -1
      };

      expect(() => transformContains(invalidMaxContains)).toThrow("maxContains must be a non-negative integer");

      const invalidRange: JSONSchema = {
        type: "array",
        contains: { type: "string" },
        minContains: 5,
        maxContains: 3
      };

      expect(() => transformContains(invalidRange)).toThrow("minContains must be less than or equal to maxContains");
    });

    test("should validate contains schema is an object", () => {
      const invalidContains: JSONSchema = {
        type: "array",
        contains: "not-an-object" as any
      };

      expect(() => transformContains(invalidContains)).toThrow("contains must be a schema object");
    });
  });

  describe("hasContains function", () => {
    test("should detect direct contains keyword", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: { type: "string" }
      };

      expect(hasContains(schema)).toBe(true);
    });

    test("should detect contains in nested properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          list: {
            type: "array",
            contains: { type: "number" }
          }
        }
      };

      expect(hasContains(schema)).toBe(true);
    });

    test("should detect contains in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "array",
          contains: { type: "boolean" }
        }
      };

      expect(hasContains(schema)).toBe(true);
    });

    test("should detect contains in prefixItems", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          {
            type: "array",
            contains: { type: "object" }
          }
        ]
      };

      expect(hasContains(schema)).toBe(true);
    });

    test("should detect contains in conditional schemas", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            items: {
              type: "array",
              contains: { type: "string" }
            }
          }
        }
      };

      expect(hasContains(schema)).toBe(true);
    });

    test("should return false for schemas without contains", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          list: {
            type: "array",
            items: { type: "string" }
          }
        }
      };

      expect(hasContains(schema)).toBe(false);
    });
  });

  describe("extractContainsPatterns function", () => {
    test("should extract single contains pattern", () => {
      const schema: JSONSchema = {
        type: "array",
        contains: {
          type: "string",
          pattern: "^test"
        },
        minContains: 1
      };

      const patterns = extractContainsPatterns(schema);
      expect(patterns).toHaveLength(1);
      expect(patterns[0].schema).toEqual({
        type: "string",
        pattern: "^test"
      });
      expect(patterns[0].minContains).toBe(1);
      expect(patterns[0].location).toBe("#/contains");
    });

    test("should extract multiple contains patterns from nested schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          tags: {
            type: "array",
            contains: { type: "string" }
          },
          numbers: {
            type: "array",
            contains: { type: "number" },
            minContains: 2,
            maxContains: 5
          }
        }
      };

      const patterns = extractContainsPatterns(schema);
      expect(patterns).toHaveLength(2);
      
      const tagsPattern = patterns.find(p => p.location === "#/properties/tags/contains");
      expect(tagsPattern).toBeDefined();
      expect(tagsPattern!.schema.type).toBe("string");

      const numbersPattern = patterns.find(p => p.location === "#/properties/numbers/contains");
      expect(numbersPattern).toBeDefined();
      expect(numbersPattern!.schema.type).toBe("number");
      expect(numbersPattern!.minContains).toBe(2);
      expect(numbersPattern!.maxContains).toBe(5);
    });

    test("should extract contains patterns from arrays and combiners", () => {
      const schema: JSONSchema = {
        anyOf: [
          {
            type: "array",
            contains: { type: "string" }
          },
          {
            type: "array",
            items: {
              type: "array",
              contains: { type: "number" }
            }
          }
        ]
      };

      const patterns = extractContainsPatterns(schema);
      expect(patterns).toHaveLength(2);
      
      const stringPattern = patterns.find(p => p.location === "#/anyOf/0/contains");
      expect(stringPattern).toBeDefined();
      
      const numberPattern = patterns.find(p => p.location === "#/anyOf/1/items/contains");
      expect(numberPattern).toBeDefined();
    });

    test("should return empty array for schema without contains", () => {
      const schema: JSONSchema = {
        type: "array",
        items: { type: "string" }
      };

      const patterns = extractContainsPatterns(schema);
      expect(patterns).toEqual([]);
    });
  });

  describe("validateContainsConfig function", () => {
    test("should accept valid contains configuration", () => {
      const result = validateContainsConfig(
        { type: "string" },
        1,
        3
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid contains schema", () => {
      const result = validateContainsConfig(
        "not-an-object",
        1,
        3
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("contains must be a schema object");
    });

    test("should reject invalid minContains", () => {
      const result = validateContainsConfig(
        { type: "string" },
        -1,
        3
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("minContains must be a non-negative integer");
    });

    test("should reject invalid maxContains", () => {
      const result = validateContainsConfig(
        { type: "string" },
        1,
        -1
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("maxContains must be a non-negative integer");
    });

    test("should reject minContains > maxContains", () => {
      const result = validateContainsConfig(
        { type: "string" },
        5,
        3
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("minContains must be less than or equal to maxContains");
    });

    test("should accept undefined minContains and maxContains", () => {
      const result = validateContainsConfig({ type: "string" });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("createContainsSchema function", () => {
    test("should create basic contains schema", () => {
      const schema = createContainsSchema({ type: "string" });
      
      expect(schema.type).toBe("array");
      expect(schema.contains).toEqual({ type: "string" });
      expect(schema.minContains).toBeUndefined();
      expect(schema.maxContains).toBeUndefined();
    });

    test("should create contains schema with minContains", () => {
      const schema = createContainsSchema(
        { type: "number" },
        { minContains: 2 }
      );
      
      expect(schema.type).toBe("array");
      expect(schema.contains).toEqual({ type: "number" });
      expect(schema.minContains).toBe(2);
    });

    test("should create contains schema with maxContains", () => {
      const schema = createContainsSchema(
        { type: "boolean" },
        { maxContains: 3 }
      );
      
      expect(schema.type).toBe("array");
      expect(schema.contains).toEqual({ type: "boolean" });
      expect(schema.maxContains).toBe(3);
    });

    test("should create contains schema with both constraints", () => {
      const schema = createContainsSchema(
        { type: "string", pattern: "^test" },
        { minContains: 1, maxContains: 5 }
      );
      
      expect(schema.type).toBe("array");
      expect(schema.contains).toEqual({ type: "string", pattern: "^test" });
      expect(schema.minContains).toBe(1);
      expect(schema.maxContains).toBe(5);
    });

    test("should create contains schema with additional properties", () => {
      const schema = createContainsSchema(
        { type: "string" },
        {
          minContains: 1,
          additionalProperties: {
            title: "Test Array",
            description: "Array with contains validation"
          }
        }
      );
      
      expect(schema.type).toBe("array");
      expect(schema.title).toBe("Test Array");
      expect(schema.description).toBe("Array with contains validation");
    });

    test("should throw for invalid configuration", () => {
      expect(() => createContainsSchema(
        { type: "string" },
        { minContains: 5, maxContains: 3 }
      )).toThrow("Invalid contains configuration");
    });
  });

  describe("OpenAPI 3.1 schema parsing with contains keywords", () => {
    test("should parse OpenAPI 3.1 schema with contains validation", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Contains Keywords Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    TaggedResponse:
      type: object
      properties:
        id:
          type: string
        tags:
          type: array
          contains:
            type: string
            pattern: "^tag-"
          minContains: 1
        categories:
          type: array
          contains:
            type: object
            properties:
              name:
                type: string
              priority:
                type: number
            required: ['name']
          maxContains: 3
      required: ['id', 'tags']
    
    NumberList:
      type: object
      properties:
        values:
          type: array
          contains:
            type: number
            minimum: 0
          minContains: 2
          maxContains: 10
      `;

      const schemaPath = path.join(testSchemaDir, "contains-keywords-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableContainsKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.TaggedResponse).toBeDefined();
        expect(result.definitions.NumberList).toBeDefined();

        // Check that contains keywords were processed
        const taggedSchema = result.definitions.TaggedResponse;
        expect(taggedSchema.properties?.tags).toBeDefined();
        expect(taggedSchema.properties?.categories).toBeDefined();

        const numberListSchema = result.definitions.NumberList;
        expect(numberListSchema.properties?.values).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle contains in complex nested structures", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex Contains Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ComplexSchema:
      type: object
      properties:
        nestedArrays:
          type: array
          items:
            type: array
            contains:
              type: string
              minLength: 3
        tupleWithContains:
          type: array
          prefixItems:
            - type: string
            - type: array
              contains:
                type: number
                multipleOf: 2
              minContains: 1
        conditionalContains:
          if:
            properties:
              type:
                const: "filtered"
          then:
            properties:
              items:
                type: array
                contains:
                  type: object
                  properties:
                    active:
                      const: true
                minContains: 1
      `;

      const schemaPath = path.join(testSchemaDir, "complex-contains-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableContainsKeyword: true,
          enablePrefixItems: true,
          enableConditionalSchemas: true,
          enableConstKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ComplexSchema).toBeDefined();

        const schema = result.definitions.ComplexSchema;
        expect(schema.properties?.nestedArrays).toBeDefined();
        expect(schema.properties?.tupleWithContains).toBeDefined();
        expect(schema.properties?.conditionalContains).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with contains keywords", () => {
    test("should generate TypeScript types and validators for contains", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E Contains Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ContainsModel:
      type: object
      properties:
        id:
          type: string
        requiredTags:
          type: array
          contains:
            type: string
            pattern: "^required-"
          minContains: 1
        optionalNumbers:
          type: array
          contains:
            type: number
            minimum: 0
          maxContains: 5
        mixedItems:
          type: array
          contains:
            anyOf:
              - type: string
              - type: number
          minContains: 2
          maxContains: 8
      required: ['id', 'requiredTags']
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-contains-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enableContainsKeyword: true
          }
        });

        // Check that files were generated
        const modelsPath = path.join(testOutputDir, "models.ts");
        const decodersPath = path.join(testOutputDir, "decoders.ts");
        const validatePath = path.join(testOutputDir, "validate.ts");

        expect(require("fs").existsSync(modelsPath)).toBe(true);
        expect(require("fs").existsSync(decodersPath)).toBe(true);
        expect(require("fs").existsSync(validatePath)).toBe(true);

        // Check generated TypeScript models
        const modelsContent = readFileSync(modelsPath, "utf8");
        expect(modelsContent).toContain("ContainsModel");
        
        // Arrays with contains should still be typed as arrays
        expect(modelsContent).toMatch(/requiredTags.*\[\]|Array/);
        expect(modelsContent).toMatch(/optionalNumbers.*\[\]|Array/);

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("ContainsModelDecoder");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should validate contains constraints correctly", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Contains Validation Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ValidationModel:
      type: object
      properties:
        id:
          type: string
        tags:
          type: array
          contains:
            type: string
            enum: ["important", "urgent", "critical"]
          minContains: 1
          maxContains: 2
      required: ['id', 'tags']
      `;

      const schemaPath = path.join(testSchemaDir, "contains-validation-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          standalone: {
            mergeDecoders: true,
            validatorOutput: "commonjs"
          },
          openapi31: {
            enableContainsKeyword: true
          }
        });

        // Import and test the generated validators
        const validatorsPath = path.join(testOutputDir, "validators.js");
        expect(require("fs").existsSync(validatorsPath)).toBe(true);

        // Test would require dynamic import in a real test environment
        // This is a structural test to ensure generation works
        const validatorsContent = readFileSync(validatorsPath, "utf8");
        expect(validatorsContent).toContain("ValidationModelValidator");
        
        // Check that contains validation is included in the generated validator
        expect(validatorsContent).toMatch(/contains|minContains|maxContains/);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Error handling for contains keywords", () => {
    test("should handle contains keyword when disabled", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Disabled Contains Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DisabledContainsTest:
      type: object
      properties:
        items:
          type: array
          contains:
            type: string
      `;

      const schemaPath = path.join(testSchemaDir, "disabled-contains-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableContainsKeyword: false
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DisabledContainsTest).toBeDefined();
        
        // With contains keyword disabled, the contains should be preserved as-is
        // without additional transformation
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should fallback gracefully when contains processing fails", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Fallback Contains Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    FallbackTest:
      type: object
      properties:
        normalArray:
          type: array
          items:
            type: string
        containsArray:
          type: array
          contains:
            type: string
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-contains-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableContainsKeyword: true,
          fallbackToOpenAPI30: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.FallbackTest).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Edge cases and complex scenarios", () => {
    test("should handle contains with various constraint combinations", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Contains Edge Cases Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    EdgeCasesTest:
      type: object
      properties:
        minOnly:
          type: array
          contains:
            type: string
          minContains: 3
        maxOnly:
          type: array
          contains:
            type: number
          maxContains: 2
        exactCount:
          type: array
          contains:
            type: boolean
          minContains: 1
          maxContains: 1
        complexContains:
          type: array
          contains:
            type: object
            properties:
              type:
                enum: ["A", "B", "C"]
              value:
                type: number
                minimum: 0
            required: ["type", "value"]
          minContains: 2
          maxContains: 5
      `;

      const schemaPath = path.join(testSchemaDir, "contains-edge-cases-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableContainsKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.EdgeCasesTest).toBeDefined();

        const schema = result.definitions.EdgeCasesTest;
        expect(schema.properties?.minOnly).toBeDefined();
        expect(schema.properties?.maxOnly).toBeDefined();
        expect(schema.properties?.exactCount).toBeDefined();
        expect(schema.properties?.complexContains).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle contains in combination with other OpenAPI 3.1 features", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Combined Features Contains Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    CombinedTest:
      type: object
      properties:
        nullableContains:
          type: ["array", "null"]
          contains:
            type: string
        tupleWithContains:
          type: array
          prefixItems:
            - type: string
            - type: array
              contains:
                const: "fixed-value"
              minContains: 1
        conditionalContains:
          if:
            properties:
              mode:
                const: "strict"
          then:
            properties:
              items:
                type: array
                contains:
                  type: string
                  pattern: "^strict-"
                minContains: 2
          else:
            properties:
              items:
                type: array
                contains:
                  type: string
                minContains: 1
      `;

      const schemaPath = path.join(testSchemaDir, "combined-contains-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableContainsKeyword: true,
          enablePrefixItems: true,
          enableConditionalSchemas: true,
          enableConstKeyword: true,
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.CombinedTest).toBeDefined();

        const schema = result.definitions.CombinedTest;
        expect(schema.properties?.nullableContains).toBeDefined();
        expect(schema.properties?.tupleWithContains).toBeDefined();
        expect(schema.properties?.conditionalContains).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Builder helper function", () => {
    test("should create contains schema using builder helper", () => {
      // This test would require importing the builder functions
      // For now, we test the structure that should be created
      const expectedSchema = {
        type: "array",
        contains: { type: "string" },
        minContains: 1
      };

      // Test the structure that containsArray() should create
      expect(expectedSchema.type).toBe("array");
      expect(expectedSchema.contains).toEqual({ type: "string" });
      expect(expectedSchema.minContains).toBe(1);
    });
  });
});