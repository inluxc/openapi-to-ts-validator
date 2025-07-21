import path from "node:path";
import fs from "node:fs";
import { generate } from "openapi-to-ts-validator";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import Ajv from "ajv";

describe("OpenAPI 3.0 Comprehensive Regression Tests", () => {
  const schemaDir = path.join(__dirname, "../schemas");
  const generatedDir = path.join(__dirname, "../generated", "openapi30-comprehensive");

  beforeAll(async () => {
    if (fs.existsSync(generatedDir)) {
      fs.rmSync(generatedDir, { recursive: true });
    }

    await generate({
      schemaFile: path.join(schemaDir, "openapi-3.0-comprehensive.yaml"),
      schemaType: "yaml",
      directory: generatedDir,
      standalone: {
        validatorOutput: "module",
      },
    });
  });

  describe("Complex Schema Parsing", () => {
    test("should parse comprehensive OpenAPI 3.0 schema correctly", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-comprehensive.yaml"),
        "yaml"
      );

      expect(result.version.isVersion30).toBe(true);
      expect(result.version.version).toBe("3.0.3");
      
      // Verify all expected schemas are present
      const expectedSchemas = [
        'User', 'UserProfile', 'UserList', 'Pet', 'Dog', 'Cat',
        'Address', 'PersonalInfo', 'BusinessInfo', 'Contact', 'Organization'
      ];
      
      expectedSchemas.forEach(schemaName => {
        expect(result.definitions[schemaName]).toBeDefined();
      });
    });

    test("should handle nullable properties correctly in OpenAPI 3.0 style", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-comprehensive.yaml"),
        "yaml"
      );

      const userSchema = result.definitions.User;
      const userProfileSchema = result.definitions.UserProfile;

      // Verify nullable handling uses OpenAPI 3.0 approach
      expect(userSchema.properties.email.nullable).toBe(true);
      expect(userSchema.properties.email.type).toBe("string");
      expect(Array.isArray(userSchema.properties.email.type)).toBe(false);

      expect(userProfileSchema.properties.bio.nullable).toBe(true);
      expect(userProfileSchema.properties.avatar.nullable).toBe(true);
    });

    test("should handle discriminators correctly in OpenAPI 3.0 style", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-comprehensive.yaml"),
        "yaml"
      );

      const petSchema = result.definitions.Pet;
      
      // Verify discriminator structure matches OpenAPI 3.0
      expect(petSchema.discriminator).toBeDefined();
      expect(petSchema.discriminator.propertyName).toBe("petType");
      
      // Verify no OpenAPI 3.1 discriminator enhancements are present
      expect(petSchema.discriminator.mapping).toBeUndefined();
    });

    test("should handle complex compositions (allOf, oneOf) correctly", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-comprehensive.yaml"),
        "yaml"
      );

      const dogSchema = result.definitions.Dog;
      const contactSchema = result.definitions.Contact;

      // Verify allOf composition
      expect(dogSchema.allOf).toBeDefined();
      expect(Array.isArray(dogSchema.allOf)).toBe(true);
      expect(dogSchema.allOf.length).toBe(2);

      // Verify oneOf composition
      expect(contactSchema.oneOf).toBeDefined();
      expect(Array.isArray(contactSchema.oneOf)).toBe(true);
      expect(contactSchema.oneOf.length).toBe(2);
    });
  });

  describe("TypeScript Generation Regression", () => {
    test("should generate correct TypeScript interfaces", () => {
      const modelsFile = fs.readFileSync(
        path.join(generatedDir, "models.ts"),
        "utf8"
      );

      // Verify User interface with nullable email
      expect(modelsFile).toContain("export interface User {");
      expect(modelsFile).toContain("id: string;");
      expect(modelsFile).toContain("name: string;");
      expect(modelsFile).toContain("email?: string | null;");
      expect(modelsFile).toContain("age?: number;");
      expect(modelsFile).toContain("tags?: string[];");
      expect(modelsFile).toContain("status?: \"active\" | \"inactive\" | \"pending\";");

      // Verify UserProfile interface with nullable properties
      expect(modelsFile).toContain("export interface UserProfile {");
      expect(modelsFile).toContain("bio?: string | null;");
      expect(modelsFile).toContain("avatar?: string | null;");

      // Verify discriminated union types
      expect(modelsFile).toContain("export interface Pet {");
      expect(modelsFile).toContain("export interface Dog {");
      expect(modelsFile).toContain("export interface Cat {");

      // Verify complex compositions
      expect(modelsFile).toContain("export type Contact = PersonalInfo | BusinessInfo;");

      // Ensure no OpenAPI 3.1 specific constructs are present
      expect(modelsFile).not.toContain("prefixItems");
      expect(modelsFile).not.toContain("unevaluatedProperties");
      expect(modelsFile).not.toContain("const:");
    });

    test("should generate correct array and object types", () => {
      const modelsFile = fs.readFileSync(
        path.join(generatedDir, "models.ts"),
        "utf8"
      );

      // Verify array types
      expect(modelsFile).toContain("users: User[];");
      expect(modelsFile).toContain("members?: User[];");

      // Verify nested object types
      expect(modelsFile).toContain("metadata?: { [key: string]: string };");
      expect(modelsFile).toContain("settings?: { [key: string]: unknown };");

      // Verify object with specific properties
      expect(modelsFile).toContain("preferences?: {");
      expect(modelsFile).toContain("theme?: \"light\" | \"dark\";");
      expect(modelsFile).toContain("notifications?: boolean;");
    });
  });

  describe("Validator Generation Regression", () => {
    test("should generate working validators for all schemas", () => {
      const decodersDir = path.join(generatedDir, "decoders");
      expect(fs.existsSync(decodersDir)).toBe(true);

      const expectedDecoders = [
        'User', 'UserProfile', 'UserList', 'Pet', 'Dog', 'Cat',
        'Address', 'PersonalInfo', 'BusinessInfo', 'Contact', 'Organization'
      ];

      expectedDecoders.forEach(decoderName => {
        const decoderDir = path.join(decodersDir, decoderName);
        expect(fs.existsSync(decoderDir)).toBe(true);
        
        const decoderFile = path.join(decoderDir, "decoder.ts");
        expect(fs.existsSync(decoderFile)).toBe(true);
        
        const validatorFile = path.join(decoderDir, "validator.js");
        expect(fs.existsSync(validatorFile)).toBe(true);
      });
    });

    test("should generate validators that handle nullable properties correctly", () => {
      const userValidatorFile = fs.readFileSync(
        path.join(generatedDir, "decoders", "User", "validator.js"),
        "utf8"
      );

      // Verify nullable handling in generated validator
      expect(userValidatorFile).toBeDefined();
      
      // The validator should handle nullable email field
      // (specific validation logic depends on AJV implementation)
      expect(userValidatorFile).toContain("email");
    });

    test("should generate valid JSON schema for AJV", async () => {
      const schemaFile = fs.readFileSync(
        path.join(generatedDir, "schema.json"),
        "utf8"
      );

      const schema = JSON.parse(schemaFile);
      expect(await new Ajv().validateSchema(schema)).toBe(true);

      // Verify nullable properties are handled correctly in JSON schema
      expect(schema.definitions.User.properties.email.nullable).toBe(true);
      expect(schema.definitions.UserProfile.properties.bio.nullable).toBe(true);
      expect(schema.definitions.UserProfile.properties.avatar.nullable).toBe(true);

      // Verify discriminator structure
      expect(schema.definitions.Pet.discriminator).toBeDefined();
      expect(schema.definitions.Pet.discriminator.propertyName).toBe("petType");

      // Ensure no OpenAPI 3.1 specific features are present
      Object.values(schema.definitions).forEach((def: any) => {
        expect(def.prefixItems).toBeUndefined();
        expect(def.unevaluatedProperties).toBeUndefined();
        expect(def.if).toBeUndefined();
        expect(def.then).toBeUndefined();
        expect(def.else).toBeUndefined();
        expect(def.contains).toBeUndefined();
      });
    });
  });

  describe("Functional Validation Tests", () => {
    test("should validate data correctly with generated validators", async () => {
      // Import the generated validation functions
      const { UserDecoder } = await import(path.join(generatedDir, "decoders", "User", "decoder"));

      // Test valid user data
      const validUser = {
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        tags: ["developer", "typescript"],
        status: "active"
      };

      expect(() => UserDecoder.decode(validUser)).not.toThrow();

      // Test user with null email (should be valid due to nullable)
      const userWithNullEmail = {
        id: "124",
        name: "Jane Doe",
        email: null,
        status: "inactive"
      };

      expect(() => UserDecoder.decode(userWithNullEmail)).not.toThrow();

      // Test invalid user (missing required field)
      const invalidUser = {
        name: "Invalid User"
        // missing required 'id' field
      };

      expect(() => UserDecoder.decode(invalidUser)).toThrow();
    });

    test("should handle discriminated unions correctly", async () => {
      const { DogDecoder } = await import(path.join(generatedDir, "decoders", "Dog", "decoder"));
      const { CatDecoder } = await import(path.join(generatedDir, "decoders", "Cat", "decoder"));

      const validDog = {
        petType: "dog",
        name: "Buddy",
        breed: "Golden Retriever"
      };

      const validCat = {
        petType: "cat",
        name: "Whiskers",
        indoor: true
      };

      expect(() => DogDecoder.decode(validDog)).not.toThrow();
      expect(() => CatDecoder.decode(validCat)).not.toThrow();
    });
  });

  describe("Performance Regression", () => {
    test("should maintain reasonable generation performance", async () => {
      const startTime = Date.now();
      
      const tempDir = path.join(__dirname, "../generated", "performance-test");
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }

      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.0-comprehensive.yaml"),
        schemaType: "yaml",
        directory: tempDir,
        standalone: {
          validatorOutput: "module",
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Generation should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Clean up
      fs.rmSync(tempDir, { recursive: true });
    });
  });
});