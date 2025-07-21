import { parseSchema } from "../../src/parse-schema";
import { generateWebhookValidators } from "../../src/generate/generate-webhook-validators";
import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Webhook Validator Generation Tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `webhook-validator-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test("should generate webhook validators for OpenAPI 3.1 spec", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API with Webhooks",
        version: "1.0.0"
      },
      paths: {},
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string", format: "email" }
            },
            required: ["id", "name", "email"]
          }
        }
      },
      webhooks: {
        userCreated: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/User"
                  }
                }
              },
              required: true
            },
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: { type: "boolean" },
                        message: { type: "string" }
                      },
                      required: ["success"]
                    }
                  }
                }
              }
            }
          }
        },
        orderUpdated: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      orderId: { type: "string" },
                      status: { type: "string", enum: ["pending", "completed", "cancelled"] },
                      timestamp: { type: "string", format: "date-time" }
                    },
                    required: ["orderId", "status", "timestamp"]
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Acknowledged"
              }
            }
          }
        }
      }
    };

    // Write the OpenAPI spec to a temporary file
    const specPath = join(tempDir, "openapi-spec.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    // Parse the schema with webhook support enabled
    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    // Generate webhook validators
    const outputDir = join(tempDir, "generated");
    await generateWebhookValidators(
      parsedSchema,
      false, // addFormats
      undefined, // formatOptions
      "module", // output
      true, // esm
      [outputDir],
      { parser: "typescript" } // prettierOptions
    );

    // Verify that webhook validator files were generated
    const webhookDir = join(outputDir, "webhooks");
    expect(existsSync(webhookDir)).toBe(true);

    // Check that all expected files exist
    expect(existsSync(join(webhookDir, "validators.js"))).toBe(true);
    expect(existsSync(join(webhookDir, "helpers.ts"))).toBe(true);
    expect(existsSync(join(webhookDir, "validators.d.ts"))).toBe(true);
    expect(existsSync(join(webhookDir, "index.ts"))).toBe(true);

    // Verify validators.js content
    const validatorsContent = readFileSync(join(webhookDir, "validators.js"), "utf8");
    expect(validatorsContent).toContain("userCreatedWebhookValidator");
    expect(validatorsContent).toContain("orderUpdatedWebhookValidator");
    expect(validatorsContent).toContain("export const");

    // Verify helpers.ts content
    const helpersContent = readFileSync(join(webhookDir, "helpers.ts"), "utf8");
    expect(helpersContent).toContain("WebhookValidator");
    expect(helpersContent).toContain("WebhookValidationResult");
    expect(helpersContent).toContain("validateUserCreatedWebhook");
    expect(helpersContent).toContain("validateOrderUpdatedWebhook");
    expect(helpersContent).toContain("validateWebhookData");
    expect(helpersContent).toContain("getWebhookNames");
    expect(helpersContent).toContain("isValidWebhookName");

    // Verify type definitions content
    const typesContent = readFileSync(join(webhookDir, "validators.d.ts"), "utf8");
    expect(typesContent).toContain("userCreatedWebhookValidator");
    expect(typesContent).toContain("orderUpdatedWebhookValidator");
    expect(typesContent).toContain("export function");

    // Verify index.ts content
    const indexContent = readFileSync(join(webhookDir, "index.ts"), "utf8");
    expect(indexContent).toContain("export * from './helpers");
    expect(indexContent).toContain("WebhookValidator");
    expect(indexContent).toContain("WebhookValidationResult");
  });

  test("should generate webhook validators with CommonJS output", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {
        simpleWebhook: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" }
                    },
                    required: ["message"]
                  }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-cjs.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    const outputDir = join(tempDir, "generated-cjs");
    await generateWebhookValidators(
      parsedSchema,
      false,
      undefined,
      "commonjs", // CommonJS output
      false, // not ESM
      [outputDir],
      { parser: "typescript" }
    );

    // Verify CommonJS format in helpers
    const helpersContent = readFileSync(join(outputDir, "webhooks", "helpers.ts"), "utf8");
    expect(helpersContent).toContain("require('./validators')");
    expect(helpersContent).not.toContain("import {");

    // Verify that validators.d.ts is not generated for CommonJS
    expect(existsSync(join(outputDir, "webhooks", "validators.d.ts"))).toBe(false);
  });

  test("should handle webhook validators with format validation", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API with Formats",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {
        eventWebhook: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      email: { type: "string", format: "email" },
                      timestamp: { type: "string", format: "date-time" },
                      url: { type: "string", format: "uri" }
                    },
                    required: ["email", "timestamp"]
                  }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-formats.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    const outputDir = join(tempDir, "generated-formats");
    await generateWebhookValidators(
      parsedSchema,
      true, // addFormats = true
      { mode: "fast" }, // formatOptions
      "module",
      true,
      [outputDir],
      { parser: "typescript" }
    );

    // Verify that format validation is included
    const validatorsContent = readFileSync(join(outputDir, "webhooks", "validators.js"), "utf8");
    expect(validatorsContent).toContain("eventWebhookWebhookValidator");
  });

  test("should handle multiple output directories", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Multi-output Test",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {
        testWebhook: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-multi.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    const outputDir1 = join(tempDir, "output1");
    const outputDir2 = join(tempDir, "output2");
    
    await generateWebhookValidators(
      parsedSchema,
      false,
      undefined,
      "module",
      true,
      [outputDir1, outputDir2], // Multiple output directories
      { parser: "typescript" }
    );

    // Verify files exist in both directories
    for (const outputDir of [outputDir1, outputDir2]) {
      const webhookDir = join(outputDir, "webhooks");
      expect(existsSync(join(webhookDir, "validators.js"))).toBe(true);
      expect(existsSync(join(webhookDir, "helpers.ts"))).toBe(true);
      expect(existsSync(join(webhookDir, "validators.d.ts"))).toBe(true);
      expect(existsSync(join(webhookDir, "index.ts"))).toBe(true);
    }
  });

  test("should handle schema with no webhooks gracefully", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "No Webhooks API",
        version: "1.0.0"
      },
      paths: {},
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" }
            }
          }
        }
      }
      // No webhooks property
    };

    const specPath = join(tempDir, "openapi-spec-no-webhooks.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    const outputDir = join(tempDir, "generated-no-webhooks");
    
    // Should not throw an error and should not generate webhook files
    await generateWebhookValidators(
      parsedSchema,
      false,
      undefined,
      "module",
      true,
      [outputDir],
      { parser: "typescript" }
    );

    // Webhook directory should not exist
    const webhookDir = join(outputDir, "webhooks");
    expect(existsSync(webhookDir)).toBe(false);
  });

  test("should handle empty webhooks object gracefully", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Empty Webhooks API",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {} // Empty webhooks object
    };

    const specPath = join(tempDir, "openapi-spec-empty-webhooks.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    const outputDir = join(tempDir, "generated-empty-webhooks");
    
    // Should not throw an error and should not generate webhook files
    await generateWebhookValidators(
      parsedSchema,
      false,
      undefined,
      "module",
      true,
      [outputDir],
      { parser: "typescript" }
    );

    // Webhook directory should not exist
    const webhookDir = join(outputDir, "webhooks");
    expect(existsSync(webhookDir)).toBe(false);
  });

  test("should generate validators with complex webhook schemas", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Complex Webhooks API",
        version: "1.0.0"
      },
      paths: {},
      components: {
        schemas: {
          BaseEvent: {
            type: "object",
            properties: {
              eventId: { type: "string" },
              timestamp: { type: "string", format: "date-time" }
            },
            required: ["eventId", "timestamp"]
          }
        }
      },
      webhooks: {
        complexWebhook: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/BaseEvent" },
                      {
                        type: "object",
                        properties: {
                          eventType: { type: "string", enum: ["create", "update", "delete"] },
                          payload: {
                            oneOf: [
                              {
                                type: "object",
                                properties: {
                                  userId: { type: "string" },
                                  action: { const: "user_action" }
                                }
                              },
                              {
                                type: "object",
                                properties: {
                                  orderId: { type: "string" },
                                  action: { const: "order_action" }
                                }
                              }
                            ]
                          }
                        },
                        required: ["eventType", "payload"]
                      }
                    ]
                  }
                }
              }
            },
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        processed: { type: "boolean" },
                        errors: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["processed"]
                    }
                  }
                }
              },
              "400": {
                description: "Bad Request",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        error: { type: "string" },
                        details: { type: "object" }
                      }
                    }
                  }
                }
              }
            }
          },
          put: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      updateData: { type: "object" },
                      version: { type: "integer", minimum: 1 }
                    },
                    required: ["updateData", "version"]
                  }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-complex.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
      enableConditionalSchemas: true,
      enableConstKeyword: true,
      enableEnhancedDiscriminator: true,
    });

    const outputDir = join(tempDir, "generated-complex");
    await generateWebhookValidators(
      parsedSchema,
      false,
      undefined,
      "module",
      true,
      [outputDir],
      { parser: "typescript" }
    );

    // Verify complex webhook validator was generated
    const validatorsContent = readFileSync(join(outputDir, "webhooks", "validators.js"), "utf8");
    expect(validatorsContent).toContain("complexWebhookWebhookValidator");

    const helpersContent = readFileSync(join(outputDir, "webhooks", "helpers.ts"), "utf8");
    expect(helpersContent).toContain("validateComplexWebhookWebhook");
    expect(helpersContent).toContain("complexWebhook");
  });

  test("should validate generated webhook validator functionality", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Validation Test API",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {
        testValidation: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      count: { type: "integer", minimum: 0 },
                      active: { type: "boolean" }
                    },
                    required: ["id", "count"]
                  }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-validation.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    const outputDir = join(tempDir, "generated-validation");
    await generateWebhookValidators(
      parsedSchema,
      false,
      undefined,
      "module",
      true,
      [outputDir],
      { parser: "typescript" }
    );

    // Verify the structure of generated helpers
    const helpersContent = readFileSync(join(outputDir, "webhooks", "helpers.ts"), "utf8");
    
    // Check for proper interface definitions
    expect(helpersContent).toContain("interface WebhookValidator");
    expect(helpersContent).toContain("interface WebhookValidationResult");
    
    // Check for validation function
    expect(helpersContent).toContain("validateTestValidationWebhook");
    expect(helpersContent).toContain("validateWebhookData");
    
    // Check for utility functions
    expect(helpersContent).toContain("getWebhookNames");
    expect(helpersContent).toContain("isValidWebhookName");
    
    // Check for proper error handling structure
    expect(helpersContent).toContain("isValid: false");
    expect(helpersContent).toContain("errors:");
    expect(helpersContent).toContain("instancePath");
    expect(helpersContent).toContain("message");
  });
});