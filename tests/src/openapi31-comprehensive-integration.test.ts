import path from "node:path";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { generate } from "openapi-to-ts-validator";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import Ajv from "ajv";
import addFormats from "ajv-formats";

describe("OpenAPI 3.1 Comprehensive Integration Tests", () => {
  const schemaDir = path.join(__dirname, "../schemas");
  const outputDir = path.join(__dirname, "../output/integration");
  const performanceResults: Array<{
    schema: string;
    parseTime: number;
    generateTime: number;
    totalTime: number;
    schemaSize: number;
    definitionCount: number;
  }> = [];

  beforeAll(() => {
    // Clean up output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    // Log performance results
    console.log("\n=== OpenAPI 3.1 Performance Results ===");
    performanceResults.forEach(result => {
      console.log(`Schema: ${result.schema}`);
      console.log(`  Parse Time: ${result.parseTime.toFixed(2)}ms`);
      console.log(`  Generate Time: ${result.generateTime.toFixed(2)}ms`);
      console.log(`  Total Time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`  Schema Size: ${(result.schemaSize / 1024).toFixed(2)}KB`);
      console.log(`  Definitions: ${result.definitionCount}`);
      console.log("");
    });

    // Clean up output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe("Real-world OpenAPI 3.1 Schema Processing", () => {
    const testSchemas = [
      {
        name: "comprehensive",
        file: "openapi-3.1-comprehensive.yaml",
        description: "Comprehensive test with all OpenAPI 3.1 features"
      },
      {
        name: "ecommerce",
        file: "openapi-3.1-ecommerce.yaml",
        description: "Real-world e-commerce API"
      }
    ];

    testSchemas.forEach(({ name, file, description }) => {
      describe(`${name} schema (${description})`, () => {
        const schemaPath = path.join(schemaDir, file);
        const testOutputDir = path.join(outputDir, name);

        test("should parse OpenAPI 3.1 schema successfully", async () => {
          const startTime = performance.now();
          const schemaContent = fs.readFileSync(schemaPath, "utf8");
          const schemaSize = Buffer.byteLength(schemaContent, "utf8");

          const result = await parseSchema(schemaPath, "yaml", {
            enableWebhooks: true,
            strictNullHandling: true,
            enableConditionalSchemas: true,
            enablePrefixItems: true,
            enableEnhancedDiscriminator: true,
            enableUnevaluatedProperties: true,
            enableContains: true
          });

          const parseTime = performance.now() - startTime;

          // Verify version detection
          expect(result.version.isVersion31).toBe(true);
          expect(result.version.major).toBe(3);
          expect(result.version.minor).toBe(1);

          // Verify schema structure
          expect(result.json).toBeDefined();
          expect(result.definitions).toBeDefined();
          expect(Object.keys(result.definitions).length).toBeGreaterThan(0);

          // Verify webhooks are parsed (if present)
          if (name === "comprehensive" || name === "ecommerce") {
            expect(result.webhooks).toBeDefined();
            expect(Object.keys(result.webhooks!).length).toBeGreaterThan(0);
          }

          // Store performance data
          performanceResults.push({
            schema: `${name} (parse only)`,
            parseTime,
            generateTime: 0,
            totalTime: parseTime,
            schemaSize,
            definitionCount: Object.keys(result.definitions).length
          });

          // Verify OpenAPI 3.1 specific features are present
          const definitions = result.definitions;
          let hasTypeArrays = false;
          let hasPrefixItems = false;
          let hasConditionalSchemas = false;
          let hasConstKeyword = false;
          let hasDiscriminators = false;
          let hasUnevaluatedProperties = false;
          let hasContains = false;

          Object.values(definitions).forEach((schema: any) => {
            if (Array.isArray(schema.type)) hasTypeArrays = true;
            if (schema.prefixItems) hasPrefixItems = true;
            if (schema.if || schema.then || schema.else) hasConditionalSchemas = true;
            if (schema.const !== undefined) hasConstKeyword = true;
            if (schema.discriminator || schema['x-discriminator-enhanced']) hasDiscriminators = true;
            if (schema.unevaluatedProperties !== undefined) hasUnevaluatedProperties = true;
            if (schema.contains) hasContains = true;

            // Check nested properties
            if (schema.properties) {
              Object.values(schema.properties).forEach((prop: any) => {
                if (Array.isArray(prop.type)) hasTypeArrays = true;
                if (prop.const !== undefined) hasConstKeyword = true;
                if (prop.contains) hasContains = true;
              });
            }
          });

          // Verify that OpenAPI 3.1 features were detected and processed
          if (name === "comprehensive") {
            expect(hasTypeArrays).toBe(true);
            expect(hasPrefixItems).toBe(true);
            expect(hasConditionalSchemas).toBe(true);
            expect(hasConstKeyword).toBe(true);
            expect(hasDiscriminators).toBe(true);
            expect(hasUnevaluatedProperties).toBe(true);
            expect(hasContains).toBe(true);
          }

          if (name === "ecommerce") {
            expect(hasTypeArrays).toBe(true);
            expect(hasPrefixItems).toBe(true);
            expect(hasConditionalSchemas).toBe(true);
            expect(hasConstKeyword).toBe(true);
            expect(hasDiscriminators).toBe(true);
          }
        });

        test("should generate complete TypeScript code and validators", async () => {
          const startTime = performance.now();

          await generate({
            schemaFile: schemaPath,
            schemaType: "yaml",
            directory: testOutputDir,
            standalone: {
              validatorOutput: "module"
            },
            openapi31: {
              enableWebhooks: true,
              strictNullHandling: true,
              enableConditionalTypes: true,
              enableTupleTypes: true,
              enableEnhancedDiscriminator: true,
              enableUnevaluatedProperties: true,
              enableContains: true
            }
          });

          const generateTime = performance.now() - startTime;
          const schemaContent = fs.readFileSync(schemaPath, "utf8");
          const schemaSize = Buffer.byteLength(schemaContent, "utf8");

          // Parse schema to get definition count
          const result = await parseSchema(schemaPath, "yaml");
          const definitionCount = Object.keys(result.definitions).length;

          performanceResults.push({
            schema: `${name} (full generation)`,
            parseTime: 0,
            generateTime,
            totalTime: generateTime,
            schemaSize,
            definitionCount
          });

          // Verify generated files exist
          const expectedFiles = [
            "models.ts",
            "decoders.ts",
            "validate.ts",
            "schema.json",
            "standalone.mjs"
          ];

          expectedFiles.forEach(fileName => {
            const filePath = path.join(testOutputDir, fileName);
            expect(fs.existsSync(filePath)).toBe(true);
          });

          // Verify TypeScript models
          const modelsContent = fs.readFileSync(path.join(testOutputDir, "models.ts"), "utf8");
          expect(modelsContent).toBeDefined();
          expect(modelsContent.length).toBeGreaterThan(0);

          // Check for OpenAPI 3.1 specific TypeScript constructs
          if (name === "comprehensive") {
            // Union types with null
            expect(modelsContent).toMatch(/\|\s*null/);
            // Tuple types (from prefixItems)
            expect(modelsContent).toMatch(/\[.*,.*\]/);
            // Literal types (from const)
            expect(modelsContent).toMatch(/"[^"]+"/);
          }

          // Verify decoders
          const decodersContent = fs.readFileSync(path.join(testOutputDir, "decoders.ts"), "utf8");
          expect(decodersContent).toBeDefined();
          expect(decodersContent.length).toBeGreaterThan(0);

          // Verify validators
          const validateContent = fs.readFileSync(path.join(testOutputDir, "validate.ts"), "utf8");
          expect(validateContent).toBeDefined();
          expect(validateContent.length).toBeGreaterThan(0);

          // Verify JSON schema
          const schemaJsonContent = fs.readFileSync(path.join(testOutputDir, "schema.json"), "utf8");
          const schemaJson = JSON.parse(schemaJsonContent);
          expect(schemaJson).toBeDefined();
          expect(schemaJson.definitions).toBeDefined();

          // Verify standalone validator
          const standaloneContent = fs.readFileSync(path.join(testOutputDir, "standalone.mjs"), "utf8");
          expect(standaloneContent).toBeDefined();
          expect(standaloneContent.length).toBeGreaterThan(0);
        });

        test("should generate valid JSON Schema compatible with AJV", async () => {
          const schemaJsonPath = path.join(testOutputDir, "schema.json");
          const schemaContent = fs.readFileSync(schemaJsonPath, "utf8");
          const schema = JSON.parse(schemaContent);

          // Create AJV instance with OpenAPI 3.1 / JSON Schema Draft 2020-12 support
          const ajv = new Ajv({
            strict: false,
            validateFormats: true,
            allErrors: true
          });
          addFormats(ajv);

          // Validate the schema itself
          const isValidSchema = await ajv.validateSchema(schema);
          expect(isValidSchema).toBe(true);

          if (!isValidSchema && ajv.errors) {
            console.error("Schema validation errors:", ajv.errors);
          }

          // Test that we can compile validators for each definition
          Object.keys(schema.definitions).forEach(definitionName => {
            const definition = schema.definitions[definitionName];
            
            try {
              const validator = ajv.compile(definition);
              expect(validator).toBeDefined();
              expect(typeof validator).toBe("function");
            } catch (error) {
              fail(`Failed to compile validator for ${definitionName}: ${error}`);
            }
          });
        });

        test("should validate sample data correctly", async () => {
          const schemaJsonPath = path.join(testOutputDir, "schema.json");
          const schema = JSON.parse(fs.readFileSync(schemaJsonPath, "utf8"));

          const ajv = new Ajv({
            strict: false,
            validateFormats: true,
            allErrors: true
          });
          addFormats(ajv);

          // Test specific schemas with sample data
          if (name === "comprehensive") {
            // Test User schema with type arrays
            const userValidator = ajv.compile(schema.definitions.User);
            
            const validUser = {
              id: "user123",
              name: "John Doe",
              email: "john@example.com",
              age: 30,
              isActive: true,
              metadata: {
                lastLogin: "2024-01-15T10:30:00Z",
                preferences: { theme: "dark" }
              },
              tags: ["premium", "verified"]
            };

            const validUserWithNulls = {
              id: "user456",
              name: "Jane Smith",
              email: null,
              age: null,
              isActive: null,
              metadata: null,
              tags: null
            };

            expect(userValidator(validUser)).toBe(true);
            expect(userValidator(validUserWithNulls)).toBe(true);

            // Test invalid user
            const invalidUser = {
              id: "user789",
              // missing required name
              email: "invalid-email", // invalid format
              age: -5, // invalid range
              isActive: "not-boolean" // wrong type
            };

            expect(userValidator(invalidUser)).toBe(false);

            // Test Coordinates (prefixItems/tuple)
            const coordinatesValidator = ajv.compile(schema.definitions.Coordinates);
            
            expect(coordinatesValidator([40.7128, -74.0060])).toBe(true); // lat, lng
            expect(coordinatesValidator([40.7128, -74.0060, 100])).toBe(true); // lat, lng, alt
            expect(coordinatesValidator([40.7128, -74.0060, null])).toBe(true); // lat, lng, null alt
            expect(coordinatesValidator([40.7128])).toBe(false); // missing lng
            expect(coordinatesValidator([40.7128, -74.0060, 100, "extra"])).toBe(false); // extra items not allowed

            // Test ApiResponse (const keyword)
            const apiResponseValidator = ajv.compile(schema.definitions.ApiResponse);
            
            const validResponse = {
              version: "2.0",
              status: "success",
              timestamp: "2024-01-15T10:30:00Z",
              data: { result: "ok" }
            };

            const invalidResponse = {
              version: "1.0", // wrong const value
              status: "success",
              timestamp: "2024-01-15T10:30:00Z"
            };

            expect(apiResponseValidator(validResponse)).toBe(true);
            expect(apiResponseValidator(invalidResponse)).toBe(false);
          }

          if (name === "ecommerce") {
            // Test Product schema
            const productValidator = ajv.compile(schema.definitions.Product);
            
            const validProduct = {
              id: "prod123",
              name: "Test Product",
              description: "A test product",
              price: 29.99,
              originalPrice: 39.99,
              currency: "USD",
              category: {
                type: "physical",
                id: "cat1",
                name: "Electronics",
                shippingRequired: true,
                weightCategory: "light"
              },
              tags: ["electronics", "popular"],
              images: [{
                url: "https://example.com/image.jpg",
                alt: "Product image",
                dimensions: [800, 600]
              }],
              inventory: {
                inStock: true,
                quantity: 50,
                lowStockThreshold: 10
              },
              createdAt: "2024-01-15T10:30:00Z"
            };

            expect(productValidator(validProduct)).toBe(true);

            // Test with out of stock
            const outOfStockProduct = {
              ...validProduct,
              inventory: {
                inStock: false,
                quantity: 0,
                lowStockThreshold: 10
              }
            };

            expect(productValidator(outOfStockProduct)).toBe(true);

            // Test invalid product (missing required fields)
            const invalidProduct = {
              id: "prod456",
              // missing name, price, currency, category, images, inventory, createdAt
            };

            expect(productValidator(invalidProduct)).toBe(false);
          }
        });

        test("should handle webhook schemas correctly", async () => {
          if (name !== "comprehensive" && name !== "ecommerce") {
            return; // Skip if no webhooks
          }

          const result = await parseSchema(schemaPath, "yaml", {
            enableWebhooks: true
          });

          expect(result.webhooks).toBeDefined();
          expect(Object.keys(result.webhooks!).length).toBeGreaterThan(0);

          // Verify webhook schemas are valid
          const schemaJsonPath = path.join(testOutputDir, "schema.json");
          const schema = JSON.parse(fs.readFileSync(schemaJsonPath, "utf8"));

          const ajv = new Ajv({ strict: false });
          addFormats(ajv);

          if (name === "comprehensive") {
            // Test UserCreatedEvent
            if (schema.definitions.UserCreatedEvent) {
              const validator = ajv.compile(schema.definitions.UserCreatedEvent);
              
              const validEvent = {
                eventType: "user.created",
                timestamp: "2024-01-15T10:30:00Z",
                data: {
                  id: "user123",
                  name: "John Doe",
                  email: "john@example.com",
                  age: 30,
                  isActive: true,
                  metadata: null,
                  tags: null
                },
                metadata: {
                  source: "api",
                  version: "1.0"
                }
              };

              expect(validator(validEvent)).toBe(true);
            }
          }

          if (name === "ecommerce") {
            // Test InventoryAlert
            if (schema.definitions.InventoryAlert) {
              const validator = ajv.compile(schema.definitions.InventoryAlert);
              
              const validAlert = {
                eventType: "inventory.low",
                timestamp: "2024-01-15T10:30:00Z",
                data: {
                  productId: "prod123",
                  variantId: null,
                  currentQuantity: 5,
                  threshold: 10,
                  location: "warehouse-1"
                },
                severity: "medium",
                metadata: {
                  source: "inventory-service",
                  version: "1.0"
                }
              };

              expect(validator(validAlert)).toBe(true);

              // Test critical alert (quantity = 0)
              const criticalAlert = {
                ...validAlert,
                data: {
                  ...validAlert.data,
                  currentQuantity: 0
                },
                severity: "critical"
              };

              expect(validator(criticalAlert)).toBe(true);
            }
          }
        });
      });
    });
  });

  describe("Performance Impact Analysis", () => {
    test("should process large OpenAPI 3.1 schemas efficiently", async () => {
      const largeSchemaPath = path.join(schemaDir, "openapi-3.1-ecommerce.yaml");
      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await generate({
          schemaFile: largeSchemaPath,
          schemaType: "yaml",
          directory: path.join(outputDir, `performance-test-${i}`),
          openapi31: {
            enableWebhooks: true,
            strictNullHandling: true,
            enableConditionalTypes: true,
            enableTupleTypes: true,
            enableEnhancedDiscriminator: true
          }
        });

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Performance test results (${iterations} iterations):`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      // Performance expectations (adjust based on actual performance)
      expect(avgTime).toBeLessThan(10000); // Should complete within 10 seconds on average
      expect(maxTime).toBeLessThan(15000); // Should never take more than 15 seconds
    });

    test("should have reasonable memory usage", async () => {
      const initialMemory = process.memoryUsage();
      
      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.1-comprehensive.yaml"),
        schemaType: "yaml",
        directory: path.join(outputDir, "memory-test"),
        openapi31: {
          enableWebhooks: true,
          strictNullHandling: true,
          enableConditionalTypes: true,
          enableTupleTypes: true
        }
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be reasonable (adjust based on actual usage)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });

  describe("Cross-version Compatibility", () => {
    test("should handle mixed OpenAPI 3.0 and 3.1 processing", async () => {
      // Process OpenAPI 3.0 schema
      const schema30Path = path.join(schemaDir, "openapi-3.0-test.yaml");
      const result30 = await parseSchema(schema30Path, "yaml");

      // Process OpenAPI 3.1 schema
      const schema31Path = path.join(schemaDir, "openapi-3.1-test.yaml");
      const result31 = await parseSchema(schema31Path, "yaml", {
        strictNullHandling: true,
        enableConditionalSchemas: true
      });

      // Verify version detection
      expect(result30.version.isVersion30).toBe(true);
      expect(result30.version.isVersion31).toBe(false);
      expect(result31.version.isVersion30).toBe(false);
      expect(result31.version.isVersion31).toBe(true);

      // Verify different processing approaches
      const user30 = result30.definitions.User;
      const user31 = result31.definitions.User;

      // OpenAPI 3.0 should use nullable property
      expect(user30.properties.email.nullable).toBe(true);
      expect(Array.isArray(user30.properties.email.type)).toBe(false);

      // OpenAPI 3.1 should use type arrays
      expect(Array.isArray(user31.properties.email.type)).toBe(true);
      expect(user31.properties.email.type).toContain("string");
      expect(user31.properties.email.type).toContain("null");
    });

    test("should generate consistent output for same schema processed multiple times", async () => {
      const schemaPath = path.join(schemaDir, "openapi-3.1-test.yaml");
      const dir1 = path.join(outputDir, "consistency-1");
      const dir2 = path.join(outputDir, "consistency-2");

      // Generate twice with same options
      const options = {
        schemaFile: schemaPath,
        schemaType: "yaml" as const,
        openapi31: {
          strictNullHandling: true,
          enableConditionalTypes: true
        }
      };

      await generate({ ...options, directory: dir1 });
      await generate({ ...options, directory: dir2 });

      // Compare generated files
      const files = ["models.ts", "schema.json"];
      
      files.forEach(fileName => {
        const content1 = fs.readFileSync(path.join(dir1, fileName), "utf8");
        const content2 = fs.readFileSync(path.join(dir2, fileName), "utf8");
        expect(content1).toBe(content2);
      });
    });

    test("should maintain backward compatibility with existing OpenAPI 3.0 workflows", async () => {
      const schema30Path = path.join(schemaDir, "openapi-3.0-test.yaml");
      const outputDir30 = path.join(outputDir, "backward-compatibility");

      // Generate with default options (should work as before)
      await generate({
        schemaFile: schema30Path,
        schemaType: "yaml",
        directory: outputDir30
      });

      // Verify files are generated
      const expectedFiles = ["models.ts", "decoders.ts", "validate.ts", "schema.json"];
      expectedFiles.forEach(fileName => {
        expect(fs.existsSync(path.join(outputDir30, fileName))).toBe(true);
      });

      // Verify content doesn't contain OpenAPI 3.1 specific features
      const modelsContent = fs.readFileSync(path.join(outputDir30, "models.ts"), "utf8");
      const schemaContent = fs.readFileSync(path.join(outputDir30, "schema.json"), "utf8");

      // Should not contain type arrays or other 3.1 features
      expect(modelsContent).not.toMatch(/type:\s*\[.*"null".*\]/);
      expect(schemaContent).not.toContain("prefixItems");
      expect(schemaContent).not.toContain("unevaluatedProperties");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle invalid OpenAPI 3.1 schemas gracefully", async () => {
      const invalidSchema = `
openapi: 3.1.0
info:
  title: Invalid Schema
  version: 1.0.0
paths: {}
components:
  schemas:
    InvalidSchema:
      type: object
      properties:
        invalidType:
          type: ["string", "invalid-type"]  # Invalid type
        invalidConst:
          const: # Missing value
      `;

      const tempPath = path.join(schemaDir, "temp-invalid.yaml");
      fs.writeFileSync(tempPath, invalidSchema);

      try {
        // Should not throw, but should handle gracefully
        const result = await parseSchema(tempPath, "yaml", {
          strictNullHandling: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.InvalidSchema).toBeDefined();
      } catch (error) {
        // If it throws, the error should be descriptive
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("OpenAPI 3.1");
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test("should handle complex nested discriminators", async () => {
      const complexSchema = `
openapi: 3.1.0
info:
  title: Complex Discriminator Test
  version: 1.0.0
paths: {}
components:
  schemas:
    Container:
      type: object
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/Item'
        primaryItem:
          $ref: '#/components/schemas/Item'

    Item:
      type: object
      discriminator:
        propertyName: itemType
      oneOf:
        - $ref: '#/components/schemas/Document'
        - $ref: '#/components/schemas/Media'

    Document:
      type: object
      properties:
        itemType:
          const: "Document"
        title:
          type: string
        content:
          $ref: '#/components/schemas/Content'

    Media:
      type: object
      properties:
        itemType:
          const: "Media"
        url:
          type: string
        metadata:
          $ref: '#/components/schemas/Content'

    Content:
      type: object
      discriminator:
        propertyName: contentType
      anyOf:
        - $ref: '#/components/schemas/TextContent'
        - $ref: '#/components/schemas/RichContent'

    TextContent:
      type: object
      properties:
        contentType:
          const: "TextContent"
        text:
          type: string

    RichContent:
      type: object
      properties:
        contentType:
          const: "RichContent"
        html:
          type: string
        styles:
          type: ["object", "null"]
      `;

      const tempPath = path.join(schemaDir, "temp-complex-discriminator.yaml");
      fs.writeFileSync(tempPath, complexSchema);

      try {
        const result = await parseSchema(tempPath, "yaml", {
          enableEnhancedDiscriminator: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.Container).toBeDefined();
        expect(result.definitions.Item).toBeDefined();
        expect(result.definitions.Content).toBeDefined();

        // Verify discriminator processing
        const itemSchema = result.definitions.Item;
        const contentSchema = result.definitions.Content;

        expect((itemSchema as any)['x-discriminator-enhanced']).toBeDefined();
        expect((contentSchema as any)['x-discriminator-enhanced']).toBeDefined();
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    test("should handle large schemas with many definitions", async () => {
      // Create a schema with many definitions to test scalability
      const manyDefinitions = Array.from({ length: 50 }, (_, i) => `
    Model${i}:
      type: object
      properties:
        id:
          type: string
        name:
          type: ["string", "null"]
        value${i}:
          type: number
        related:
          $ref: '#/components/schemas/Model${(i + 1) % 50}'
      required: ['id']`).join('\n');

      const largeSchema = `
openapi: 3.1.0
info:
  title: Large Schema Test
  version: 1.0.0
paths: {}
components:
  schemas:${manyDefinitions}`;

      const tempPath = path.join(schemaDir, "temp-large.yaml");
      fs.writeFileSync(tempPath, largeSchema);

      try {
        const startTime = performance.now();
        
        const result = await parseSchema(tempPath, "yaml", {
          strictNullHandling: true
        });

        const parseTime = performance.now() - startTime;

        expect(result.version.isVersion31).toBe(true);
        expect(Object.keys(result.definitions).length).toBe(50);

        console.log(`Large schema parse time: ${parseTime.toFixed(2)}ms`);
        
        // Should complete in reasonable time
        expect(parseTime).toBeLessThan(5000); // 5 seconds
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe("Feature Flag Testing", () => {
    test("should respect feature flags for OpenAPI 3.1 features", async () => {
      const schemaPath = path.join(schemaDir, "openapi-3.1-comprehensive.yaml");

      // Test with all features disabled
      const resultDisabled = await parseSchema(schemaPath, "yaml", {
        enableWebhooks: false,
        strictNullHandling: false,
        enableConditionalSchemas: false,
        enablePrefixItems: false,
        enableEnhancedDiscriminator: false,
        enableUnevaluatedProperties: false,
        enableContains: false
      });

      // Test with all features enabled
      const resultEnabled = await parseSchema(schemaPath, "yaml", {
        enableWebhooks: true,
        strictNullHandling: true,
        enableConditionalSchemas: true,
        enablePrefixItems: true,
        enableEnhancedDiscriminator: true,
        enableUnevaluatedProperties: true,
        enableContains: true
      });

      // Both should parse successfully
      expect(resultDisabled.version.isVersion31).toBe(true);
      expect(resultEnabled.version.isVersion31).toBe(true);

      // Enabled version should have webhooks
      expect(resultDisabled.webhooks).toBeUndefined();
      expect(resultEnabled.webhooks).toBeDefined();

      // Feature-specific differences should be present
      const userSchemaDisabled = resultDisabled.definitions.User;
      const userSchemaEnabled = resultEnabled.definitions.User;

      // With strict null handling disabled, might use nullable instead of type arrays
      // With it enabled, should use type arrays
      expect(userSchemaDisabled).toBeDefined();
      expect(userSchemaEnabled).toBeDefined();
    });
  });
});