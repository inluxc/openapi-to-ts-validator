import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { 
  transformPrefixItems, 
  hasPrefixItems, 
  extractTupleInfo, 
  validatePrefixItemsConfig, 
  createTupleSchema 
} from "openapi-to-ts-validator/src/transform/openapi31-prefixitems-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 prefixItems support", () => {
  const testOutputDir = path.join(__dirname, "../output/prefixitems-test");
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

  describe("transformPrefixItems function", () => {
    test("should transform simple prefixItems to items array", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" }
        ]
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.tupleInfo).toBeDefined();
      expect(result.tupleInfo?.prefixItems).toHaveLength(3);
      expect(result.tupleInfo?.minItems).toBe(3);
      expect(result.tupleInfo?.additionalItems).toBe(true);
      
      expect(result.schema.prefixItems).toBeUndefined();
      expect(Array.isArray(result.schema.items)).toBe(true);
      expect(result.schema.items).toHaveLength(3);
      expect(result.schema.minItems).toBe(3);
      expect(result.schema.additionalItems).toBe(true);
    });

    test("should handle prefixItems with items: false (fixed tuple)", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ],
        items: false
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.tupleInfo?.additionalItems).toBe(false);
      expect(result.tupleInfo?.maxItems).toBe(2);
      
      expect(result.schema.items).toEqual([
        { type: "string" },
        { type: "number" }
      ]);
      expect(result.schema.minItems).toBe(2);
      expect(result.schema.maxItems).toBe(2);
    });

    test("should handle prefixItems with items schema (additional items allowed)", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ],
        items: { type: "boolean" }
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.tupleInfo?.additionalItems).toEqual({ type: "boolean" });
      
      expect(result.schema.items).toEqual([
        { type: "string" },
        { type: "number" }
      ]);
      expect(result.schema.additionalItems).toEqual({ type: "boolean" });
      expect(result.schema.minItems).toBe(2);
      expect(result.schema.maxItems).toBeUndefined();
    });

    test("should handle prefixItems with additionalItems: false", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ],
        additionalItems: false
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.tupleInfo?.additionalItems).toBe(false);
      expect(result.tupleInfo?.maxItems).toBe(2);
      
      expect(result.schema.items).toEqual([
        { type: "string" },
        { type: "number" }
      ]);
      expect(result.schema.minItems).toBe(2);
      expect(result.schema.maxItems).toBe(2);
    });

    test("should handle prefixItems with additionalItems schema", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" }
        ],
        additionalItems: { type: "number" }
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.tupleInfo?.additionalItems).toEqual({ type: "number" });
      
      expect(result.schema.items).toEqual([{ type: "string" }]);
      expect(result.schema.additionalItems).toEqual({ type: "number" });
      expect(result.schema.minItems).toBe(1);
    });

    test("should handle empty prefixItems array", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: []
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.prefixItems).toBeUndefined();
    });

    test("should not transform schema without prefixItems", () => {
      const schema: JSONSchema = {
        type: "array",
        items: { type: "string" }
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should recursively transform nested prefixItems in properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          coordinates: {
            type: "array",
            prefixItems: [
              { type: "number" },
              { type: "number" }
            ],
            items: false
          },
          tags: {
            type: "array",
            prefixItems: [
              { type: "string" }
            ],
            additionalItems: { type: "string" }
          }
        }
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      
      const coordinatesProp = result.schema.properties?.coordinates as JSONSchema;
      expect(coordinatesProp.prefixItems).toBeUndefined();
      expect(Array.isArray(coordinatesProp.items)).toBe(true);
      expect(coordinatesProp.minItems).toBe(2);
      expect(coordinatesProp.maxItems).toBe(2);

      const tagsProp = result.schema.properties?.tags as JSONSchema;
      expect(tagsProp.prefixItems).toBeUndefined();
      expect(Array.isArray(tagsProp.items)).toBe(true);
      expect(tagsProp.additionalItems).toEqual({ type: "string" });
    });

    test("should transform prefixItems in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "array",
          prefixItems: [
            { type: "string" },
            { type: "number" }
          ]
        }
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      
      const itemsSchema = result.schema.items as JSONSchema;
      expect(itemsSchema.prefixItems).toBeUndefined();
      expect(Array.isArray(itemsSchema.items)).toBe(true);
      expect(itemsSchema.minItems).toBe(2);
    });

    test("should transform prefixItems in combiners (anyOf, oneOf, allOf)", () => {
      const schema: JSONSchema = {
        anyOf: [
          {
            type: "array",
            prefixItems: [{ type: "string" }]
          },
          {
            type: "array",
            prefixItems: [{ type: "number" }, { type: "boolean" }],
            items: false
          }
        ]
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      
      const anyOfSchemas = result.schema.anyOf as JSONSchema[];
      expect(anyOfSchemas[0].prefixItems).toBeUndefined();
      expect(Array.isArray(anyOfSchemas[0].items)).toBe(true);
      
      expect(anyOfSchemas[1].prefixItems).toBeUndefined();
      expect(Array.isArray(anyOfSchemas[1].items)).toBe(true);
      expect(anyOfSchemas[1].maxItems).toBe(2);
    });

    test("should transform prefixItems in conditional schemas", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "tuple" }
          }
        },
        then: {
          properties: {
            data: {
              type: "array",
              prefixItems: [
                { type: "string" },
                { type: "number" }
              ],
              items: false
            }
          }
        }
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      
      const thenSchema = result.schema.then as JSONSchema;
      const dataProp = (thenSchema.properties?.data as JSONSchema);
      expect(dataProp.prefixItems).toBeUndefined();
      expect(Array.isArray(dataProp.items)).toBe(true);
      expect(dataProp.maxItems).toBe(2);
    });

    test("should handle complex nested prefixItems with const values", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { const: "header" },
          { type: "number", minimum: 0 },
          {
            type: "object",
            properties: {
              nested: {
                type: "array",
                prefixItems: [{ type: "boolean" }]
              }
            }
          }
        ],
        additionalItems: false
      };

      const result = transformPrefixItems(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.tupleInfo?.maxItems).toBe(3);
      
      const items = result.schema.items as JSONSchema[];
      expect(items[0].const).toBe("header");
      expect(items[1].type).toBe("number");
      expect(items[1].minimum).toBe(0);
      
      const nestedObject = items[2];
      const nestedArray = nestedObject.properties?.nested as JSONSchema;
      expect(nestedArray.prefixItems).toBeUndefined();
      expect(Array.isArray(nestedArray.items)).toBe(true);
    });
  });

  describe("hasPrefixItems function", () => {
    test("should detect direct prefixItems", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [{ type: "string" }]
      };

      expect(hasPrefixItems(schema)).toBe(true);
    });

    test("should detect prefixItems in nested properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          tuple: {
            type: "array",
            prefixItems: [{ type: "number" }]
          }
        }
      };

      expect(hasPrefixItems(schema)).toBe(true);
    });

    test("should detect prefixItems in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "array",
          prefixItems: [{ type: "boolean" }]
        }
      };

      expect(hasPrefixItems(schema)).toBe(true);
    });

    test("should detect prefixItems in combiners", () => {
      const schema: JSONSchema = {
        oneOf: [
          { type: "string" },
          {
            type: "array",
            prefixItems: [{ type: "number" }]
          }
        ]
      };

      expect(hasPrefixItems(schema)).toBe(true);
    });

    test("should return false for schemas without prefixItems", () => {
      const schema: JSONSchema = {
        type: "array",
        items: { type: "string" }
      };

      expect(hasPrefixItems(schema)).toBe(false);
    });
  });

  describe("extractTupleInfo function", () => {
    test("should extract tuple info from transformed schema", () => {
      const schema: JSONSchema = {
        type: "array",
        items: [
          { type: "string" },
          { type: "number" }
        ],
        minItems: 2,
        maxItems: 2
      };

      const tupleInfos = extractTupleInfo(schema);
      
      expect(tupleInfos).toHaveLength(1);
      expect(tupleInfos[0].prefixItems).toHaveLength(2);
      expect(tupleInfos[0].minItems).toBe(2);
      expect(tupleInfos[0].maxItems).toBe(2);
      expect(tupleInfos[0].additionalItems).toBe(false);
    });

    test("should extract tuple info with additional items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: [{ type: "string" }],
        minItems: 1,
        additionalItems: { type: "number" }
      };

      const tupleInfos = extractTupleInfo(schema);
      
      expect(tupleInfos).toHaveLength(1);
      expect(tupleInfos[0].prefixItems).toHaveLength(1);
      expect(tupleInfos[0].additionalItems).toEqual({ type: "number" });
    });

    test("should extract multiple tuple infos from nested schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          tuple1: {
            type: "array",
            items: [{ type: "string" }],
            minItems: 1
          },
          tuple2: {
            type: "array",
            items: [{ type: "number" }, { type: "boolean" }],
            minItems: 2,
            maxItems: 2
          }
        }
      };

      const tupleInfos = extractTupleInfo(schema);
      expect(tupleInfos).toHaveLength(2);
    });

    test("should return empty array for non-tuple schemas", () => {
      const schema: JSONSchema = {
        type: "array",
        items: { type: "string" }
      };

      const tupleInfos = extractTupleInfo(schema);
      expect(tupleInfos).toHaveLength(0);
    });
  });

  describe("validatePrefixItemsConfig function", () => {
    test("should accept valid prefixItems configuration", () => {
      const prefixItems = [
        { type: "string" },
        { type: "number" }
      ];

      expect(() => validatePrefixItemsConfig(prefixItems)).not.toThrow();
      expect(() => validatePrefixItemsConfig(prefixItems, false)).not.toThrow();
      expect(() => validatePrefixItemsConfig(prefixItems, { type: "boolean" })).not.toThrow();
    });

    test("should reject non-array prefixItems", () => {
      expect(() => validatePrefixItemsConfig({} as any)).toThrow("prefixItems must be an array");
    });

    test("should reject empty prefixItems array", () => {
      expect(() => validatePrefixItemsConfig([])).toThrow("prefixItems array cannot be empty");
    });

    test("should reject invalid schema objects in prefixItems", () => {
      expect(() => validatePrefixItemsConfig([null as any])).toThrow("prefixItems[0] must be a valid schema object");
      expect(() => validatePrefixItemsConfig(["string" as any])).toThrow("prefixItems[0] must be a valid schema object");
    });

    test("should reject items array with prefixItems", () => {
      const prefixItems = [{ type: "string" }];
      const items = [{ type: "number" }];
      
      expect(() => validatePrefixItemsConfig(prefixItems, items)).toThrow("Cannot use both prefixItems and items array");
    });

    test("should reject additionalItems with items: false", () => {
      const prefixItems = [{ type: "string" }];
      
      expect(() => validatePrefixItemsConfig(prefixItems, false, { type: "number" })).toThrow("Cannot specify additionalItems when items is false");
    });
  });

  describe("createTupleSchema function", () => {
    test("should create basic tuple schema", () => {
      const prefixItems = [
        { type: "string" },
        { type: "number" }
      ];

      const schema = createTupleSchema(prefixItems);

      expect(schema.type).toBe("array");
      expect(schema.prefixItems).toEqual(prefixItems);
      expect(schema.minItems).toBe(2);
    });

    test("should create fixed tuple schema", () => {
      const prefixItems = [{ type: "string" }];
      
      const schema = createTupleSchema(prefixItems, {
        additionalItems: false,
        maxItems: 1
      });

      expect(schema.prefixItems).toEqual(prefixItems);
      expect(schema.items).toBe(false);
      expect(schema.maxItems).toBe(1);
    });

    test("should create tuple with additional items schema", () => {
      const prefixItems = [{ type: "string" }];
      const additionalItems = { type: "number" };
      
      const schema = createTupleSchema(prefixItems, {
        additionalItems
      });

      expect(schema.prefixItems).toEqual(prefixItems);
      expect(schema.additionalItems).toEqual(additionalItems);
    });

    test("should throw for invalid configuration", () => {
      expect(() => createTupleSchema([])).toThrow();
      expect(() => createTupleSchema([null as any])).toThrow();
    });
  });

  describe("OpenAPI 3.1 schema parsing with prefixItems", () => {
    test("should parse OpenAPI 3.1 schema with prefixItems", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: PrefixItems Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    CoordinatesTuple:
      type: array
      prefixItems:
        - type: number
          description: "X coordinate"
        - type: number
          description: "Y coordinate"
      items: false
      description: "Fixed 2D coordinates tuple"
    
    FlexibleTuple:
      type: array
      prefixItems:
        - type: string
          description: "Header"
        - type: number
          description: "Version"
      additionalItems:
        type: string
        description: "Additional data"
      description: "Tuple with additional items allowed"
    
    NestedTuples:
      type: object
      properties:
        point:
          type: array
          prefixItems:
            - type: number
            - type: number
          items: false
        metadata:
          type: array
          prefixItems:
            - const: "meta"
            - type: object
              properties:
                version:
                  type: number
      `;

      const schemaPath = path.join(testSchemaDir, "prefixitems-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.CoordinatesTuple).toBeDefined();
        expect(result.definitions.FlexibleTuple).toBeDefined();
        expect(result.definitions.NestedTuples).toBeDefined();

        // Check that prefixItems were transformed
        const coordsSchema = result.definitions.CoordinatesTuple;
        expect(coordsSchema.prefixItems).toBeUndefined();
        expect(Array.isArray(coordsSchema.items)).toBe(true);
        expect(coordsSchema.minItems).toBe(2);
        expect(coordsSchema.maxItems).toBe(2);

        const flexibleSchema = result.definitions.FlexibleTuple;
        expect(flexibleSchema.prefixItems).toBeUndefined();
        expect(Array.isArray(flexibleSchema.items)).toBe(true);
        expect(flexibleSchema.additionalItems).toBeDefined();
        expect(flexibleSchema.minItems).toBe(2);

        const nestedSchema = result.definitions.NestedTuples;
        expect(nestedSchema.properties?.point).toBeDefined();
        expect(nestedSchema.properties?.metadata).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle complex prefixItems with mixed types", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex PrefixItems Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ComplexTuple:
      type: array
      prefixItems:
        - const: "header"
        - type: ["number", "null"]
        - type: object
          properties:
            id:
              type: string
            active:
              const: true
        - type: array
          items:
            type: string
      additionalItems: false
      minItems: 4
      maxItems: 4
      
    ConditionalTuple:
      if:
        properties:
          type:
            const: "tuple"
      then:
        properties:
          data:
            type: array
            prefixItems:
              - type: string
              - type: number
            items: false
      else:
        properties:
          data:
            type: array
            items:
              type: string
      `;

      const schemaPath = path.join(testSchemaDir, "complex-prefixitems-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: true,
          enableConditionalSchemas: true,
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ComplexTuple).toBeDefined();
        expect(result.definitions.ConditionalTuple).toBeDefined();

        const complexSchema = result.definitions.ComplexTuple;
        expect(complexSchema.prefixItems).toBeUndefined();
        expect(Array.isArray(complexSchema.items)).toBe(true);
        expect(complexSchema.items).toHaveLength(4);
        expect(complexSchema.maxItems).toBe(4);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with prefixItems", () => {
    test("should generate TypeScript tuple types for prefixItems", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E PrefixItems Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Point2D:
      type: array
      prefixItems:
        - type: number
        - type: number
      items: false
      description: "2D point coordinates [x, y]"
    
    VersionedData:
      type: array
      prefixItems:
        - const: "v1"
        - type: number
        - type: object
          properties:
            data:
              type: string
      additionalItems:
        type: string
      description: "Versioned data with additional metadata"
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-prefixitems-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enablePrefixItems: true
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
        expect(modelsContent).toContain("Point2D");
        expect(modelsContent).toContain("VersionedData");
        
        // The exact tuple type format depends on json-schema-to-typescript
        // but should generate array types with proper constraints

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("Point2DDecoder");
        expect(decodersContent).toContain("VersionedDataDecoder");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should validate tuple constraints correctly", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Tuple Validation Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    StrictTuple:
      type: array
      prefixItems:
        - type: string
        - type: number
        - type: boolean
      items: false
      minItems: 3
      maxItems: 3
      
    FlexibleTuple:
      type: array
      prefixItems:
        - type: string
      additionalItems:
        type: number
      minItems: 1
      `;

      const schemaPath = path.join(testSchemaDir, "tuple-validation-test.yaml");
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
            enablePrefixItems: true
          }
        });

        // Import and test the generated validators
        const validatorsPath = path.join(testOutputDir, "validators.js");
        expect(require("fs").existsSync(validatorsPath)).toBe(true);

        // Test would require dynamic import in a real test environment
        // This is a structural test to ensure generation works
        const validatorsContent = readFileSync(validatorsPath, "utf8");
        expect(validatorsContent).toContain("StrictTupleValidator");
        expect(validatorsContent).toContain("FlexibleTupleValidator");
        
        // Check that tuple validation constraints are included
        expect(validatorsContent).toMatch(/minItems.*3|3.*minItems/);
        expect(validatorsContent).toMatch(/maxItems.*3|3.*maxItems/);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Error handling for prefixItems", () => {
    test("should handle prefixItems when disabled", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Disabled PrefixItems Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DisabledTuple:
      type: array
      prefixItems:
        - type: string
        - type: number
      `;

      const schemaPath = path.join(testSchemaDir, "disabled-prefixitems-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: false
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DisabledTuple).toBeDefined();
        
        // With prefixItems disabled, the prefixItems should be preserved as-is
        // without transformation to items array
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should fallback gracefully when prefixItems processing fails", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Fallback PrefixItems Test API
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
        tupleArray:
          type: array
          prefixItems:
            - type: string
            - type: number
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-prefixitems-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: true,
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
    test("should work with null types and const values", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Integration Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    IntegratedTuple:
      type: array
      prefixItems:
        - const: "header"
        - type: ["string", "null"]
        - type: number
        - type: ["boolean", "null"]
      additionalItems: false
      `;

      const schemaPath = path.join(testSchemaDir, "integration-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: true,
          strictNullHandling: true,
          enableConstKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.IntegratedTuple).toBeDefined();

        const schema = result.definitions.IntegratedTuple;
        expect(schema.prefixItems).toBeUndefined();
        expect(Array.isArray(schema.items)).toBe(true);
        expect(schema.items).toHaveLength(4);
        expect(schema.maxItems).toBe(4);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle prefixItems in conditional schemas", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Conditional PrefixItems Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ConditionalData:
      type: object
      properties:
        type:
          type: string
          enum: ["point", "line"]
        coordinates:
          if:
            properties:
              type:
                const: "point"
          then:
            type: array
            prefixItems:
              - type: number
              - type: number
            items: false
            description: "Point coordinates [x, y]"
          else:
            type: array
            prefixItems:
              - type: number
              - type: number
              - type: number
              - type: number
            items: false
            description: "Line coordinates [x1, y1, x2, y2]"
      `;

      const schemaPath = path.join(testSchemaDir, "conditional-prefixitems-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: true,
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ConditionalData).toBeDefined();

        const schema = result.definitions.ConditionalData;
        const coordinatesProp = schema.properties?.coordinates as JSONSchema;
        
        // Check that conditional schemas were processed
        expect(coordinatesProp.if).toBeDefined();
        expect(coordinatesProp.then).toBeDefined();
        expect(coordinatesProp.else).toBeDefined();
        
        // Check that prefixItems in then/else were transformed
        const thenSchema = coordinatesProp.then as JSONSchema;
        const elseSchema = coordinatesProp.else as JSONSchema;
        
        expect(thenSchema.prefixItems).toBeUndefined();
        expect(Array.isArray(thenSchema.items)).toBe(true);
        expect(thenSchema.maxItems).toBe(2);
        
        expect(elseSchema.prefixItems).toBeUndefined();
        expect(Array.isArray(elseSchema.items)).toBe(true);
        expect(elseSchema.maxItems).toBe(4);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Performance and edge cases", () => {
    test("should handle deeply nested prefixItems", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Deep Nesting Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DeeplyNested:
      type: object
      properties:
        level1:
          type: array
          prefixItems:
            - type: object
              properties:
                level2:
                  type: array
                  prefixItems:
                    - type: object
                      properties:
                        level3:
                          type: array
                          prefixItems:
                            - type: string
                            - type: number
                          items: false
      `;

      const schemaPath = path.join(testSchemaDir, "deep-nesting-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enablePrefixItems: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DeeplyNested).toBeDefined();

        // Verify that all levels were processed correctly
        const schema = result.definitions.DeeplyNested;
        expect(schema.properties?.level1).toBeDefined();
        
        const level1 = schema.properties?.level1 as JSONSchema;
        expect(level1.prefixItems).toBeUndefined();
        expect(Array.isArray(level1.items)).toBe(true);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle large prefixItems arrays", async () => {
      // Create a schema with many prefix items
      const prefixItems = Array.from({ length: 20 }, (_, i) => ({
        type: i % 2 === 0 ? "string" : "number",
        description: `Item ${i}`
      }));

      const testSchema = {
        openapi: "3.1.0",
        info: {
          title: "Large PrefixItems Test API",
          version: "1.0.0"
        },
        paths: {},
        components: {
          schemas: {
            LargeTuple: {
              type: "array",
              prefixItems,
              items: false
            }
          }
        }
      };

      const schemaPath = path.join(testSchemaDir, "large-prefixitems-test.json");
      writeFileSync(schemaPath, JSON.stringify(testSchema, null, 2));

      try {
        const result = await parseSchema(schemaPath, "json", {
          enablePrefixItems: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.LargeTuple).toBeDefined();

        const schema = result.definitions.LargeTuple;
        expect(schema.prefixItems).toBeUndefined();
        expect(Array.isArray(schema.items)).toBe(true);
        expect(schema.items).toHaveLength(20);
        expect(schema.maxItems).toBe(20);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });
});