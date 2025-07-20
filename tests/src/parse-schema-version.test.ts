import path from "node:path";
import { parseSchema } from "openapi-to-ts-validator/src/parse-schema";

describe("parse-schema version detection", () => {
  const schemaDir = path.join(__dirname, "../schemas");

  describe("OpenAPI 3.0 schema parsing", () => {
    test("should parse OpenAPI 3.0 schema and include version info", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.0-test.yaml"),
        "yaml"
      );

      expect(result.version).toBeDefined();
      expect(result.version.version).toBe("3.0.0");
      expect(result.version.major).toBe(3);
      expect(result.version.minor).toBe(0);
      expect(result.version.patch).toBe(0);
      expect(result.version.isVersion30).toBe(true);
      expect(result.version.isVersion31).toBe(false);
      
      // Verify other properties are still present
      expect(result.json).toBeDefined();
      expect(result.definitions).toBeDefined();
      expect(result.whitelistedDecoders).toBeUndefined();
    });
  });

  describe("OpenAPI 3.1 schema parsing", () => {
    test("should parse OpenAPI 3.1 schema and include version info", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "openapi-3.1-test.yaml"),
        "yaml"
      );

      expect(result.version).toBeDefined();
      expect(result.version.version).toBe("3.1.0");
      expect(result.version.major).toBe(3);
      expect(result.version.minor).toBe(1);
      expect(result.version.patch).toBe(0);
      expect(result.version.isVersion30).toBe(false);
      expect(result.version.isVersion31).toBe(true);
      
      // Verify other properties are still present
      expect(result.json).toBeDefined();
      expect(result.definitions).toBeDefined();
      expect(result.whitelistedDecoders).toBeUndefined();
    });
  });

  describe("Custom schema parsing", () => {
    test("should parse custom schema and include default version info", async () => {
      const result = await parseSchema(
        path.join(schemaDir, "custom-schema.js"),
        "custom"
      );

      expect(result.version).toBeDefined();
      expect(result.version.version).toBe("custom");
      expect(result.version.major).toBe(0);
      expect(result.version.minor).toBe(0);
      expect(result.version.patch).toBe(0);
      expect(result.version.isVersion30).toBe(false);
      expect(result.version.isVersion31).toBe(false);
      
      // Verify other properties are still present
      expect(result.json).toBeDefined();
      expect(result.definitions).toBeDefined();
      expect(result.whitelistedDecoders).toBeDefined();
    });
  });

  describe("Error handling", () => {
    test("should throw error for unsupported OpenAPI version", async () => {
      // Create a temporary schema with unsupported version
      const invalidSchema = `
openapi: 2.0.0
info:
  title: Invalid Version API
  version: 1.0.0
paths: {}
      `;
      
      const tempFile = path.join(schemaDir, "temp-invalid.yaml");
      const fs = require("fs");
      fs.writeFileSync(tempFile, invalidSchema);
      
      try {
        await expect(parseSchema(tempFile, "yaml")).rejects.toThrow(
          "OpenAPI major version 2 is not supported"
        );
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    test("should throw error for missing openapi field", async () => {
      // Create a temporary schema without openapi field
      const invalidSchema = `
info:
  title: Missing Version API
  version: 1.0.0
paths: {}
      `;
      
      const tempFile = path.join(schemaDir, "temp-missing-version.yaml");
      const fs = require("fs");
      fs.writeFileSync(tempFile, invalidSchema);
      
      try {
        await expect(parseSchema(tempFile, "yaml")).rejects.toThrow(
          'Missing "openapi" field in schema'
        );
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });
  });
});