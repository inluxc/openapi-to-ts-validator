import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { 
  transformConditionalSchemas, 
  hasConditionalSchemas, 
  extractConditionalPatterns, 
  createConditionalSchema, 
  validateConditionalSchemaStructure 
} from "openapi-to-ts-validator/src/transform/openapi31-conditional-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 conditional schema support", () => {
  const testOutputDir = path.join(__dirname, "../output/conditional-schema-test");
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

  describe("transformConditionalSchemas function", () => {
    test("should transform simple if/then conditional schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          type: { type: "string" }
        },
        if: {
          properties: {
            type: { const: "premium" }
          }
        },
        then: {
          properties: {
            features: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["features"]
        }
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(1);
      expect(result.conditionalPatterns![0].if).toEqual({
        properties: {
          type: { const: "premium" }
        }
      });
      expect(result.conditionalPatterns![0].then).toEqual({
        properties: {
          features: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["features"]
      });
      expect(result.schema.if).toBeDefined();
      expect(result.schema.then).toBeDefined();
    });

    test("should transform if/then/else conditional schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          userType: { type: "string" }
        },
        if: {
          properties: {
            userType: { const: "admin" }
          }
        },
        then: {
          properties: {
            permissions: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["permissions"]
        },
        else: {
          properties: {
            permissions: {
              type: "array",
              items: { type: "string" },
              maxItems: 5
            }
          }
        }
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(1);
      expect(result.conditionalPatterns![0].if).toBeDefined();
      expect(result.conditionalPatterns![0].then).toBeDefined();
      expect(result.conditionalPatterns![0].else).toBeDefined();
      expect(result.schema.if).toBeDefined();
      expect(result.schema.then).toBeDefined();
      expect(result.schema.else).toBeDefined();
    });

    test("should transform nested conditional schemas", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          config: {
            type: "object",
            properties: {
              mode: { type: "string" }
            },
            if: {
              properties: {
                mode: { const: "advanced" }
              }
            },
            then: {
              properties: {
                advancedSettings: {
                  type: "object",
                  properties: {
                    level: { type: "string" }
                  },
                  if: {
                    properties: {
                      level: { const: "expert" }
                    }
                  },
                  then: {
                    properties: {
                      expertOptions: { type: "array" }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(2);
      expect(result.conditionalPatterns![0].location).toBe("#/properties/config");
      expect(result.conditionalPatterns![1].location).toBe("#/properties/config/then/properties/advancedSettings");
    });

    test("should transform conditional schemas in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" }
          },
          if: {
            properties: {
              type: { const: "special" }
            }
          },
          then: {
            properties: {
              specialValue: { type: "string" }
            },
            required: ["specialValue"]
          }
        }
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(1);
      expect(result.conditionalPatterns![0].location).toBe("#/items");
    });

    test("should transform conditional schemas in prefixItems", () => {
      const schema: JSONSchema = {
        type: "array",
        prefixItems: [
          { type: "string" },
          {
            type: "object",
            properties: {
              category: { type: "string" }
            },
            if: {
              properties: {
                category: { const: "premium" }
              }
            },
            then: {
              properties: {
                price: { type: "number", minimum: 100 }
              }
            }
          }
        ]
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(1);
      expect(result.conditionalPatterns![0].location).toBe("#/prefixItems/1");
    });

    test("should transform conditional schemas in combiners", () => {
      const schema: JSONSchema = {
        anyOf: [
          {
            type: "object",
            properties: {
              type: { const: "A" }
            },
            if: {
              properties: {
                subtype: { const: "A1" }
              }
            },
            then: {
              properties: {
                valueA1: { type: "string" }
              }
            }
          },
          {
            type: "object",
            properties: {
              type: { const: "B" }
            }
          }
        ]
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(1);
      expect(result.conditionalPatterns![0].location).toBe("#/anyOf/0");
    });

    test("should not transform schema without conditional logic", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        }
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.schema).toEqual(schema);
    });

    test("should handle complex nested conditional scenarios", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              role: { type: "string" },
              department: { type: "string" }
            },
            if: {
              properties: {
                role: { const: "manager" }
              }
            },
            then: {
              properties: {
                team: {
                  type: "object",
                  properties: {
                    size: { type: "number" }
                  },
                  if: {
                    properties: {
                      size: { type: "number", minimum: 10 }
                    }
                  },
                  then: {
                    properties: {
                      budget: { type: "number", minimum: 50000 }
                    }
                  },
                  else: {
                    properties: {
                      budget: { type: "number", maximum: 25000 }
                    }
                  }
                }
              }
            },
            else: {
              properties: {
                supervisor: { type: "string" }
              },
              required: ["supervisor"]
            }
          }
        }
      };

      const result = transformConditionalSchemas(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.conditionalPatterns).toHaveLength(2);
      
      // Check that both conditional patterns were found
      const locations = result.conditionalPatterns!.map(p => p.location);
      expect(locations).toContain("#/properties/user");
      expect(locations).toContain("#/properties/user/then/properties/team");
    });
  });

  describe("hasConditionalSchemas function", () => {
    test("should detect direct conditional schema", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "test" }
          }
        },
        then: {
          properties: {
            value: { type: "string" }
          }
        }
      };

      expect(hasConditionalSchemas(schema)).toBe(true);
    });

    test("should detect conditional schema in nested properties", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          config: {
            if: {
              properties: {
                mode: { const: "advanced" }
              }
            },
            then: {
              properties: {
                settings: { type: "object" }
              }
            }
          }
        }
      };

      expect(hasConditionalSchemas(schema)).toBe(true);
    });

    test("should detect conditional schema in array items", () => {
      const schema: JSONSchema = {
        type: "array",
        items: {
          if: {
            properties: {
              type: { const: "special" }
            }
          },
          then: {
            properties: {
              specialField: { type: "string" }
            }
          }
        }
      };

      expect(hasConditionalSchemas(schema)).toBe(true);
    });

    test("should return false for schemas without conditional logic", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          items: {
            type: "array",
            items: { type: "string" }
          }
        }
      };

      expect(hasConditionalSchemas(schema)).toBe(false);
    });
  });

  describe("extractConditionalPatterns function", () => {
    test("should extract single conditional pattern", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "premium" }
          }
        },
        then: {
          properties: {
            features: { type: "array" }
          }
        }
      };

      const patterns = extractConditionalPatterns(schema);
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].if).toEqual({
        properties: {
          type: { const: "premium" }
        }
      });
      expect(patterns[0].then).toEqual({
        properties: {
          features: { type: "array" }
        }
      });
      expect(patterns[0].location).toBe("#/");
    });

    test("should extract multiple conditional patterns from nested schema", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          user: {
            if: {
              properties: {
                role: { const: "admin" }
              }
            },
            then: {
              properties: {
                permissions: { type: "array" }
              }
            }
          },
          config: {
            if: {
              properties: {
                mode: { const: "debug" }
              }
            },
            then: {
              properties: {
                logLevel: { const: "verbose" }
              }
            }
          }
        }
      };

      const patterns = extractConditionalPatterns(schema);
      
      expect(patterns).toHaveLength(2);
      expect(patterns[0].location).toBe("#/properties/user");
      expect(patterns[1].location).toBe("#/properties/config");
    });

    test("should return empty array for schema without conditional patterns", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        }
      };

      const patterns = extractConditionalPatterns(schema);
      expect(patterns).toEqual([]);
    });
  });

  describe("createConditionalSchema function", () => {
    test("should create conditional schema with if/then", () => {
      const ifSchema = {
        properties: {
          type: { const: "premium" }
        }
      };
      const thenSchema = {
        properties: {
          features: { type: "array" }
        }
      };

      const schema = createConditionalSchema(ifSchema, thenSchema);

      expect(schema.if).toEqual(ifSchema);
      expect(schema.then).toEqual(thenSchema);
      expect(schema.else).toBeUndefined();
    });

    test("should create conditional schema with if/then/else", () => {
      const ifSchema = {
        properties: {
          userType: { const: "admin" }
        }
      };
      const thenSchema = {
        properties: {
          adminFeatures: { type: "array" }
        }
      };
      const elseSchema = {
        properties: {
          userFeatures: { type: "array" }
        }
      };

      const schema = createConditionalSchema(ifSchema, thenSchema, elseSchema);

      expect(schema.if).toEqual(ifSchema);
      expect(schema.then).toEqual(thenSchema);
      expect(schema.else).toEqual(elseSchema);
    });

    test("should create conditional schema with base properties", () => {
      const ifSchema = {
        properties: {
          mode: { const: "advanced" }
        }
      };
      const thenSchema = {
        properties: {
          advancedOptions: { type: "object" }
        }
      };
      const baseSchema = {
        type: "object" as const,
        title: "Configuration",
        properties: {
          name: { type: "string" as const }
        }
      };

      const schema = createConditionalSchema(ifSchema, thenSchema, undefined, baseSchema);

      expect(schema.if).toEqual(ifSchema);
      expect(schema.then).toEqual(thenSchema);
      expect(schema.type).toBe("object");
      expect(schema.title).toBe("Configuration");
      expect(schema.properties).toEqual({
        name: { type: "string" }
      });
    });

    test("should throw error for invalid if schema", () => {
      expect(() => createConditionalSchema(null as any)).toThrow("if schema is required and must be an object");
      expect(() => createConditionalSchema("invalid" as any)).toThrow("if schema is required and must be an object");
    });

    test("should throw error when neither then nor else is provided", () => {
      const ifSchema = {
        properties: {
          type: { const: "test" }
        }
      };

      expect(() => createConditionalSchema(ifSchema)).toThrow("At least one of then or else schema must be provided");
    });

    test("should throw error for invalid then schema", () => {
      const ifSchema = {
        properties: {
          type: { const: "test" }
        }
      };

      expect(() => createConditionalSchema(ifSchema, "invalid" as any)).toThrow("then schema must be an object");
    });

    test("should throw error for invalid else schema", () => {
      const ifSchema = {
        properties: {
          type: { const: "test" }
        }
      };
      const thenSchema = {
        properties: {
          value: { type: "string" }
        }
      };

      expect(() => createConditionalSchema(ifSchema, thenSchema, "invalid" as any)).toThrow("else schema must be an object");
    });
  });

  describe("validateConditionalSchemaStructure function", () => {
    test("should validate correct conditional schema", () => {
      const schema: JSONSchema = {
        if: {
          properties: {
            type: { const: "premium" }
          }
        },
        then: {
          properties: {
            features: { type: "array" }
          }
        }
      };

      expect(() => validateConditionalSchemaStructure(schema)).not.toThrow();
    });

    test("should throw error for schema without conditional logic", () => {
      const schema: JSONSchema = {
        type: "object",
        properties: {
          name: { type: "string" }
        }
      };

      expect(() => validateConditionalSchemaStructure(schema)).toThrow("Schema does not contain conditional logic");
    });

    test("should throw error for invalid schema", () => {
      expect(() => validateConditionalSchemaStructure(null as any)).toThrow("Schema must be an object");
      expect(() => validateConditionalSchemaStructure("invalid" as any)).toThrow("Schema must be an object");
    });
  });

  describe("OpenAPI 3.1 schema parsing with conditional schemas", () => {
    test("should parse OpenAPI 3.1 schema with conditional logic", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Conditional Schema Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    UserAccount:
      type: object
      properties:
        id:
          type: string
        userType:
          type: string
          enum: ["basic", "premium", "admin"]
      if:
        properties:
          userType:
            const: "premium"
      then:
        properties:
          premiumFeatures:
            type: array
            items:
              type: string
        required: ["premiumFeatures"]
      else:
        properties:
          basicFeatures:
            type: array
            items:
              type: string
            maxItems: 5
      required: ["id", "userType"]
    
    ConfigObject:
      type: object
      properties:
        mode:
          type: string
          enum: ["simple", "advanced"]
        settings:
          type: object
          properties:
            debug:
              type: boolean
          if:
            properties:
              debug:
                const: true
          then:
            properties:
              logLevel:
                type: string
                enum: ["info", "debug", "trace"]
            required: ["logLevel"]
      if:
        properties:
          mode:
            const: "advanced"
      then:
        properties:
          advancedSettings:
            type: object
            properties:
              maxConnections:
                type: number
                minimum: 1
              timeout:
                type: number
                minimum: 1000
        required: ["advancedSettings"]
      `;

      const schemaPath = path.join(testSchemaDir, "conditional-schemas-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.UserAccount).toBeDefined();
        expect(result.definitions.ConfigObject).toBeDefined();

        // Check that conditional schemas were processed
        const userAccountSchema = result.definitions.UserAccount;
        expect(userAccountSchema.if).toBeDefined();
        expect(userAccountSchema.then).toBeDefined();
        expect(userAccountSchema.else).toBeDefined();

        const configSchema = result.definitions.ConfigObject;
        expect(configSchema.if).toBeDefined();
        expect(configSchema.then).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle complex nested conditional schemas", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex Conditional Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ComplexConditional:
      type: object
      properties:
        category:
          type: string
          enum: ["A", "B", "C"]
        subcategory:
          type: string
      if:
        properties:
          category:
            const: "A"
      then:
        properties:
          typeA:
            type: object
            properties:
              level:
                type: number
            if:
              properties:
                level:
                  type: number
                  minimum: 5
            then:
              properties:
                advancedFeatures:
                  type: array
                  items:
                    type: string
              required: ["advancedFeatures"]
            else:
              properties:
                basicFeatures:
                  type: array
                  items:
                    type: string
                  maxItems: 3
        required: ["typeA"]
      else:
        if:
          properties:
            category:
              const: "B"
        then:
          properties:
            typeB:
              type: object
              properties:
                config:
                  type: string
          required: ["typeB"]
        else:
          properties:
            typeC:
              type: object
              properties:
                settings:
                  type: object
          required: ["typeC"]
      `;

      const schemaPath = path.join(testSchemaDir, "complex-conditional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ComplexConditional).toBeDefined();

        const schema = result.definitions.ComplexConditional;
        expect(schema.if).toBeDefined();
        expect(schema.then).toBeDefined();
        expect(schema.else).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with conditional schemas", () => {
    test("should generate TypeScript types for conditional schemas", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E Conditional Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ConditionalModel:
      type: object
      properties:
        id:
          type: string
        type:
          type: string
          enum: ["basic", "premium"]
      if:
        properties:
          type:
            const: "premium"
      then:
        properties:
          premiumData:
            type: object
            properties:
              features:
                type: array
                items:
                  type: string
              limit:
                type: number
                minimum: 100
        required: ["premiumData"]
      else:
        properties:
          basicData:
            type: object
            properties:
              features:
                type: array
                items:
                  type: string
                maxItems: 5
        required: ["basicData"]
      required: ["id", "type"]
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-conditional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enableConditionalSchemas: true
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
        expect(modelsContent).toContain("ConditionalModel");

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("ConditionalModelDecoder");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should validate conditional schemas correctly", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Conditional Validation Test API
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
          type: string
          enum: ["active", "inactive"]
      if:
        properties:
          status:
            const: "active"
      then:
        properties:
          activeData:
            type: object
            properties:
              lastSeen:
                type: string
                format: date-time
        required: ["activeData"]
      else:
        properties:
          inactiveReason:
            type: string
        required: ["inactiveReason"]
      required: ["id", "status"]
      `;

      const schemaPath = path.join(testSchemaDir, "conditional-validation-test.yaml");
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
            enableConditionalSchemas: true
          }
        });

        // Import and test the generated validators
        const validatorsPath = path.join(testOutputDir, "validators.js");
        expect(require("fs").existsSync(validatorsPath)).toBe(true);

        // Test would require dynamic import in a real test environment
        // This is a structural test to ensure generation works
        const validatorsContent = readFileSync(validatorsPath, "utf8");
        expect(validatorsContent).toContain("ValidationModelValidator");
        
        // Check that conditional validation is included in the generated validator
        expect(validatorsContent).toMatch(/if.*then|then.*if/);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Error handling for conditional schemas", () => {
    test("should handle conditional schemas when disabled", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Disabled Conditional Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    DisabledConditionalTest:
      type: object
      properties:
        field:
          type: string
      if:
        properties:
          field:
            const: "special"
      then:
        properties:
          specialField:
            type: string
      `;

      const schemaPath = path.join(testSchemaDir, "disabled-conditional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConditionalSchemas: false
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.DisabledConditionalTest).toBeDefined();
        
        // With conditional schemas disabled, the if/then/else should be preserved as-is
        // without additional transformation
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle invalid conditional schema structure", () => {
      const invalidSchema = {
        if: "invalid-if-clause"
      };

      expect(() => {
        transformConditionalSchemas(invalidSchema as any);
      }).toThrow("if clause must be a schema object");
    });

    test("should handle conditional schema without then or else", () => {
      const invalidSchema = {
        if: {
          properties: {
            type: { const: "test" }
          }
        }
      };

      expect(() => {
        transformConditionalSchemas(invalidSchema as any);
      }).toThrow("if clause requires at least a then or else clause");
    });

    test("should fallback gracefully when conditional processing fails", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Fallback Conditional Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    FallbackTest:
      type: object
      properties:
        normalField:
          type: string
        conditionalField:
          type: string
      if:
        properties:
          conditionalField:
            const: "trigger"
      then:
        properties:
          resultField:
            type: string
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-conditional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConditionalSchemas: true,
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
    test("should handle conditional schemas with various constraint types", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Constraint Types Conditional Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    ConstraintTypesTest:
      type: object
      properties:
        numericField:
          type: number
        stringField:
          type: string
        arrayField:
          type: array
          items:
            type: string
      if:
        properties:
          numericField:
            type: number
            minimum: 10
      then:
        properties:
          highValueData:
            type: object
            properties:
              category:
                const: "high"
      else:
        if:
          properties:
            stringField:
              type: string
              pattern: "^[A-Z]"
        then:
          properties:
            uppercaseData:
              type: object
              properties:
                category:
                  const: "uppercase"
        else:
          properties:
            defaultData:
              type: object
              properties:
                category:
                  const: "default"
      `;

      const schemaPath = path.join(testSchemaDir, "constraint-types-conditional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConditionalSchemas: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.ConstraintTypesTest).toBeDefined();

        const schema = result.definitions.ConstraintTypesTest;
        expect(schema.if).toBeDefined();
        expect(schema.then).toBeDefined();
        expect(schema.else).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle conditional schemas in combination with other OpenAPI 3.1 features", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Combined Features Conditional Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    CombinedTest:
      type: object
      properties:
        type:
          type: ["string", "null"]
        data:
          type: array
          prefixItems:
            - type: string
            - type: number
          items: false
      if:
        properties:
          type:
            const: "special"
      then:
        properties:
          specialConfig:
            type: object
            properties:
              level:
                const: "advanced"
              features:
                type: array
                contains:
                  const: "premium"
        required: ["specialConfig"]
      else:
        properties:
          basicConfig:
            type: object
            properties:
              level:
                const: "basic"
        required: ["basicConfig"]
      `;

      const schemaPath = path.join(testSchemaDir, "combined-features-conditional-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableConditionalSchemas: true,
          strictNullHandling: true,
          enablePrefixItems: true,
          enableConstKeyword: true,
          enableContainsKeyword: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.CombinedTest).toBeDefined();

        const schema = result.definitions.CombinedTest;
        expect(schema.if).toBeDefined();
        expect(schema.then).toBeDefined();
        expect(schema.else).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });
});