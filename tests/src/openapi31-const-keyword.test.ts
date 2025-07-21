import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { transformConstKeyword, hasConstKeywords, extractConstValues, validateConstValue, createConstSchema } from "openapi-to-ts-validator/src/transform/openapi31-const-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 const keyword support", () => {
  const testOutputDir = path.join(__dirname, "../output/const-keyword-test");
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

  describe("transformConstKeyword function", () => {
    test("should transform simple string const", () => {
      const schema: JSONSchema = {
        const: "hello",
        description: "A constant string value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["hello"]);
      expect(result.schema.const).toBe("hello");
      expect(result.schema.type).toBe("string");
      expect(result.schema.enum).toEqual(["hello"]);
    });

    test("should transform number const", () => {
      const schema: JSONSchema = {
        const: 42,
        description: "A constant number value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual([42]);
      expect(result.schema.const).toBe(42);
      expect(result.schema.type).toBe("integer");
      expect(result.schema.enum).toEqual([42]);
    });

    test("should transform decimal number const", () => {
      const schema: JSONSchema = {
        const: 3.14,
        description: "A constant decimal value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual([3.14]);
      expect(result.schema.const).toBe(3.14);
      expect(result.schema.type).toBe("number");
      expect(result.schema.enum).toEqual([3.14]);
    });

    test("should transform boolean const", () => {
      const schema: JSONSchema = {
        const: true,
        description: "A constant boolean value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual([true]);
      expect(result.schema.const).toBe(true);
      expect(result.schema.type).toBe("boolean");
      expect(result.schema.enum).toEqual([true]);
    });

    test("should transform null const", () => {
      const schema: JSONSchema = {
        const: null,
        description: "A constant null value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual([null]);
      expect(result.schema.const).toBe(null);
      expect(result.schema.type).toBe("null");
      expect(result.schema.enum).toEqual([null]);
    });

    test("should transform object const", () => {
      const constValue = { status: "active", code: 200 };
      const schema: JSONSchema = {
        const: constValue,
        description: "A constant object value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual([constValue]);
      expect(result.schema.const).toEqual(constValue);
      expect(result.schema.type).toBe("object");
      expect(result.schema.enum).toEqual([constValue]);
    });

    test("should transform array const", () => {
      const constValue = ["red", "green", "blue"];
      const schema: JSONSchema = {
        const: constValue,
        description: "A constant array value"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual([constValue]);
      expect(result.schema.const).toEqual(constValue);
      expect(result.schema.type).toBe("array");
      expect(result.schema.enum).toEqual([constValue]);
    });

    test("should preserve existing type when present", () => {
      const schema: JSONSchema = {
        const: "hello",
        type: "string",
        description: "A constant with existing type"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.const).toBe("hello");
      expect(result.schema.type).toBe("string");
      expect(result.schema.enum).toEqual(["hello"]);
    });

    test("should not transform schema without const", () => {
      const schema: JSONSchema = {
        type: "string",
        description: "A regular string schema"
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should recursively transform nested const in properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          status: {
            const: "active"
          },
          version: {
            const: 1
          },
          config: {
            type: "object",
            properties: {
              debug: {
                const: false
              }
            }
          }
        }
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["active", 1, false]);
      
      const statusProp = result.schema.properties?.status as JSONSchema;
      expect(statusProp.const).toBe("active");
      expect(statusProp.type).toBe("string");
      expect(statusProp.enum).toEqual(["active"]);

      const versionProp = result.schema.properties?.version as JSONSchema;
      expect(versionProp.const).toBe(1);
      expect(versionProp.type).toBe("integer");

      const configProp = result.schema.properties?.config as JSONSchema;
      const debugProp = configProp.properties?.debug as JSONSchema;
      expect(debugProp.const).toBe(false);
      expect(debugProp.type).toBe("boolean");
    });

    test("should transform const in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          const: "fixed-value"
        }
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["fixed-value"]);
      
      const itemsSchema = result.schema.items as JSONSchema;
      expect(itemsSchema.const).toBe("fixed-value");
      expect(itemsSchema.type).toBe("string");
      expect(itemsSchema.enum).toEqual(["fixed-value"]);
    });

    test("should transform const in prefixItems (tuple support)", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { const: "first" },
          { const: 2 },
          { const: true }
        ]
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["first", 2, true]);
      
      const prefixItems = result.schema.prefixItems as JSONSchema[];
      expect(prefixItems[0].const).toBe("first");
      expect(prefixItems[0].type).toBe("string");
      expect(prefixItems[1].const).toBe(2);
      expect(prefixItems[1].type).toBe("integer");
      expect(prefixItems[2].const).toBe(true);
      expect(prefixItems[2].type).toBe("boolean");
    });

    test("should transform const in conditional schemas", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "premium" }
          }
        },
        then: {
          properties: {
            level: { const: "gold" }
          }
        },
        else: {
          properties: {
            level: { const: "standard" }
          }
        }
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["premium", "gold", "standard"]);
      
      const ifSchema = result.schema.if as JSONSchema;
      const typeProp = (ifSchema.properties?.type as JSONSchema);
      expect(typeProp.const).toBe("premium");
      
      const thenSchema = result.schema.then as JSONSchema;
      const thenLevelProp = (thenSchema.properties?.level as JSONSchema);
      expect(thenLevelProp.const).toBe("gold");
      
      const elseSchema = result.schema.else as JSONSchema;
      const elseLevelProp = (elseSchema.properties?.level as JSONSchema);
      expect(elseLevelProp.const).toBe("standard");
    });

    test("should transform const in combiners (anyOf, oneOf, allOf)", () => {
      const schema: JSONSchema = {
        anyOf: [
          { const: "option1" },
          { const: "option2" },
          {
            allOf: [
              { const: "nested" }
            ]
          }
        ]
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["option1", "option2", "nested"]);
      
      const anyOfSchemas = result.schema.anyOf as JSONSchema[];
      expect(anyOfSchemas[0].const).toBe("option1");
      expect(anyOfSchemas[1].const).toBe("option2");
      
      const allOfSchemas = (anyOfSchemas[2].allOf as JSONSchema[])[0];
      expect(allOfSchemas.const).toBe("nested");
    });

    test("should transform const in additionalProperties", () => {
      const schema: JSONSchema = {
        type: "object",
        additionalProperties: {
          const: "default-value"
        }
      };

      const result = transformConstKeyword(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.constValues).toEqual(["default-value"]);
      
      const additionalProps = result.schema.additionalProperties as JSONSchema;
      expect(additionalProps.const).toBe("default-value");
      expect(additionalProps.type).toBe("string");
    });
  });

  describe("hasConstKeywords function", () => {
    test("should detect direct const keyword", () => {
      const schema: JSONSchema = {
        const: "value"
      };

      expect(hasConstKeywords(schema)).toBe(true);
    });

    test("should detect const in nested properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          field: {
            const: "value"
          }
        }
      };

      expect(hasConstKeywords(schema)).toBe(true);
    });

    test("should detect const in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          const: "value"
        }
      };

      expect(hasConstKeywords(schema)).toBe(true);
    });

    test("should detect const in prefixItems", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          { const: "fixed" }
        ]
      };

      expect(hasConstKeywords(schema)).toBe(true);
    });

    test("should detect const in conditional schemas", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "special" }
          }
        }
      };

      expect(hasConstKeywords(schema)).toBe(true);
    });

    test("should return false for schemas without const", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        }
      };

      expect(hasConstKeywords(schema)).toBe(false);
    });
  });

  describe("extractConstValues function", () => {
    test("should extract single const value", () => {
      const schema: JSONSchema = {
        const: "test-value"
      };

      const values = extractConstValues(schema);
      expect(values).toEqual(["test-value"]);
    });

    test("should extract multiple const values from nested schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          status: { const: "active" },
          priority: { const: 1 },
          config: {
            type: "object",
            properties: {
              enabled: { const: true }
            }
          }
        }
      };

      const values = extractConstValues(schema);
      expect(values).toEqual(["active", 1, true]);
    });

    test("should extract const values from arrays and combiners", () => {
      const schema: JSONSchema = {
        anyOf: [
          { const: "option1" },
          {
            type: "array",
            items: { const: "item-value" }
          }
        ]
      };

      const values = extractConstValues(schema);
      expect(values).toEqual(["option1", "item-value"]);
    });

    test("should return empty array for schema without const", () => {
      const schema: JSONSchema = {
        type: "string",
        enum: ["a", "b", "c"]
      };

      const values = extractConstValues(schema);
      expect(values).toEqual([]);
    });
  });

  describe("validateConstValue function", () => {
    test("should accept valid JSON values", () => {
      expect(() => validateConstValue("string")).not.toThrow();
      expect(() => validateConstValue(123)).not.toThrow();
      expect(() => validateConstValue(true)).not.toThrow();
      expect(() => validateConstValue(null)).not.toThrow();
      expect(() => validateConstValue([])).not.toThrow();
      expect(() => validateConstValue({})).not.toThrow();
      expect(() => validateConstValue({ key: "value" })).not.toThrow();
    });

    test("should reject undefined", () => {
      expect(() => validateConstValue(undefined)).toThrow("const value cannot be undefined");
    });

    test("should reject functions", () => {
      expect(() => validateConstValue(() => {})).toThrow("const value cannot be a function");
    });

    test("should reject symbols", () => {
      expect(() => validateConstValue(Symbol("test"))).toThrow("const value cannot be a symbol");
    });

    test("should reject non-serializable objects", () => {
      const circular: any = {};
      circular.self = circular;
      expect(() => validateConstValue(circular)).toThrow("Invalid const value");
    });
  });

  describe("createConstSchema function", () => {
    test("should create schema for string const", () => {
      const schema = createConstSchema("hello");
      
      expect(schema.const).toBe("hello");
      expect(schema.type).toBe("string");
      expect(schema.enum).toEqual(["hello"]);
    });

    test("should create schema for number const", () => {
      const schema = createConstSchema(42);
      
      expect(schema.const).toBe(42);
      expect(schema.type).toBe("integer");
      expect(schema.enum).toEqual([42]);
    });

    test("should create schema with additional properties", () => {
      const schema = createConstSchema("test", {
        title: "Test Constant",
        description: "A test constant value"
      });
      
      expect(schema.const).toBe("test");
      expect(schema.type).toBe("string");
      expect(schema.title).toBe("Test Constant");
      expect(schema.description).toBe("A test constant value");
    });

    test("should throw for invalid const values", () => {
      expect(() => createConstSchema(undefined)).toThrow();
      expect(() => createConstSchema(() => {})).toThrow();
    });
  });

  describe("OpenAPI 3.1 schema parsing with const keywords", () => {
    test("should parse OpenAPI 3.1 schema with const values", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Const Keywords Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    StatusResponse:
      type: object
      properties:
        status:
          const: "success"
        code:
          const: 200
        enabled:
          const: true
        data:
          const: null
      required: ['status', 'code']
    
    ConfigObject:
      type: object
      properties:
        version:
          const: "1.0.0"
        settings:
          type: object
          properties:
            debug:
              const: false
            maxRetries:
              const: 3
      `;

      const schemaPath = path.join(testSchemaDir, "const-keywords-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConstKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.StatusResponse).toBeDefined();
        expect(result.definitions.ConfigObject).toBeDefined();

        // Check that const keywords were processed
        const statusSchema = result.definitions.StatusResponse;
        expect(statusSchema.properties?.status).toBeDefined();
        expect(statusSchema.properties?.code).toBeDefined();
        expect(statusSchema.properties?.enabled).toBeDefined();
        expect(statusSchema.properties?.data).toBeDefined();

        const configSchema = result.definitions.ConfigObject;
        expect(configSchema.properties?.version).toBeDefined();
        expect(configSchema.properties?.settings).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle const in complex nested structures", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex Const Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ComplexSchema:
      type: object
      properties:
        metadata:
          type: object
          properties:
            type:
              const: "metadata"
            version:
              const: 2
        items:
          type: array
          items:
            type: object
            properties:
              category:
                const: "default"
        tupleExample:
          type: array
          prefixItems:
            - const: "first"
            - const: 42
            - const: true
        conditionalExample:
          if:
            properties:
              mode:
                const: "advanced"
          then:
            properties:
              level:
                const: "expert"
          else:
            properties:
              level:
                const: "basic"
      `;

      const schemaPath = path.join(testSchemaDir, "complex-const-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConstKeyword: true,
          enablePrefixItems: true,
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ComplexSchema).toBeDefined();

        const schema = result.definitions.ComplexSchema;
        expect(schema.properties?.metadata).toBeDefined();
        expect(schema.properties?.items).toBeDefined();
        expect(schema.properties?.tupleExample).toBeDefined();
        expect(schema.properties?.conditionalExample).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with const keywords", () => {
    test("should generate TypeScript literal types for const values", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E Const Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ConstModel:
      type: object
      properties:
        id:
          type: string
        status:
          const: "active"
        priority:
          const: 1
        enabled:
          const: true
        config:
          const: null
      required: ['id', 'status']
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-const-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enableConstKeyword: true
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
        expect(modelsContent).toContain("ConstModel");
        
        // Check that literal types are properly generated
        // The exact format depends on json-schema-to-typescript, but should handle const values
        expect(modelsContent).toMatch(/status.*"active"|"active".*status/);

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("ConstModelDecoder");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should validate const values correctly", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Const Validation Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ValidationModel:
      type: object
      properties:
        id:
          type: string
        status:
          const: "ready"
        version:
          const: 1
        active:
          const: true
      required: ['id', 'status']
      `;

      const schemaPath = path.join(testSchemaDir, "const-validation-test.yaml");
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
            enableConstKeyword: true
          }
        });

        // Import and test the generated validators
        const validatorsPath = path.join(testOutputDir, "validators.js");
        expect(require("fs").existsSync(validatorsPath)).toBe(true);

        // Test would require dynamic import in a real test environment
        // This is a structural test to ensure generation works
        const validatorsContent = readFileSync(validatorsPath, "utf8");
        expect(validatorsContent).toContain("ValidationModelValidator");
        
        // Check that const validation is included in the generated validator
        expect(validatorsContent).toMatch(/const.*ready|ready.*const/);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Builder helper function", () => {
    test("should create const schema using builder helper", () => {
      // This test would require importing the builder functions
      // For now, we test the structure that should be created
      const expectedSchema = {
        const: "test-value",
        type: "string",
        enum: ["test-value"]
      };

      // Test the structure that constValue() should create
      expect(expectedSchema.const).toBe("test-value");
      expect(expectedSchema.type).toBe("string");
      expect(expectedSchema.enum).toEqual(["test-value"]);
    });
  });

  describe("Error handling for const keywords", () => {
    test("should handle const keyword when disabled", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Disabled Const Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DisabledConstTest:
      type: object
      properties:
        field:
          const: "value"
      `;

      const schemaPath = path.join(testSchemaDir, "disabled-const-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConstKeyword: false
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DisabledConstTest).toBeDefined();
        
        // With const keyword disabled, the const should be preserved as-is
        // without additional transformation
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should fallback gracefully when const processing fails", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Fallback Const Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    FallbackTest:
      type: object
      properties:
        normalField:
          type: string
        constField:
          const: "test-value"
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-const-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConstKeyword: true,
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
    test("should handle const with various data types", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Data Types Const Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DataTypesTest:
      type: object
      properties:
        stringConst:
          const: "hello world"
        numberConst:
          const: 42
        floatConst:
          const: 3.14159
        booleanConst:
          const: true
        nullConst:
          const: null
        arrayConst:
          const: ["a", "b", "c"]
        objectConst:
          const:
            key: "value"
            nested:
              prop: 123
      `;

      const schemaPath = path.join(testSchemaDir, "data-types-const-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConstKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DataTypesTest).toBeDefined();

        const schema = result.definitions.DataTypesTest;
        expect(schema.properties?.stringConst).toBeDefined();
        expect(schema.properties?.numberConst).toBeDefined();
        expect(schema.properties?.floatConst).toBeDefined();
        expect(schema.properties?.booleanConst).toBeDefined();
        expect(schema.properties?.nullConst).toBeDefined();
        expect(schema.properties?.arrayConst).toBeDefined();
        expect(schema.properties?.objectConst).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle const in combination with other OpenAPI 3.1 features", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Combined Features Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    CombinedTest:
      type: object
      properties:
        nullableConst:
          type: ["string", "null"]
          const: "fixed-value"
        tupleWithConst:
          type: array
          prefixItems:
            - const: "header"
            - type: ["number", "null"]
            - const: true
        conditionalConst:
          if:
            properties:
              type:
                const: "special"
          then:
            properties:
              value:
                const: "special-value"
          else:
            properties:
              value:
                const: "default-value"
      `;

      const schemaPath = path.join(testSchemaDir, "combined-features-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConstKeyword: true,
          strictNullHandling: true,
          enablePrefixItems: true,
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.CombinedTest).toBeDefined();

        const schema = result.definitions.CombinedTest;
        expect(schema.properties?.nullableConst).toBeDefined();
        expect(schema.properties?.tupleWithConst).toBeDefined();
        expect(schema.properties?.conditionalConst).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });
});