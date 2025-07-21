import path from "node:path";
import fs from "node:fs";
import { generate } from "openapi-to-ts-validator";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";
import Ajv from "ajv";

describe("OpenAPI 3.0 Backward Compatibility", () => {
  const schemaDir = path.join(__dirname, "../schemas");
  const generatedDir = path.join(__dirname, "../generated", "openapi30-regression");

  beforeAll(async () => {
    if (fs.existsSync(generatedDir)) {
      fs.rmSync(generatedDir, { recursive: true });
    }
  });

  describe("Schema Parsing Regression", () => {
    test("should parse OpenAPI 3.0 schema exactly as before", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-test.yaml"),
        "yaml"
      );

      // Verify version detection works correctly
      expect(result.version.isVersion30).toBe(true);
      expect(result.version.isVersion31).toBe(false);
      expect(result.version.major).toBe(3);
      expect(result.version.minor).toBe(0);

      // Verify schema structure remains unchanged
      expect(result.json).toBeDefined();
      expect(result.definitions).toBeDefined();
      expect(result.definitions.User).toBeDefined();
      
      // Verify User schema structure matches OpenAPI 3.0 expectations
      const userSchema = result.definitions.User;
      expect(userSchema.type).toBe("object");
      expect(userSchema.properties).toBeDefined();
      expect(userSchema.properties.id).toEqual({ type: "string" });
      expect(userSchema.properties.name).toEqual({ type: "string" });
      
      // Verify nullable handling uses OpenAPI 3.0 approach (not type arrays)
      expect(userSchema.properties.email).toEqual({ 
        type: "string",
        nullable: true 
      });
      
      // Verify required fields
      expect(userSchema.required).toEqual(["id", "name"]);

      // Verify no OpenAPI 3.1 specific features are present
      expect(result.webhooks).toBeUndefined();
      expect(userSchema.prefixItems).toBeUndefined();
      expect(userSchema.unevaluatedProperties).toBeUndefined();
      expect(userSchema.if).toBeUndefined();
      expect(userSchema.then).toBeUndefined();
      expect(userSchema.else).toBeUndefined();
    });

    test("should handle complex OpenAPI 3.0 schemas without changes", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "complex-schema.json"),
        "json"
      );

      expect(result.version.isVersion30).toBe(true);
      expect(result.definitions).toBeDefined();
      
      // Verify complex schema structures remain intact
      Object.keys(result.definitions).forEach(key => {
        const schema = result.definitions[key];
        expect(schema).toBeDefined();
        
        // Ensure no OpenAPI 3.1 transformations were applied
        if (Array.isArray(schema.type)) {
          // This should not happen in OpenAPI 3.0 processing
          fail(`Type arrays should not be present in OpenAPI 3.0 schema: ${key}`);
        }
      });
    });
  });

  describe("Code Generation Regression", () => {
    beforeAll(async () => {
      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.0-test.yaml"),
        schemaType: "yaml",
        directory: generatedDir,
        standalone: {
          validatorOutput: "module",
        },
      });
    });

    test("should generate identical TypeScript models", () => {
      const modelsFile = fs.readFileSync(
        path.join(generatedDir, "models.ts"),
        "utf8"
      );

      expect(modelsFile).toBeDefined();
      
      // Verify User interface structure matches OpenAPI 3.0 expectations
      expect(modelsFile).toContain("export interface User {");
      expect(modelsFile).toContain("id: string;");
      expect(modelsFile).toContain("name: string;");
      
      // Verify nullable handling uses union with null (not type arrays)
      expect(modelsFile).toContain("email?: string | null;");
      
      // Ensure no OpenAPI 3.1 specific type constructs are present
      expect(modelsFile).not.toContain("prefixItems");
      expect(modelsFile).not.toContain("unevaluatedProperties");
      expect(modelsFile).not.toContain("const:");
      expect(modelsFile).not.toContain("contains:");
    });

    test("should generate identical validators", () => {
      const validateFile = fs.readFileSync(
        path.join(generatedDir, "validate.ts"),
        "utf8"
      );

      expect(validateFile).toBeDefined();
      
      // Verify validator structure remains unchanged
      expect(validateFile).toContain("export function validateJson");
      expect(validateFile).toContain("export interface Validator");
      
      // Ensure no OpenAPI 3.1 specific validation logic is present
      expect(validateFile).not.toContain("prefixItems");
      expect(validateFile).not.toContain("unevaluatedProperties");
      expect(validateFile).not.toContain("contains");
      expect(validateFile).not.toContain("if/then/else");
    });

    test("should generate identical decoders", () => {
      const decodersDir = path.join(generatedDir, "decoders");
      expect(fs.existsSync(decodersDir)).toBe(true);

      const userDecoderFile = fs.readFileSync(
        path.join(decodersDir, "User", "decoder.ts"),
        "utf8"
      );

      expect(userDecoderFile).toBeDefined();
      expect(userDecoderFile).toContain("export const UserDecoder: Decoder<User>");
      expect(userDecoderFile).toContain('definitionName: "User"');
      expect(userDecoderFile).toContain('schemaRef: "#/definitions/User"');
    });

    test("should generate valid JSON schema", async () => {
      const schemaFile = fs.readFileSync(
        path.join(generatedDir, "schema.json"),
        "utf8"
      );

      expect(schemaFile).toBeDefined();
      
      const schema = JSON.parse(schemaFile);
      expect(await new Ajv().validateSchema(schema)).toBe(true);
      
      // Verify schema structure matches OpenAPI 3.0 expectations
      expect(schema.definitions.User).toBeDefined();
      expect(schema.definitions.User.properties.email.nullable).toBe(true);
      
      // Ensure no OpenAPI 3.1 specific schema features are present
      expect(schema.definitions.User.prefixItems).toBeUndefined();
      expect(schema.definitions.User.unevaluatedProperties).toBeUndefined();
    });
  });

  describe("Version-Specific Processing Branches", () => {
    test("should route OpenAPI 3.0 through legacy processing path", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-test.yaml"),
        "yaml"
      );

      // Verify that OpenAPI 3.0 processing doesn't trigger 3.1 transformations
      expect(result.version.isVersion30).toBe(true);
      
      // Check that no OpenAPI 3.1 options were applied
      const userSchema = result.definitions.User;
      
      // Nullable should be handled the 3.0 way (nullable: true)
      expect(userSchema.properties.email.nullable).toBe(true);
      expect(Array.isArray(userSchema.properties.email.type)).toBe(false);
      
      // No 3.1 transformations should have been applied
      expect(userSchema.prefixItems).toBeUndefined();
      expect(userSchema.unevaluatedProperties).toBeUndefined();
      expect(userSchema.if).toBeUndefined();
    });

    test("should not apply OpenAPI 3.1 transformations to 3.0 schemas", async () => {
      // Parse with OpenAPI 3.1 options enabled (should be ignored for 3.0)
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-test.yaml"),
        "yaml",
        {
          strictNullHandling: true,
          enableConditionalSchemas: true,
          enablePrefixItems: true,
          enableWebhooks: true,
        }
      );

      expect(result.version.isVersion30).toBe(true);
      
      // Verify 3.1 options were ignored
      expect(result.webhooks).toBeUndefined();
      
      const userSchema = result.definitions.User;
      expect(userSchema.properties.email.nullable).toBe(true);
      expect(Array.isArray(userSchema.properties.email.type)).toBe(false);
    });
  });

  describe("Mixed Version Scenarios", () => {
    test("should handle processing multiple schemas with different versions", async () => {
      // Process OpenAPI 3.0 schema
      const result30 = await parseSchema(
        path.join(schemaDir, "openapi-3.0-test.yaml"),
        "yaml"
      );

      // Process OpenAPI 3.1 schema
      const result31 = await parseSchema(
        path.join(schemaDir, "openapi-3.1-test.yaml"),
        "yaml"
      );

      // Verify version detection is correct for both
      expect(result30.version.isVersion30).toBe(true);
      expect(result30.version.isVersion31).toBe(false);
      
      expect(result31.version.isVersion30).toBe(false);
      expect(result31.version.isVersion31).toBe(true);

      // Verify different processing was applied
      const user30 = result30.definitions.User;
      const user31 = result31.definitions.User;

      // OpenAPI 3.0 should use nullable
      expect(user30.properties.email.nullable).toBe(true);
      
      // OpenAPI 3.1 might use type arrays (depending on schema)
      // This verifies that the same library can handle both versions correctly
      expect(user30).not.toEqual(user31); // They should be processed differently
    });
  });

  describe("Edge Cases", () => {
    test("should handle OpenAPI 3.0 with patch versions", async () => {
      const schema30_3 = `
openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
paths: {}
components:
  schemas:
    TestModel:
      type: object
      properties:
        id:
          type: string
      `;

      const tempFile = path.join(schemaDir, "temp-3.0.3.yaml");
      fs.writeFileSync(tempFile, schema30_3);

      try {
        const result = await parseSchema(tempFile, "yaml");
        
        expect(result.version.major).toBe(3);
        expect(result.version.minor).toBe(0);
        expect(result.version.patch).toBe(3);
        expect(result.version.isVersion30).toBe(true);
        expect(result.version.isVersion31).toBe(false);
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test("should maintain consistent output for identical 3.0 schemas", async () => {
      // Generate from the same schema twice
      const dir1 = path.join(__dirname, "../generated", "consistency-test-1");
      const dir2 = path.join(__dirname, "../generated", "consistency-test-2");

      if (fs.existsSync(dir1)) fs.rmSync(dir1, { recursive: true });
      if (fs.existsSync(dir2)) fs.rmSync(dir2, { recursive: true });

      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.0-test.yaml"),
        schemaType: "yaml",
        directory: dir1,
        standalone: { validatorOutput: "module" },
      });

      await generate({
        schemaFile: path.join(schemaDir, "openapi-3.0-test.yaml"),
        schemaType: "yaml",
        directory: dir2,
        standalone: { validatorOutput: "module" },
      });

      // Compare generated files
      const models1 = fs.readFileSync(path.join(dir1, "models.ts"), "utf8");
      const models2 = fs.readFileSync(path.join(dir2, "models.ts"), "utf8");
      
      expect(models1).toBe(models2);

      const schema1 = fs.readFileSync(path.join(dir1, "schema.json"), "utf8");
      const schema2 = fs.readFileSync(path.join(dir2, "schema.json"), "utf8");
      
      expect(schema1).toBe(schema2);

      // Clean up
      fs.rmSync(dir1, { recursive: true });
      fs.rmSync(dir2, { recursive: true });
    });
  });
});