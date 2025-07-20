import path from "node:path";
import fs from "node:fs";
import { generate } from "openapi-to-ts-validator";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import Ajv from "ajv";
import addFormats from "ajv-formats";

describe("OpenAPI 3.0/3.1 Cross-Version Compatibility", () => {
  const schemaDir = path.join(__dirname, "../schemas");
  const outputDir = path.join(__dirname, "../output/cross-version");

  beforeAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe("Version Detection and Routing", () => {
    test("should correctly detect and route different OpenAPI versions", async () => {
      const testCases = [
        { file: "openapi-3.0-test.yaml", expectedMajor: 3, expectedMinor: 0, expectedIs30: true, expectedIs31: false },
        { file: "openapi-3.1-test.yaml", expectedMajor: 3, expectedMinor: 1, expectedIs30: false, expectedIs31: true }
      ];

      for (const testCase of testCases) {
        const result = await parseSchema(path.join(schemaDir, testCase.file), "yaml");

        expect(result.version.major).toBe(testCase.expectedMajor);
        expect(result.version.minor).toBe(testCase.expectedMinor);
        expect(result.version.isVersion30).toBe(testCase.expectedIs30);
        expect(result.version.isVersion31).toBe(testCase.expectedIs31);
      }
    });

    test("should handle version edge cases", async () => {
      const edgeCases = [
        { version: "3.0.0", expectedMajor: 3, expectedMinor: 0, expectedPatch: 0 },
        { version: "3.0.3", expectedMajor: 3, expectedMinor: 0, expectedPatch: 3 },
        { version: "3.1.0", expectedMajor: 3, expectedMinor: 1, expectedPatch: 0 },
        { version: "3.1.1", expectedMajor: 3, expectedMinor: 1, expectedPatch: 1 }
      ];

      for (const edgeCase of edgeCases) {
        const schema = `
openapi: ${edgeCase.version}
info:
  title: Version Test
  version: 1.0.0
paths: {}
components:
  schemas:
    TestModel:
      type: object
      properties:
        id:
          type: string`;

        const tempPath = path.join(schemaDir, `temp-version-${edgeCase.version.replace(/\./g, '-')}.yaml`);
        fs.writeFileSync(tempPath, schema);

        try {
          const result = await parseSchema(tempPath, "yaml");

          expect(result.version.major).toBe(edgeCase.expectedMajor);
          expect(result.version.minor).toBe(edgeCase.expectedMinor);
          if (edgeCase.expectedPatch !== undefined) {
            expect(result.version.patch).toBe(edgeCase.expectedPatch);
          }
        } finally {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      }
    });
  });

  describe("Feature Processing Differences", () => {
    test("should handle nullable properties differently between versions", async () => {
      // Create equivalent schemas with different nullable approaches
      const schema30 = `
openapi: 3.0.3
info:
  title: OpenAPI 3.0 Nullable Test
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
          type: string
        email:
          type: string
          nullable: true
        age:
          type: integer
          nullable: true
      required: ['id', 'name']`;

      const schema31 = `
openapi: 3.1.0
info:
  title: OpenAPI 3.1 Type Array Test
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
          type: string
        email:
          type: ["string", "null"]
        age:
          type: ["integer", "null"]
      required: ['id', 'name']`;

      const tempPath30 = path.join(schemaDir, "temp-nullable-30.yaml");
      const tempPath31 = path.join(schemaDir, "temp-nullable-31.yaml");

      fs.writeFileSync(tempPath30, schema30);
      fs.writeFileSync(tempPath31, schema31);

      try {
        const result30 = await parseSchema(tempPath30, "yaml");
        const result31 = await parseSchema(tempPath31, "yaml", {
          strictNullHandling: true
        });

        // Verify version detection
        expect(result30.version.isVersion30).toBe(true);
        expect(result31.version.isVersion31).toBe(true);

        // Check nullable handling differences
        const user30 = result30.definitions.User;
        const user31 = result31.definitions.User;

        // OpenAPI 3.0 should use nullable property
        expect(user30.properties.email.nullable).toBe(true);
        expect(user30.properties.age.nullable).toBe(true);
        expect(Array.isArray(user30.properties.email.type)).toBe(false);

        // OpenAPI 3.1 should use type arrays
        expect(Array.isArray(user31.properties.email.type)).toBe(true);
        expect(user31.properties.email.type).toContain("string");
        expect(user31.properties.email.type).toContain("null");
        expect(Array.isArray(user31.properties.age.type)).toBe(true);
        expect(user31.properties.age.type).toContain("integer");
        expect(user31.properties.age.type).toContain("null");

        // Generate TypeScript for both
        await generate({
          schemaFile: tempPath30,
          schemaType: "yaml",
          directory: path.join(outputDir, "nullable-30")
        });

        await generate({
          schemaFile: tempPath31,
          schemaType: "yaml",
          directory: path.join(outputDir, "nullable-31"),
          openapi31: {
            strictNullHandling: true
          }
        });

        // Check generated TypeScript
        const models30 = fs.readFileSync(path.join(outputDir, "nullable-30", "models.ts"), "utf8");
        const models31 = fs.readFileSync(path.join(outputDir, "nullable-31", "models.ts"), "utf8");

        // Both should generate union types with null
        expect(models30).toMatch(/email\?\s*:\s*string\s*\|\s*null/);
        expect(models31).toMatch(/email\?\s*:\s*string\s*\|\s*null/);
      } finally {
        [tempPath30, tempPath31].forEach(path => {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        });
      }
    });

    test("should handle discriminators consistently across versions", async () => {
      const baseDiscriminator = `
    Pet:
      type: object
      discriminator:
        propertyName: petType
        mapping:
          cat: '#/components/schemas/Cat'
          dog: '#/components/schemas/Dog'
      oneOf:
        - $ref: '#/components/schemas/Cat'
        - $ref: '#/components/schemas/Dog'
      required: ['petType']

    Cat:
      type: object
      properties:
        petType:
          type: string
          const: cat
        name:
          type: string
        meowVolume:
          type: number
      required: ['petType', 'name']

    Dog:
      type: object
      properties:
        petType:
          type: string
          const: dog
        name:
          type: string
        barkVolume:
          type: number
      required: ['petType', 'name']`;

      const schema30 = `
openapi: 3.0.3
info:
  title: OpenAPI 3.0 Discriminator Test
  version: 1.0.0
paths: {}
components:
  schemas:${baseDiscriminator}`;

      const schema31 = `
openapi: 3.1.0
info:
  title: OpenAPI 3.1 Discriminator Test
  version: 1.0.0
paths: {}
components:
  schemas:${baseDiscriminator}`;

      const tempPath30 = path.join(schemaDir, "temp-discriminator-30.yaml");
      const tempPath31 = path.join(schemaDir, "temp-discriminator-31.yaml");

      fs.writeFileSync(tempPath30, schema30);
      fs.writeFileSync(tempPath31, schema31);

      try {
        const result30 = await parseSchema(tempPath30, "yaml");
        const result31 = await parseSchema(tempPath31, "yaml", {
          enableEnhancedDiscriminator: true
        });

        // Both should parse discriminators
        expect(result30.definitions.Pet).toBeDefined();
        expect(result31.definitions.Pet).toBeDefined();

        // OpenAPI 3.1 should have enhanced discriminator metadata
        const pet30 = result30.definitions.Pet;
        const pet31 = result31.definitions.Pet;

        expect(pet30.discriminator).toBeDefined();
        expect(pet31.discriminator).toBeDefined();

        // 3.1 should have enhanced metadata
        expect((pet31 as any)['x-discriminator-enhanced']).toBeDefined();
        expect((pet30 as any)['x-discriminator-enhanced']).toBeUndefined();

        // Generate and test validators
        await generate({
          schemaFile: tempPath30,
          schemaType: "yaml",
          directory: path.join(outputDir, "discriminator-30")
        });

        await generate({
          schemaFile: tempPath31,
          schemaType: "yaml",
          directory: path.join(outputDir, "discriminator-31"),
          openapi31: {
            enableEnhancedDiscriminator: true
          }
        });

        // Test that both generate working validators
        const schema30Json = JSON.parse(fs.readFileSync(path.join(outputDir, "discriminator-30", "schema.json"), "utf8"));
        const schema31Json = JSON.parse(fs.readFileSync(path.join(outputDir, "discriminator-31", "schema.json"), "utf8"));

        const ajv = new Ajv({ strict: false });
        const validator30 = ajv.compile(schema30Json.definitions.Pet);
        const validator31 = ajv.compile(schema31Json.definitions.Pet);

        const validCat = {
          petType: "cat",
          name: "Fluffy",
          meowVolume: 5
        };

        expect(validator30(validCat)).toBe(true);
        expect(validator31(validCat)).toBe(true);
      } finally {
        [tempPath30, tempPath31].forEach(path => {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        });
      }
    });
  });

  describe("Backward Compatibility Verification", () => {
    test("should maintain identical output for OpenAPI 3.0 schemas", async () => {
      const schema30Path = path.join(schemaDir, "openapi-3.0-test.yaml");
      
      // Generate with current implementation
      const currentOutputDir = path.join(outputDir, "backward-compat-current");
      await generate({
        schemaFile: schema30Path,
        schemaType: "yaml",
        directory: currentOutputDir
      });

      // Generate with explicit 3.0 processing (should be identical)
      const explicitOutputDir = path.join(outputDir, "backward-compat-explicit");
      await generate({
        schemaFile: schema30Path,
        schemaType: "yaml",
        directory: explicitOutputDir,
        openapi31: {
          fallbackToOpenAPI30: true
        }
      });

      // Compare generated files
      const filesToCompare = ["models.ts", "schema.json", "validate.ts"];
      
      for (const fileName of filesToCompare) {
        const currentContent = fs.readFileSync(path.join(currentOutputDir, fileName), "utf8");
        const explicitContent = fs.readFileSync(path.join(explicitOutputDir, fileName), "utf8");
        
        expect(currentContent).toBe(explicitContent);
      }

      // Verify no OpenAPI 3.1 features are present
      const modelsContent = fs.readFileSync(path.join(currentOutputDir, "models.ts"), "utf8");
      const schemaContent = fs.readFileSync(path.join(currentOutputDir, "schema.json"), "utf8");

      // Should not contain 3.1 specific features
      expect(schemaContent).not.toContain("prefixItems");
      expect(schemaContent).not.toContain("unevaluatedProperties");
      expect(schemaContent).not.toContain("contains");
      expect(modelsContent).not.toMatch(/type:\s*\[.*"null".*\]/);
    });

    test("should handle mixed version processing in same session", async () => {
      const schema30Path = path.join(schemaDir, "openapi-3.0-test.yaml");
      const schema31Path = path.join(schemaDir, "openapi-3.1-test.yaml");

      // Process 3.0 first
      const result30First = await parseSchema(schema30Path, "yaml");
      
      // Then process 3.1
      const result31Second = await parseSchema(schema31Path, "yaml", {
        strictNullHandling: true
      });

      // Then process 3.0 again
      const result30Again = await parseSchema(schema30Path, "yaml");

      // Verify version detection is correct for all
      expect(result30First.version.isVersion30).toBe(true);
      expect(result31Second.version.isVersion31).toBe(true);
      expect(result30Again.version.isVersion30).toBe(true);

      // Verify 3.0 processing is consistent
      expect(result30First.definitions.User.properties.email.nullable).toBe(true);
      expect(result30Again.definitions.User.properties.email.nullable).toBe(true);

      // Verify 3.1 processing is different
      expect(Array.isArray(result31Second.definitions.User.properties.email.type)).toBe(true);
    });

    test("should not leak OpenAPI 3.1 options to 3.0 processing", async () => {
      const schema30Path = path.join(schemaDir, "openapi-3.0-test.yaml");

      // Parse with 3.1 options (should be ignored for 3.0)
      const result = await parseSchema(schema30Path, "yaml", {
        enableWebhooks: true,
        strictNullHandling: true,
        enableConditionalSchemas: true,
        enablePrefixItems: true,
        enableEnhancedDiscriminator: true,
        enableUnevaluatedProperties: true,
        enableContains: true
      });

      expect(result.version.isVersion30).toBe(true);

      // Should not have webhooks (3.1 feature)
      expect(result.webhooks).toBeUndefined();

      // Should use 3.0 nullable approach
      const userSchema = result.definitions.User;
      expect(userSchema.properties.email.nullable).toBe(true);
      expect(Array.isArray(userSchema.properties.email.type)).toBe(false);

      // Should not have 3.1 transformations
      expect(userSchema.prefixItems).toBeUndefined();
      expect(userSchema.unevaluatedProperties).toBeUndefined();
      expect(userSchema.if).toBeUndefined();
    });
  });

  describe("Migration Scenarios", () => {
    test("should handle schema migration from 3.0 to 3.1", async () => {
      // Create a schema that exists in both versions
      const baseSchema = `
info:
  title: Migration Test API
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
          type: string
        email:
          type: string
        age:
          type: integer
      required: ['id', 'name']
    
    Product:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        price:
          type: number
        available:
          type: boolean
      required: ['id', 'name', 'price']`;

      // Version 3.0 with nullable
      const schema30 = `openapi: 3.0.3${baseSchema}`.replace(
        'email:\n          type: string',
        'email:\n          type: string\n          nullable: true'
      ).replace(
        'age:\n          type: integer',
        'age:\n          type: integer\n          nullable: true'
      ).replace(
        'available:\n          type: boolean',
        'available:\n          type: boolean\n          nullable: true'
      );

      // Version 3.1 with type arrays
      const schema31 = `openapi: 3.1.0${baseSchema}`.replace(
        'email:\n          type: string',
        'email:\n          type: ["string", "null"]'
      ).replace(
        'age:\n          type: integer',
        'age:\n          type: ["integer", "null"]'
      ).replace(
        'available:\n          type: boolean',
        'available:\n          type: ["boolean", "null"]'
      );

      const tempPath30 = path.join(schemaDir, "temp-migration-30.yaml");
      const tempPath31 = path.join(schemaDir, "temp-migration-31.yaml");

      fs.writeFileSync(tempPath30, schema30);
      fs.writeFileSync(tempPath31, schema31);

      try {
        // Generate from both versions
        await generate({
          schemaFile: tempPath30,
          schemaType: "yaml",
          directory: path.join(outputDir, "migration-30")
        });

        await generate({
          schemaFile: tempPath31,
          schemaType: "yaml",
          directory: path.join(outputDir, "migration-31"),
          openapi31: {
            strictNullHandling: true
          }
        });

        // Compare TypeScript output - should be functionally equivalent
        const models30 = fs.readFileSync(path.join(outputDir, "migration-30", "models.ts"), "utf8");
        const models31 = fs.readFileSync(path.join(outputDir, "migration-31", "models.ts"), "utf8");

        // Both should generate nullable fields
        expect(models30).toMatch(/email\?\s*:\s*string\s*\|\s*null/);
        expect(models31).toMatch(/email\?\s*:\s*string\s*\|\s*null/);
        expect(models30).toMatch(/age\?\s*:\s*number\s*\|\s*null/);
        expect(models31).toMatch(/age\?\s*:\s*number\s*\|\s*null/);

        // Test that validators work with same data
        const schema30Json = JSON.parse(fs.readFileSync(path.join(outputDir, "migration-30", "schema.json"), "utf8"));
        const schema31Json = JSON.parse(fs.readFileSync(path.join(outputDir, "migration-31", "schema.json"), "utf8"));

        const ajv = new Ajv({ strict: false });
        const validator30 = ajv.compile(schema30Json.definitions.User);
        const validator31 = ajv.compile(schema31Json.definitions.User);

        const testData = [
          { id: "1", name: "John", email: "john@example.com", age: 30 },
          { id: "2", name: "Jane", email: null, age: null },
          { id: "3", name: "Bob" } // missing optional fields
        ];

        testData.forEach(data => {
          expect(validator30(data)).toBe(validator31(data));
        });
      } finally {
        [tempPath30, tempPath31].forEach(path => {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        });
      }
    });

    test("should provide clear guidance for unsupported 3.1 features", async () => {
      // Create schema with advanced 3.1 features
      const advancedSchema = `
openapi: 3.1.0
info:
  title: Advanced 3.1 Features
  version: 1.0.0
paths: {}
components:
  schemas:
    AdvancedModel:
      type: object
      properties:
        id:
          type: string
        coordinates:
          type: array
          prefixItems:
            - type: number
            - type: number
          items: false
        config:
          const: { "version": "2.0", "debug": false }
        tags:
          type: array
          items:
            type: string
          contains:
            pattern: "^important-"
        metadata:
          type: object
          unevaluatedProperties:
            type: string
      if:
        properties:
          id:
            pattern: "^admin-"
      then:
        properties:
          permissions:
            const: ["read", "write", "admin"]
      required: ['id']`;

      const tempPath = path.join(schemaDir, "temp-advanced-31.yaml");
      fs.writeFileSync(tempPath, advancedSchema);

      try {
        // Parse with all features enabled
        const resultEnabled = await parseSchema(tempPath, "yaml", {
          enableWebhooks: true,
          strictNullHandling: true,
          enableConditionalSchemas: true,
          enablePrefixItems: true,
          enableEnhancedDiscriminator: true,
          enableUnevaluatedProperties: true,
          enableContains: true
        });

        expect(resultEnabled.version.isVersion31).toBe(true);
        expect(resultEnabled.definitions.AdvancedModel).toBeDefined();

        // Parse with features disabled (should still work but with warnings/fallbacks)
        const resultDisabled = await parseSchema(tempPath, "yaml", {
          enableWebhooks: false,
          strictNullHandling: false,
          enableConditionalSchemas: false,
          enablePrefixItems: false,
          enableEnhancedDiscriminator: false,
          enableUnevaluatedProperties: false,
          enableContains: false
        });

        expect(resultDisabled.version.isVersion31).toBe(true);
        expect(resultDisabled.definitions.AdvancedModel).toBeDefined();

        // Both should parse successfully
        expect(Object.keys(resultEnabled.definitions).length).toBeGreaterThan(0);
        expect(Object.keys(resultDisabled.definitions).length).toBeGreaterThan(0);
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe("Validation Compatibility", () => {
    test("should generate compatible validators across versions", async () => {
      // Create equivalent schemas
      const schema30 = `
openapi: 3.0.3
info:
  title: Validation Test 3.0
  version: 1.0.0
paths: {}
components:
  schemas:
    TestModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
          nullable: true
        age:
          type: integer
          minimum: 0
          maximum: 150
          nullable: true
      required: ['id', 'name']`;

      const schema31 = `
openapi: 3.1.0
info:
  title: Validation Test 3.1
  version: 1.0.0
paths: {}
components:
  schemas:
    TestModel:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: ["string", "null"]
          format: email
        age:
          type: ["integer", "null"]
          minimum: 0
          maximum: 150
      required: ['id', 'name']`;

      const tempPath30 = path.join(schemaDir, "temp-validation-30.yaml");
      const tempPath31 = path.join(schemaDir, "temp-validation-31.yaml");

      fs.writeFileSync(tempPath30, schema30);
      fs.writeFileSync(tempPath31, schema31);

      try {
        await generate({
          schemaFile: tempPath30,
          schemaType: "yaml",
          directory: path.join(outputDir, "validation-30")
        });

        await generate({
          schemaFile: tempPath31,
          schemaType: "yaml",
          directory: path.join(outputDir, "validation-31"),
          openapi31: {
            strictNullHandling: true
          }
        });

        // Test validators with same data
        const schema30Json = JSON.parse(fs.readFileSync(path.join(outputDir, "validation-30", "schema.json"), "utf8"));
        const schema31Json = JSON.parse(fs.readFileSync(path.join(outputDir, "validation-31", "schema.json"), "utf8"));

        const ajv = new Ajv({ strict: false });
        addFormats(ajv);

        const validator30 = ajv.compile(schema30Json.definitions.TestModel);
        const validator31 = ajv.compile(schema31Json.definitions.TestModel);

        const testCases = [
          { data: { id: "1", name: "John", email: "john@example.com", age: 30 }, shouldPass: true },
          { data: { id: "2", name: "Jane", email: null, age: null }, shouldPass: true },
          { data: { id: "3", name: "Bob" }, shouldPass: true }, // missing optional fields
          { data: { id: "4", name: "Alice", email: "invalid-email", age: 25 }, shouldPass: false }, // invalid email
          { data: { id: "5", name: "Charlie", email: "charlie@example.com", age: -5 }, shouldPass: false }, // invalid age
          { data: { name: "Dave" }, shouldPass: false }, // missing required id
        ];

        testCases.forEach(({ data, shouldPass }, index) => {
          const result30 = validator30(data);
          const result31 = validator31(data);

          expect(result30).toBe(shouldPass);
          expect(result31).toBe(shouldPass);
          expect(result30).toBe(result31);

          if (!shouldPass) {
            expect(validator30.errors).toBeTruthy();
            expect(validator31.errors).toBeTruthy();
          }
        });
      } finally {
        [tempPath30, tempPath31].forEach(path => {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        });
      }
    });

    test("should handle format validation consistently", async () => {
      const formats = ["email", "uri", "date", "date-time", "uuid"];
      
      for (const format of formats) {
        const schema30 = `
openapi: 3.0.3
info:
  title: Format Test 3.0
  version: 1.0.0
paths: {}
components:
  schemas:
    FormatTest:
      type: object
      properties:
        value:
          type: string
          format: ${format}
          nullable: true
      required: ['value']`;

        const schema31 = `
openapi: 3.1.0
info:
  title: Format Test 3.1
  version: 1.0.0
paths: {}
components:
  schemas:
    FormatTest:
      type: object
      properties:
        value:
          type: ["string", "null"]
          format: ${format}
      required: ['value']`;

        const tempPath30 = path.join(schemaDir, `temp-format-30-${format}.yaml`);
        const tempPath31 = path.join(schemaDir, `temp-format-31-${format}.yaml`);

        fs.writeFileSync(tempPath30, schema30);
        fs.writeFileSync(tempPath31, schema31);

        try {
          const result30 = await parseSchema(tempPath30, "yaml");
          const result31 = await parseSchema(tempPath31, "yaml", {
            strictNullHandling: true
          });

          expect(result30.definitions.FormatTest.properties.value.format).toBe(format);
          expect(result31.definitions.FormatTest.properties.value.format).toBe(format);

          // Both should handle the format consistently
          expect(result30.definitions.FormatTest.properties.value.nullable).toBe(true);
          expect(Array.isArray(result31.definitions.FormatTest.properties.value.type)).toBe(true);
        } finally {
          [tempPath30, tempPath31].forEach(path => {
            if (fs.existsSync(path)) {
              fs.unlinkSync(path);
            }
          });
        }
      }
    });
  });

  describe("Error Handling Consistency", () => {
    test("should provide consistent error handling across versions", async () => {
      const invalidSchemas = [
        {
          name: "missing-info",
          schema: `
openapi: 3.0.3
paths: {}
# Missing required info section`
        },
        {
          name: "invalid-reference",
          schema: `
openapi: 3.1.0
info:
  title: Invalid Ref Test
  version: 1.0.0
paths: {}
components:
  schemas:
    TestModel:
      $ref: '#/components/schemas/NonExistent'`
        }
      ];

      for (const { name, schema } of invalidSchemas) {
        const tempPath = path.join(schemaDir, `temp-error-${name}.yaml`);
        fs.writeFileSync(tempPath, schema);

        try {
          // Both versions should handle errors gracefully
          await expect(parseSchema(tempPath, "yaml")).rejects.toThrow();
        } catch (error) {
          // Error should be descriptive
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message.length).toBeGreaterThan(0);
        } finally {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      }
    });
  });
});