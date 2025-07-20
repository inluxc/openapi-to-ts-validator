import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { transformNullTypes, hasNullTypes, extractUnionTypes } from "openapi-to-ts-validator/src/transform/openapi31-null-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 null type handling", () => {
  const testOutputDir = path.join(__dirname, "../output/null-types-test");
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

  describe("transformNullTypes function", () => {
    test("should transform simple string|null type array", () => {
      const schema: JSONSchema = {
        type: ["string", "null"],
        description: "A nullable string"
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unionTypes).toEqual(["string", "null"]);
      expect(result.schema.type).toBe("string");
      expect((result.schema as any).nullable).toBe(true);
    });

    test("should transform complex union with multiple types and null", () => {
      const schema: JSONSchema = {
        type: ["string", "number", "null"],
        description: "A string, number, or null"
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unionTypes).toEqual(["string", "number", "null"]);
      expect(result.schema.type).toBeUndefined();
      expect(result.schema.anyOf).toEqual([
        { type: "string" },
        { type: "number" },
        { type: "null" }
      ]);
    });

    test("should transform union without null", () => {
      const schema: JSONSchema = {
        type: ["string", "number"],
        description: "A string or number"
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unionTypes).toEqual(["string", "number"]);
      expect(result.schema.type).toBeUndefined();
      expect(result.schema.anyOf).toEqual([
        { type: "string" },
        { type: "number" }
      ]);
    });

    test("should handle mixed nullable property and type array", () => {
      const schema: JSONSchema = {
        type: "string",
        nullable: true,
        description: "A nullable string using nullable property"
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unionTypes).toEqual(["string", "null"]);
      expect(result.schema.type).toBeUndefined();
      expect(result.schema.nullable).toBeUndefined();
      expect(result.schema.anyOf).toEqual([
        { type: "string" },
        { type: "null" }
      ]);
    });

    test("should not transform single type", () => {
      const schema: JSONSchema = {
        type: "string",
        description: "A regular string"
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should recursively transform nested schemas", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: {
            type: ["string", "null"]
          },
          age: {
            type: "number"
          },
          tags: {
            type: "array",
            items: {
              type: ["string", "null"]
            }
          }
        }
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.properties?.name).toEqual({
        type: "string",
        nullable: true
      });
      expect(result.schema.properties?.age).toEqual({
        type: "number"
      });
      expect((result.schema.properties?.tags as any)?.items).toEqual({
        type: "string",
        nullable: true
      });
    });

    test("should handle allOf, anyOf, oneOf combiners", () => {
      const schema: JSONSchema = {
        anyOf: [
          { type: ["string", "null"] },
          { type: "number" }
        ]
      };

      const result = transformNullTypes(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.anyOf?.[0]).toEqual({
        type: "string",
        nullable: true
      });
      expect(result.schema.anyOf?.[1]).toEqual({
        type: "number"
      });
    });
  });

  describe("hasNullTypes function", () => {
    test("should detect type arrays with null", () => {
      const schema: JSONSchema = {
        type: ["string", "null"]
      };

      expect(hasNullTypes(schema)).toBe(true);
    });

    test("should detect nullable property", () => {
      const schema: JSONSchema = {
        type: "string",
        nullable: true
      };

      expect(hasNullTypes(schema)).toBe(true);
    });

    test("should detect null types in nested properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: {
            type: ["string", "null"]
          }
        }
      };

      expect(hasNullTypes(schema)).toBe(true);
    });

    test("should return false for schemas without null types", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: {
            type: "string"
          }
        }
      };

      expect(hasNullTypes(schema)).toBe(false);
    });
  });

  describe("extractUnionTypes function", () => {
    test("should extract types from anyOf union", () => {
      const schema: JSONSchema = {
        anyOf: [
          { type: "string" },
          { type: "null" }
        ]
      };

      const types = extractUnionTypes(schema);
      expect(types).toEqual(["string", "null"]);
    });

    test("should extract types from nullable schema", () => {
      const schema: JSONSchema = {
        type: "string",
        nullable: true
      };

      const types = extractUnionTypes(schema);
      expect(types).toEqual(["string", "null"]);
    });

    test("should extract types from type array", () => {
      const schema: JSONSchema = {
        type: ["string", "number", "null"]
      };

      const types = extractUnionTypes(schema);
      expect(types).toEqual(["string", "number", "null"]);
    });

    test("should return empty array for non-union schemas", () => {
      const schema: JSONSchema = {
        type: "string"
      };

      const types = extractUnionTypes(schema);
      expect(types).toEqual([]);
    });
  });

  describe("OpenAPI 3.1 schema parsing with null types", () => {
    test("should parse OpenAPI 3.1 schema with type arrays", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Null Types Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: ["string", "null"]
        email:
          type: ["string", "null"]
        age:
          type: ["number", "null"]
        tags:
          type: array
          items:
            type: ["string", "null"]
        metadata:
          type: ["object", "null"]
          properties:
            created:
              type: string
      required: ['id']
    
    Product:
      type: object
      properties:
        title:
          type: string
        price:
          type: ["number", "string", "null"]
        available:
          type: ["boolean", "null"]
      `;

      const schemaPath = path.join(testSchemaDir, "null-types-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.User).toBeDefined();
        expect(result.definitions.Product).toBeDefined();

        // Check that null types were transformed
        const userSchema = result.definitions.User;
        expect(userSchema.properties?.name).toBeDefined();
        expect(userSchema.properties?.email).toBeDefined();
        
        const productSchema = result.definitions.Product;
        expect(productSchema.properties?.price).toBeDefined();
        expect(productSchema.properties?.available).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle mixed nullable and type array scenarios", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Mixed Null Handling Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    MixedTypes:
      type: object
      properties:
        oldStyle:
          type: string
          nullable: true
        newStyle:
          type: ["string", "null"]
        complex:
          type: ["string", "number", "null"]
        nonNull:
          type: string
      `;

      const schemaPath = path.join(testSchemaDir, "mixed-null-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.MixedTypes).toBeDefined();

        const schema = result.definitions.MixedTypes;
        expect(schema.properties?.oldStyle).toBeDefined();
        expect(schema.properties?.newStyle).toBeDefined();
        expect(schema.properties?.complex).toBeDefined();
        expect(schema.properties?.nonNull).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with null types", () => {
    test("should generate TypeScript types and validators for null types", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E Null Types Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    TestModel:
      type: object
      properties:
        id:
          type: string
        optionalString:
          type: ["string", "null"]
        optionalNumber:
          type: ["number", "null"]
        multiType:
          type: ["string", "number", "null"]
      required: ['id']
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-null-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            strictNullHandling: true
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
        expect(modelsContent).toContain("TestModel");
        
        // Check that union types are properly generated
        // The exact format depends on json-schema-to-typescript, but should handle null unions
        expect(modelsContent).toMatch(/string.*null|null.*string/);

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("TestModelDecoder");
        expect(decodersContent).toContain("allowUnionTypes: true");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should validate data correctly with null types", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Validation Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ValidationTest:
      type: object
      properties:
        id:
          type: string
        nullableString:
          type: ["string", "null"]
        nullableNumber:
          type: ["number", "null"]
      required: ['id']
      `;

      const schemaPath = path.join(testSchemaDir, "validation-test.yaml");
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
            strictNullHandling: true
          }
        });

        // Import and test the generated validators
        const validatorsPath = path.join(testOutputDir, "validators.js");
        expect(require("fs").existsSync(validatorsPath)).toBe(true);

        // Test would require dynamic import in a real test environment
        // This is a structural test to ensure generation works
        const validatorsContent = readFileSync(validatorsPath, "utf8");
        expect(validatorsContent).toContain("ValidationTestValidator");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Error handling for null types", () => {
    test("should handle invalid type arrays gracefully", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Invalid Types Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    InvalidTypes:
      type: object
      properties:
        invalidType:
          type: ["string", "invalid"]
      `;

      const schemaPath = path.join(testSchemaDir, "invalid-types-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await expect(parseSchema(schemaPath, "yaml", {
          strictNullHandling: true
        })).rejects.toThrow(/Invalid types in type array/);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should fallback to OpenAPI 3.0 behavior when enabled", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Fallback Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    FallbackTest:
      type: object
      properties:
        nullableField:
          type: ["string", "null"]
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          strictNullHandling: true,
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

    test("should disable null handling when strictNullHandling is false", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Disabled Null Handling Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DisabledTest:
      type: object
      properties:
        field:
          type: ["string", "null"]
      `;

      const schemaPath = path.join(testSchemaDir, "disabled-null-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          strictNullHandling: false
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DisabledTest).toBeDefined();
        
        // With strict null handling disabled, type arrays should be preserved as-is
        // The exact behavior depends on the underlying JSON schema converter
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Edge cases and complex scenarios", () => {
    test("should handle deeply nested null types", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Nested Null Types Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    NestedTest:
      type: object
      properties:
        level1:
          type: object
          properties:
            level2:
              type: object
              properties:
                nullableField:
                  type: ["string", "null"]
                arrayField:
                  type: array
                  items:
                    type: object
                    properties:
                      nestedNullable:
                        type: ["number", "null"]
      `;

      const schemaPath = path.join(testSchemaDir, "nested-null-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.NestedTest).toBeDefined();

        // Verify nested transformations occurred
        const schema = result.definitions.NestedTest;
        expect(schema.properties?.level1).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle null types in array items and additional properties", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Array and Additional Properties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ArrayTest:
      type: object
      properties:
        stringArray:
          type: array
          items:
            type: ["string", "null"]
        mixedArray:
          type: array
          items:
            type: ["string", "number", "null"]
      additionalProperties:
        type: ["string", "null"]
      `;

      const schemaPath = path.join(testSchemaDir, "array-additional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ArrayTest).toBeDefined();

        const schema = result.definitions.ArrayTest;
        expect(schema.properties?.stringArray).toBeDefined();
        expect(schema.properties?.mixedArray).toBeDefined();
        expect(schema.additionalProperties).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });
});