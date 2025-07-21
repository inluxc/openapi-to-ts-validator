import path from "node:path";
import { generate } from "openapi-to-ts-validator/src/generate";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import { transformDiscriminators, hasDiscriminators, extractDiscriminatorInfo } from "openapi-to-ts-validator/src/transform/openapi31-discriminator-transformer";
import type { JSONSchema } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

describe("OpenAPI 3.1 discriminator functionality", () => {
  const testOutputDir = path.join(__dirname, "../output/discriminator-test");
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

  describe("transformDiscriminators function", () => {
    test("should transform discriminator with explicit mapping in oneOf", () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'petType',
          mapping: {
            cat: '#/components/schemas/Cat',
            dog: '#/components/schemas/Dog'
          }
        },
        oneOf: [
          { $ref: '#/components/schemas/Cat' },
          { $ref: '#/components/schemas/Dog' }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0]).toEqual({
        propertyName: 'petType',
        mapping: {
          cat: '#/components/schemas/Cat',
          dog: '#/components/schemas/Dog'
        },
        location: '#/'
      });
      expect((result.schema as any)['x-discriminator-enhanced']).toBeDefined();
    });

    test("should infer mapping when not explicitly provided", () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'vehicleType'
        },
        anyOf: [
          { $ref: '#/components/schemas/Car' },
          { $ref: '#/components/schemas/Motorcycle' }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0].inferredMapping).toEqual({
        Car: '#/components/schemas/Car',
        Motorcycle: '#/components/schemas/Motorcycle'
      });
    });

    test("should handle discriminator in allOf (inheritance scenario)", () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'shapeType'
        },
        allOf: [
          {
            type: 'object',
            properties: {
              color: { type: 'string' }
            }
          }
        ]
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.schema.properties).toBeDefined();
      expect(result.schema.properties!['shapeType']).toEqual({
        type: 'string',
        description: 'Discriminator property for #/'
      });
      expect(result.schema.required).toContain('shapeType');
    });

    test("should handle nested discriminators", () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          pet: {
            type: 'object',
            discriminator: {
              propertyName: 'petType'
            },
            oneOf: [
              { $ref: '#/components/schemas/Cat' }
            ]
          }
        }
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(true);
      expect(result.discriminators).toHaveLength(1);
      expect(result.discriminators![0].isNested).toBe(true);
      expect(result.discriminators![0].location).toBe('#/properties/pet');
    });

    test("should not transform schemas without discriminators", () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      const result = transformDiscriminators(schema);

      expect(result.wasTransformed).toBe(false);
      expect(result.discriminators).toBeUndefined();
      expect(result.schema).toEqual(schema);
    });
  });

  describe("hasDiscriminators function", () => {
    test("should detect direct discriminators", () => {
      const schema: JSONSchema = {
        type: 'object',
        discriminator: {
          propertyName: 'type'
        },
        oneOf: []
      };

      expect(hasDiscriminators(schema)).toBe(true);
    });

    test("should detect nested discriminators", () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          item: {
            type: 'object',
            discriminator: {
              propertyName: 'type'
            }
          }
        }
      };

      expect(hasDiscriminators(schema)).toBe(true);
    });

    test("should return false for schemas without discriminators", () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };

      expect(hasDiscriminators(schema)).toBe(false);
    });
  });

  describe("OpenAPI 3.1 schema parsing with discriminators", () => {
    test("should parse OpenAPI 3.1 schema with discriminators", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Discriminator Test API
  version: 1.0.0
paths: {}
components:
  schemas:
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
      required:
        - petType

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
      required:
        - petType
        - name

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
      required:
        - petType
        - name

    Vehicle:
      type: object
      discriminator:
        propertyName: vehicleType
      anyOf:
        - $ref: '#/components/schemas/Car'
        - $ref: '#/components/schemas/Bike'

    Car:
      type: object
      properties:
        vehicleType:
          type: string
          const: Car
        make:
          type: string
        doors:
          type: number
      required:
        - vehicleType
        - make

    Bike:
      type: object
      properties:
        vehicleType:
          type: string
          const: Bike
        brand:
          type: string
        gears:
          type: number
      required:
        - vehicleType
        - brand
      `;

      const schemaPath = path.join(testSchemaDir, "discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions).toBeDefined();
        expect(result.definitions.Pet).toBeDefined();
        expect(result.definitions.Cat).toBeDefined();
        expect(result.definitions.Dog).toBeDefined();
        expect(result.definitions.Vehicle).toBeDefined();

        // Check discriminator enhancements
        const petSchema = result.definitions.Pet;
        expect((petSchema as any)['x-discriminator-enhanced']).toBeDefined();
        
        const petDiscriminator = (petSchema as any)['x-discriminator-enhanced'];
        expect(petDiscriminator.propertyName).toBe('petType');
        expect(petDiscriminator.mapping).toEqual({
          cat: '#/components/schemas/Cat',
          dog: '#/components/schemas/Dog'
        });

        // Check inferred mapping
        const vehicleSchema = result.definitions.Vehicle;
        expect((vehicleSchema as any)['x-discriminator-enhanced']).toBeDefined();
        
        const vehicleDiscriminator = (vehicleSchema as any)['x-discriminator-enhanced'];
        expect(vehicleDiscriminator.propertyName).toBe('vehicleType');
        expect(vehicleDiscriminator.mapping).toEqual({
          Car: '#/components/schemas/Car',
          Bike: '#/components/schemas/Bike'
        });
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should handle inheritance-style discriminator", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Inheritance Discriminator Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Shape:
      type: object
      discriminator:
        propertyName: shapeType
      properties:
        shapeType:
          type: string
        color:
          type: string
      required:
        - shapeType

    Circle:
      allOf:
        - $ref: '#/components/schemas/Shape'
        - type: object
          properties:
            shapeType:
              type: string
              const: circle
            radius:
              type: number
          required:
            - radius
      `;

      const schemaPath = path.join(testSchemaDir, "inheritance-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.Shape).toBeDefined();
        expect(result.definitions.Circle).toBeDefined();

        const shapeSchema = result.definitions.Shape;
        expect((shapeSchema as any)['x-discriminator-enhanced']).toBeDefined();
        
        const discriminatorInfo = (shapeSchema as any)['x-discriminator-enhanced'];
        expect(discriminatorInfo.propertyName).toBe('shapeType');
        expect(discriminatorInfo.isInheritance).toBe(true);
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("End-to-end generation with discriminators", () => {
    test("should generate TypeScript types and validators for discriminators", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: E2E Discriminator Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Notification:
      type: object
      discriminator:
        propertyName: type
        mapping:
          email: '#/components/schemas/EmailNotification'
          sms: '#/components/schemas/SmsNotification'
      oneOf:
        - $ref: '#/components/schemas/EmailNotification'
        - $ref: '#/components/schemas/SmsNotification'
      required:
        - type

    EmailNotification:
      type: object
      properties:
        type:
          type: string
          const: email
        recipient:
          type: string
        subject:
          type: string
        body:
          type: string
      required:
        - type
        - recipient
        - subject
        - body

    SmsNotification:
      type: object
      properties:
        type:
          type: string
          const: sms
        phoneNumber:
          type: string
        message:
          type: string
      required:
        - type
        - phoneNumber
        - message
      `;

      const schemaPath = path.join(testSchemaDir, "e2e-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          openapi31: {
            enableEnhancedDiscriminator: true
          }
        });

        // Check that files were generated
        const modelsPath = path.join(testOutputDir, "models.ts");
        const decodersPath = path.join(testOutputDir, "decoders.ts");

        expect(require("fs").existsSync(modelsPath)).toBe(true);
        expect(require("fs").existsSync(decodersPath)).toBe(true);

        // Check generated TypeScript models
        const modelsContent = readFileSync(modelsPath, "utf8");
        expect(modelsContent).toContain("Notification");
        expect(modelsContent).toContain("EmailNotification");
        expect(modelsContent).toContain("SmsNotification");

        // Check generated decoders
        const decodersContent = readFileSync(decodersPath, "utf8");
        expect(decodersContent).toContain("NotificationDecoder");
        expect(decodersContent).toContain("EmailNotificationDecoder");
        expect(decodersContent).toContain("SmsNotificationDecoder");
        
        // Check that discriminator support is enabled
        expect(decodersContent).toContain("discriminator: true");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should generate standalone validators with discriminator support", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Standalone Discriminator Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Animal:
      type: object
      discriminator:
        propertyName: species
      anyOf:
        - $ref: '#/components/schemas/Mammal'
        - $ref: '#/components/schemas/Bird'

    Mammal:
      type: object
      properties:
        species:
          type: string
          const: Mammal
        furColor:
          type: string
      required:
        - species

    Bird:
      type: object
      properties:
        species:
          type: string
          const: Bird
        wingspan:
          type: number
      required:
        - species
      `;

      const schemaPath = path.join(testSchemaDir, "standalone-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        await generate({
          schemaFile: schemaPath,
          schemaType: "yaml",
          directory: testOutputDir,
          standalone: {
            validatorOutput: "module"
          },
          openapi31: {
            enableEnhancedDiscriminator: true
          }
        });

        const standalonePath = path.join(testOutputDir, "standalone.mjs");
        expect(require("fs").existsSync(standalonePath)).toBe(true);

        const standaloneContent = readFileSync(standalonePath, "utf8");
        expect(standaloneContent).toContain("discriminator: true");
        expect(standaloneContent).toContain("validateAnimal");
        expect(standaloneContent).toContain("validateMammal");
        expect(standaloneContent).toContain("validateBird");
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Configuration options", () => {
    test("should respect enableEnhancedDiscriminator option", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Config Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    TestDiscriminator:
      type: object
      discriminator:
        propertyName: type
      oneOf:
        - $ref: '#/components/schemas/TypeA'
        - $ref: '#/components/schemas/TypeB'

    TypeA:
      type: object
      properties:
        type:
          type: string
          const: A

    TypeB:
      type: object
      properties:
        type:
          type: string
          const: B
      `;

      const schemaPath = path.join(testSchemaDir, "config-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        // Test with enhanced discriminator disabled
        const resultDisabled = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: false
        });

        const schemaDisabled = resultDisabled.definitions.TestDiscriminator;
        expect((schemaDisabled as any)['x-discriminator-enhanced']).toBeUndefined();

        // Test with enhanced discriminator enabled (default)
        const resultEnabled = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: true
        });

        const schemaEnabled = resultEnabled.definitions.TestDiscriminator;
        expect((schemaEnabled as any)['x-discriminator-enhanced']).toBeDefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });

    test("should work with fallback to OpenAPI 3.0 behavior", async () => {
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
      discriminator:
        propertyName: type
      oneOf:
        - $ref: '#/components/schemas/TypeA'

    TypeA:
      type: object
      properties:
        type:
          type: string
          const: A
      `;

      const schemaPath = path.join(testSchemaDir, "fallback-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: false,
          fallbackToOpenAPI30: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.FallbackTest).toBeDefined();
        
        // Should not have enhanced discriminator metadata
        const schema = result.definitions.FallbackTest;
        expect((schema as any)['x-discriminator-enhanced']).toBeUndefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Error handling", () => {
    test("should handle invalid discriminator configuration gracefully", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Invalid Discriminator Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    InvalidDiscriminator:
      type: object
      discriminator:
        # Missing propertyName
        mapping:
          a: '#/components/schemas/TypeA'
      oneOf:
        - $ref: '#/components/schemas/TypeA'

    TypeA:
      type: object
      properties:
        type:
          type: string
      `;

      const schemaPath = path.join(testSchemaDir, "invalid-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        // Should not throw, but should not transform the discriminator
        const result = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.InvalidDiscriminator).toBeDefined();
        
        // Should not have enhanced discriminator metadata due to invalid config
        const schema = result.definitions.InvalidDiscriminator;
        expect((schema as any)['x-discriminator-enhanced']).toBeUndefined();
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });

  describe("Complex discriminator scenarios", () => {
    test("should handle nested discriminators in complex schemas", async () => {
      const testSchema = `
openapi: 3.1.0
info:
  title: Complex Discriminator Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    Container:
      type: object
      properties:
        id:
          type: string
        items:
          type: array
          items:
            $ref: '#/components/schemas/Item'
        primaryItem:
          $ref: '#/components/schemas/Item'
      required:
        - id

    Item:
      type: object
      discriminator:
        propertyName: itemType
      oneOf:
        - $ref: '#/components/schemas/Document'
        - $ref: '#/components/schemas/Image'

    Document:
      type: object
      properties:
        itemType:
          type: string
          const: Document
        title:
          type: string
        content:
          type: string
      required:
        - itemType
        - title

    Image:
      type: object
      properties:
        itemType:
          type: string
          const: Image
        url:
          type: string
        alt:
          type: string
      required:
        - itemType
        - url
      `;

      const schemaPath = path.join(testSchemaDir, "complex-discriminator-test.yaml");
      writeFileSync(schemaPath, testSchema);

      try {
        const result = await parseSchema(schemaPath, "yaml", {
          enableEnhancedDiscriminator: true
        });

        expect(result.version.isVersion31).toBe(true);
        expect(result.definitions.Container).toBeDefined();
        expect(result.definitions.Item).toBeDefined();
        expect(result.definitions.Document).toBeDefined();
        expect(result.definitions.Image).toBeDefined();

        // Check that discriminator was processed
        const itemSchema = result.definitions.Item;
        expect((itemSchema as any)['x-discriminator-enhanced']).toBeDefined();
        
        const discriminatorInfo = (itemSchema as any)['x-discriminator-enhanced'];
        expect(discriminatorInfo.propertyName).toBe('itemType');
        expect(discriminatorInfo.mapping).toEqual({
          Document: '#/components/schemas/Document',
          Image: '#/components/schemas/Image'
        });
      } finally {
        // Clean up test file
        if (require("fs").existsSync(schemaPath)) {
          require("fs").unlinkSync(schemaPath);
        }
      }
    });
  });
});