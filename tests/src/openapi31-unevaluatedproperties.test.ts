import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { 
  transformUnevaluatedProperties, 
  hasUnevaluatedProperties, 
  extractUnevaluatedPropertiesInfo,
  validateUnevaluatedPropertiesValue,
  createUnevaluatedPropertiesSchema,
  checkUnevaluatedPropertiesConflict
} from "openapi-to-ts-validator/src/transform/openapi31-unevaluatedproperties-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 unevaluatedProperties support", () => {
  const testOutputDir = path.join(__dirname, "../output/unevaluatedproperties-test");
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

  describe("transformUnevaluatedProperties function", () => {
    test("should transform unevaluatedProperties: false", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        unevaluatedProperties: false
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unevaluatedInfo?.disallowed).toBe(true);
      expect(result.unevaluatedInfo?.allowed).toBe(false);
      expect(result.unevaluatedInfo?.hasSchema).toBe(false);
      expect(result.schema.additionalProperties).toBe(false);
      expect(result.schema.unevaluatedProperties).toBe(false);
    });

    test("should transform unevaluatedProperties: true", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        unevaluatedProperties: true
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unevaluatedInfo?.disallowed).toBe(false);
      expect(result.unevaluatedInfo?.allowed).toBe(true);
      expect(result.unevaluatedInfo?.hasSchema).toBe(false);
      expect(result.schema.additionalProperties).toBe(true);
      expect(result.schema.unevaluatedProperties).toBe(true);
    });

    test("should transform unevaluatedProperties with schema", () => {
      const unevaluatedSchema = { type: "string", maxLength: 50 };
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        unevaluatedProperties: unevaluatedSchema
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.unevaluatedInfo?.disallowed).toBe(false);
      expect(result.unevaluatedInfo?.allowed).toBe(true);
      expect(result.unevaluatedInfo?.hasSchema).toBe(true);
      expect(result.unevaluatedInfo?.schema).toEqual(unevaluatedSchema);
      expect(result.schema.additionalProperties).toEqual(unevaluatedSchema);
      expect(result.schema.unevaluatedProperties).toEqual(unevaluatedSchema);
    });

    test("should handle unevaluatedItems for arrays", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ],
        unevaluatedItems: false
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.additionalItems).toBe(false);
      expect(result.schema.unevaluatedItems).toBe(false);
    });

    test("should handle unevaluatedItems with schema", () => {
      const itemSchema = { type: "boolean" };
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" }
        ],
        unevaluatedItems: itemSchema
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.additionalItems).toEqual(itemSchema);
      expect(result.schema.unevaluatedItems).toEqual(itemSchema);
    });

    test("should not transform schema without unevaluatedProperties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        additionalProperties: false
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should recursively transform nested unevaluatedProperties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          nested: {
            type: "object",
            properties: {
              field: { type: "string" }
            },
            unevaluatedProperties: false
          }
        },
        unevaluatedProperties: { type: "string" }
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.additionalProperties).toEqual({ type: "string" });
      
      const nestedProp = result.schema.properties?.nested as JSONSchema;
      expect(nestedProp.additionalProperties).toBe(false);
    });

    test("should transform unevaluatedProperties in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" }
          },
          unevaluatedProperties: false
        }
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      
      const itemsSchema = result.schema.items as JSONSchema;
      expect(itemsSchema.additionalProperties).toBe(false);
    });

    test("should transform unevaluatedProperties in combiners", () => {
      const schema: JSONSchema = {
        anyOf: [
          {
            type: "object",
            properties: { a: { type: "string" } },
            unevaluatedProperties: false
          },
          {
            type: "object", 
            properties: { b: { type: "number" } },
            unevaluatedProperties: { type: "boolean" }
          }
        ]
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      
      const anyOfSchemas = result.schema.anyOf as JSONSchema[];
      expect(anyOfSchemas[0].additionalProperties).toBe(false);
      expect(anyOfSchemas[1].additionalProperties).toEqual({ type: "boolean" });
    });

    test("should transform unevaluatedProperties in conditional schemas", () => {
      const schema: JSONSchema = {
        if: {
          properties: { type: { const: "special" } }
        },
        then: {
          type: "object",
          properties: { value: { type: "string" } },
          unevaluatedProperties: false
        },
        else: {
          type: "object",
          properties: { value: { type: "number" } },
          unevaluatedProperties: true
        }
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      
      const thenSchema = result.schema.then as JSONSchema;
      const elseSchema = result.schema.else as JSONSchema;
      expect(thenSchema.additionalProperties).toBe(false);
      expect(elseSchema.additionalProperties).toBe(true);
    });

    test("should preserve existing additionalProperties when unevaluatedProperties is present", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        additionalProperties: { type: "number" },
        unevaluatedProperties: false
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      // additionalProperties should be preserved as it was already set
      expect(result.schema.additionalProperties).toEqual({ type: "number" });
      expect(result.schema.unevaluatedProperties).toBe(false);
    });

    test("should handle conflict between additionalProperties: true and unevaluatedProperties: false", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        additionalProperties: true,
        unevaluatedProperties: false
      };

      const result = transformUnevaluatedProperties(schema);

      expect(result.wasTransformed).toBe(true);
      // unevaluatedProperties: false should take precedence as it's more restrictive
      expect(result.schema.additionalProperties).toBe(false);
      expect(result.schema.unevaluatedProperties).toBe(false);
    });
  });

  describe("hasUnevaluatedProperties function", () => {
    test("should detect direct unevaluatedProperties", () => {
      const schema: JSONSchema = {
        type: "object",
        unevaluatedProperties: false
      };

      expect(hasUnevaluatedProperties(schema)).toBe(true);
    });

    test("should detect unevaluatedItems", () => {
      const schema: JSONSchema = {
        type: "array",
        unevaluatedItems: true
      };

      expect(hasUnevaluatedProperties(schema)).toBe(true);
    });

    test("should detect unevaluatedProperties in nested schemas", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          nested: {
            type: "object",
            unevaluatedProperties: false
          }
        }
      };

      expect(hasUnevaluatedProperties(schema)).toBe(true);
    });

    test("should detect unevaluatedProperties in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "object",
          unevaluatedProperties: { type: "string" }
        }
      };

      expect(hasUnevaluatedProperties(schema)).toBe(true);
    });

    test("should detect unevaluatedProperties in combiners", () => {
      const schema: JSONSchema = {
        anyOf: [
          { type: "string" },
          {
            type: "object",
            unevaluatedProperties: false
          }
        ]
      };

      expect(hasUnevaluatedProperties(schema)).toBe(true);
    });

    test("should return false for schemas without unevaluatedProperties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        },
        additionalProperties: false
      };

      expect(hasUnevaluatedProperties(schema)).toBe(false);
    });
  });

  describe("extractUnevaluatedPropertiesInfo function", () => {
    test("should extract unevaluatedProperties boolean value", () => {
      const schema: JSONSchema = {
        type: "object",
        unevaluatedProperties: false
      };

      const info = extractUnevaluatedPropertiesInfo(schema);
      
      expect(info.hasUnevaluatedProperties).toBe(true);
      expect(info.hasUnevaluatedItems).toBe(false);
      expect(info.unevaluatedPropertiesValue).toBe(false);
    });

    test("should extract unevaluatedProperties schema value", () => {
      const unevaluatedSchema = { type: "string", maxLength: 100 };
      const schema: JSONSchema = {
        type: "object",
        unevaluatedProperties: unevaluatedSchema
      };

      const info = extractUnevaluatedPropertiesInfo(schema);
      
      expect(info.hasUnevaluatedProperties).toBe(true);
      expect(info.unevaluatedPropertiesValue).toEqual(unevaluatedSchema);
    });

    test("should extract unevaluatedItems information", () => {
      const schema: JSONSchema = {
        type: "array",
        unevaluatedItems: true
      };

      const info = extractUnevaluatedPropertiesInfo(schema);
      
      expect(info.hasUnevaluatedProperties).toBe(false);
      expect(info.hasUnevaluatedItems).toBe(true);
      expect(info.unevaluatedItemsValue).toBe(true);
    });

    test("should return false for schema without unevaluated keywords", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: { name: { type: "string" } }
      };

      const info = extractUnevaluatedPropertiesInfo(schema);
      
      expect(info.hasUnevaluatedProperties).toBe(false);
      expect(info.hasUnevaluatedItems).toBe(false);
    });
  });

  describe("validateUnevaluatedPropertiesValue function", () => {
    test("should accept boolean values", () => {
      expect(() => validateUnevaluatedPropertiesValue(true)).not.toThrow();
      expect(() => validateUnevaluatedPropertiesValue(false)).not.toThrow();
    });

    test("should accept schema objects", () => {
      expect(() => validateUnevaluatedPropertiesValue({ type: "string" })).not.toThrow();
      expect(() => validateUnevaluatedPropertiesValue({})).not.toThrow();
    });

    test("should reject null and undefined", () => {
      expect(() => validateUnevaluatedPropertiesValue(null)).toThrow("cannot be null or undefined");
      expect(() => validateUnevaluatedPropertiesValue(undefined)).toThrow("cannot be null or undefined");
    });

    test("should reject non-boolean, non-object values", () => {
      expect(() => validateUnevaluatedPropertiesValue("string")).toThrow("must be boolean or schema object");
      expect(() => validateUnevaluatedPropertiesValue(123)).toThrow("must be boolean or schema object");
    });
  });

  describe("createUnevaluatedPropertiesSchema function", () => {
    test("should create schema with boolean unevaluatedProperties", () => {
      const schema = createUnevaluatedPropertiesSchema(false);
      
      expect(schema.unevaluatedProperties).toBe(false);
    });

    test("should create schema with schema unevaluatedProperties", () => {
      const unevaluatedSchema = { type: "string", pattern: "^[a-z]+$" };
      const schema = createUnevaluatedPropertiesSchema(unevaluatedSchema);
      
      expect(schema.unevaluatedProperties).toEqual(unevaluatedSchema);
    });

    test("should merge with base schema", () => {
      const baseSchema = {
        type: "object",
        properties: { name: { type: "string" } }
      };
      const schema = createUnevaluatedPropertiesSchema(false, baseSchema);
      
      expect(schema.type).toBe("object");
      expect(schema.properties).toEqual(baseSchema.properties);
      expect(schema.unevaluatedProperties).toBe(false);
    });

    test("should throw for invalid values", () => {
      expect(() => createUnevaluatedPropertiesSchema(null as any)).toThrow();
      expect(() => createUnevaluatedPropertiesSchema("invalid" as any)).toThrow();
    });
  });

  describe("checkUnevaluatedPropertiesConflict function", () => {
    test("should detect no conflict when only one is present", () => {
      const schema1: JSONSchema = {
        type: "object",
        additionalProperties: false
      };
      const schema2: JSONSchema = {
        type: "object",
        unevaluatedProperties: false
      };

      expect(checkUnevaluatedPropertiesConflict(schema1).hasConflict).toBe(false);
      expect(checkUnevaluatedPropertiesConflict(schema2).hasConflict).toBe(false);
    });

    test("should detect boolean mismatch conflict", () => {
      const schema: JSONSchema = {
        type: "object",
        additionalProperties: true,
        unevaluatedProperties: false
      };

      const conflict = checkUnevaluatedPropertiesConflict(schema);
      
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictType).toBe("boolean-mismatch");
      expect(conflict.resolution).toContain("unevaluatedProperties takes precedence");
    });

    test("should detect schema override conflict", () => {
      const schema: JSONSchema = {
        type: "object",
        additionalProperties: true,
        unevaluatedProperties: { type: "string" }
      };

      const conflict = checkUnevaluatedPropertiesConflict(schema);
      
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictType).toBe("schema-override");
    });

    test("should detect complex conflict", () => {
      const schema: JSONSchema = {
        type: "object",
        additionalProperties: { type: "number" },
        unevaluatedProperties: { type: "string" }
      };

      const conflict = checkUnevaluatedPropertiesConflict(schema);
      
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictType).toBe("complex");
    });

    test("should detect no conflict when both are same boolean", () => {
      const schema: JSONSchema = {
        type: "object",
        additionalProperties: false,
        unevaluatedProperties: false
      };

      const conflict = checkUnevaluatedPropertiesConflict(schema);
      
      expect(conflict.hasConflict).toBe(false);
    });
  });

  describe("OpenAPI 3.1 schema parsing with unevaluatedProperties", () => {
    test("should parse OpenAPI 3.1 schema with unevaluatedProperties", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: UnevaluatedProperties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    StrictModel:
      type: object
      properties:
        name:
          type: string
        age:
          type: number
      unevaluatedProperties: false
      required: ['name']
    
    FlexibleModel:
      type: object
      properties:
        id:
          type: string
      unevaluatedProperties: true
    
    SchemaConstrainedModel:
      type: object
      properties:
        core:
          type: string
      unevaluatedProperties:
        type: string
        maxLength: 50
      `;

      const schemaPath = path.join(testSchemaDir, "unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.StrictModel).toBeDefined();
        expect(result.definitions.FlexibleModel).toBeDefined();
        expect(result.definitions.SchemaConstrainedModel).toBeDefined();

        // Check that unevaluatedProperties were processed
        const strictSchema = result.definitions.StrictModel;
        expect(strictSchema.unevaluatedProperties).toBe(false);
        expect(strictSchema.additionalProperties).toBe(false);

        const flexibleSchema = result.definitions.FlexibleModel;
        expect(flexibleSchema.unevaluatedProperties).toBe(true);
        expect(flexibleSchema.additionalProperties).toBe(true);

        const constrainedSchema = result.definitions.SchemaConstrainedModel;
        expect(constrainedSchema.unevaluatedProperties).toEqual({
          type: "string",
          maxLength: 50
        });
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle unevaluatedProperties with complex schemas", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex UnevaluatedProperties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ComplexModel:
      type: object
      properties:
        metadata:
          type: object
          properties:
            version:
              type: string
          unevaluatedProperties:
            type: string
            pattern: "^meta_"
        items:
          type: array
          prefixItems:
            - type: string
            - type: number
          unevaluatedItems: false
        conditional:
          if:
            properties:
              type:
                const: "extended"
          then:
            properties:
              extra:
                type: object
                unevaluatedProperties: false
          else:
            properties:
              basic:
                type: string
      unevaluatedProperties:
        anyOf:
          - type: string
          - type: number
      `;

      const schemaPath = path.join(testSchemaDir, "complex-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true,
          enablePrefixItems: true,
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ComplexModel).toBeDefined();

        const schema = result.definitions.ComplexModel;
        expect(schema.unevaluatedProperties).toBeDefined();
        expect(schema.properties?.metadata).toBeDefined();
        expect(schema.properties?.items).toBeDefined();
        expect(schema.properties?.conditional).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle unevaluatedProperties with inheritance patterns", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Inheritance UnevaluatedProperties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    BaseModel:
      type: object
      properties:
        id:
          type: string
        created:
          type: string
          format: date-time
      unevaluatedProperties: false
    
    ExtendedModel:
      allOf:
        - $ref: '#/components/schemas/BaseModel'
        - type: object
          properties:
            name:
              type: string
            tags:
              type: array
              items:
                type: string
          unevaluatedProperties:
            type: string
            description: "Additional string properties allowed"
      `;

      const schemaPath = path.join(testSchemaDir, "inheritance-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.BaseModel).toBeDefined();
        expect(result.definitions.ExtendedModel).toBeDefined();

        const baseSchema = result.definitions.BaseModel;
        expect(baseSchema.unevaluatedProperties).toBe(false);

        const extendedSchema = result.definitions.ExtendedModel;
        expect(extendedSchema.allOf).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with unevaluatedProperties", () => {
    test("should generate TypeScript types with proper additional properties handling", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E UnevaluatedProperties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    StrictType:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
      unevaluatedProperties: false
      required: ['id']
    
    FlexibleType:
      type: object
      properties:
        id:
          type: string
      unevaluatedProperties: true
    
    ConstrainedType:
      type: object
      properties:
        core:
          type: string
      unevaluatedProperties:
        type: number
        minimum: 0
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enableUnevaluatedProperties: true
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
        expect(modelsContent).toContain("StrictType");
        expect(modelsContent).toContain("FlexibleType");
        expect(modelsContent).toContain("ConstrainedType");

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("StrictTypeDecoder");
        expect(decodersContent).toContain("FlexibleTypeDecoder");
        expect(decodersContent).toContain("ConstrainedTypeDecoder");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should validate unevaluatedProperties correctly", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: UnevaluatedProperties Validation Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ValidationModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
      unevaluatedProperties: false
      required: ['id']
    
    FlexibleValidationModel:
      type: object
      properties:
        core:
          type: string
      unevaluatedProperties:
        type: string
        minLength: 1
      `;

      const schemaPath = path.join(testSchemaDir, "unevaluatedproperties-validation-test.yaml");
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
            enableUnevaluatedProperties: true
          }
        });

        // Import and test the generated validators
        const validatorsPath = path.join(testOutputDir, "validators.js");
        expect(require("fs").existsSync(validatorsPath)).toBe(true);

        // Test would require dynamic import in a real test environment
        // This is a structural test to ensure generation works
        const validatorsContent = readFileSync(validatorsPath, "utf8");
        expect(validatorsContent).toContain("ValidationModelValidator");
        expect(validatorsContent).toContain("FlexibleValidationModelValidator");
        
        // Check that unevaluatedProperties validation is included
        expect(validatorsContent).toMatch(/unevaluatedProperties|additionalProperties/);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Error handling for unevaluatedProperties", () => {
    test("should handle unevaluatedProperties when disabled", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Disabled UnevaluatedProperties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DisabledTest:
      type: object
      properties:
        field:
          type: string
      unevaluatedProperties: false
      `;

      const schemaPath = path.join(testSchemaDir, "disabled-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: false
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DisabledTest).toBeDefined();
        
        // With unevaluatedProperties disabled, it should be preserved as-is
        // without additional transformation
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should fallback gracefully when unevaluatedProperties processing fails", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Fallback UnevaluatedProperties Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    FallbackTest:
      type: object
      properties:
        normalField:
          type: string
        constrainedField:
          type: number
      unevaluatedProperties:
        type: string
        pattern: "^[a-z]+$"
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true,
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

  describe("Integration with other OpenAPI 3.1 features", () => {
    test("should work with null types and unevaluatedProperties", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Integration Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    IntegratedModel:
      type: object
      properties:
        nullableField:
          type: ["string", "null"]
        requiredField:
          type: string
      unevaluatedProperties:
        type: ["string", "number"]
      required: ['requiredField']
      `;

      const schemaPath = path.join(testSchemaDir, "integration-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true,
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.IntegratedModel).toBeDefined();

        const schema = result.definitions.IntegratedModel;
        expect(schema.unevaluatedProperties).toBeDefined();
        expect(schema.properties?.nullableField).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should work with prefixItems and unevaluatedItems", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Array Integration Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    TupleModel:
      type: object
      properties:
        fixedTuple:
          type: array
          prefixItems:
            - type: string
            - type: number
            - type: boolean
          unevaluatedItems: false
        flexibleTuple:
          type: array
          prefixItems:
            - type: string
          unevaluatedItems:
            type: number
            minimum: 0
      unevaluatedProperties: false
      `;

      const schemaPath = path.join(testSchemaDir, "array-integration-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true,
          enablePrefixItems: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.TupleModel).toBeDefined();

        const schema = result.definitions.TupleModel;
        expect(schema.unevaluatedProperties).toBe(false);
        expect(schema.properties?.fixedTuple).toBeDefined();
        expect(schema.properties?.flexibleTuple).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Edge cases and complex scenarios", () => {
    test("should handle deeply nested unevaluatedProperties", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Deep Nesting Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DeepModel:
      type: object
      properties:
        level1:
          type: object
          properties:
            level2:
              type: object
              properties:
                level3:
                  type: object
                  properties:
                    core:
                      type: string
                  unevaluatedProperties:
                    type: number
              unevaluatedProperties: false
          unevaluatedProperties: true
      unevaluatedProperties:
        type: string
        maxLength: 100
      `;

      const schemaPath = path.join(testSchemaDir, "deep-nesting-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DeepModel).toBeDefined();

        const schema = result.definitions.DeepModel;
        expect(schema.unevaluatedProperties).toBeDefined();
        
        // Check nested transformations
        const level1 = schema.properties?.level1 as JSONSchema;
        expect(level1.unevaluatedProperties).toBe(true);
        
        const level2 = level1.properties?.level2 as JSONSchema;
        expect(level2.unevaluatedProperties).toBe(false);
        
        const level3 = level2.properties?.level3 as JSONSchema;
        expect(level3.unevaluatedProperties).toEqual({ type: "number" });
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle unevaluatedProperties with complex combiners", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex Combiners Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ComplexCombinerModel:
      anyOf:
        - type: object
          properties:
            typeA:
              type: string
          unevaluatedProperties: false
        - type: object
          properties:
            typeB:
              type: number
          unevaluatedProperties:
            type: boolean
        - allOf:
            - type: object
              properties:
                shared:
                  type: string
            - type: object
              properties:
                specific:
                  type: number
              unevaluatedProperties: true
      `;

      const schemaPath = path.join(testSchemaDir, "complex-combiners-unevaluatedproperties-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableUnevaluatedProperties: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ComplexCombinerModel).toBeDefined();

        const schema = result.definitions.ComplexCombinerModel;
        expect(schema.anyOf).toBeDefined();
        
        const anyOfSchemas = schema.anyOf as JSONSchema[];
        expect(anyOfSchemas[0].unevaluatedProperties).toBe(false);
        expect(anyOfSchemas[1].unevaluatedProperties).toEqual({ type: "boolean" });
        expect(anyOfSchemas[2].allOf).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });
});