import { parseSchema } from "../../src/parse-schema";
import { generateModels } from "../../src/generate/generate-models";
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Webhook Integration Tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `webhook-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test("should parse and generate types for OpenAPI 3.1 spec with webhooks", async () => {
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
          },
          Order: {
            type: "object",
            properties: {
              orderId: { type: "string" },
              userId: { type: "string" },
              amount: { type: "number" },
              status: { type: "string", enum: ["pending", "completed", "cancelled"] }
            },
            required: ["orderId", "userId", "amount", "status"]
          }
        }
      },
      webhooks: {
        userCreated: {
          post: {
            requestBody: {
              description: "User creation webhook payload",
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
                description: "Webhook received successfully",
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
        orderStatusChanged: {
          post: {
            requestBody: {
              description: "Order status change webhook payload",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Order" },
                      {
                        type: "object",
                        properties: {
                          previousStatus: { type: "string" },
                          timestamp: { type: "string", format: "date-time" }
                        },
                        required: ["previousStatus", "timestamp"]
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
                        acknowledged: { type: "boolean" }
                      }
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
                        code: { type: "integer" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        dataSync: {
          get: {
            parameters: [
              {
                name: "syncId",
                in: "query",
                required: true,
                schema: { type: "string" },
                description: "Synchronization identifier"
              },
              {
                name: "includeMetadata",
                in: "query",
                required: false,
                schema: { type: "boolean", default: false }
              }
            ],
            responses: {
              "200": {
                description: "Sync data",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: { type: "array", items: { type: "object" } },
                        metadata: { type: "object" }
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      syncData: { type: "array", items: { type: "object" } },
                      batchId: { type: "string" }
                    },
                    required: ["syncData", "batchId"]
                  }
                }
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
      strictNullHandling: true,
      enableConditionalSchemas: true,
      enablePrefixItems: true,
      enableConstKeyword: true,
      enableEnhancedDiscriminator: true,
    });

    // Verify that webhooks were parsed
    expect(parsedSchema.version.isVersion31).toBe(true);
    expect(parsedSchema.webhooks).toBeDefined();
    expect(Object.keys(parsedSchema.webhooks!)).toHaveLength(3);
    expect(parsedSchema.webhooks).toHaveProperty("userCreated");
    expect(parsedSchema.webhooks).toHaveProperty("orderStatusChanged");
    expect(parsedSchema.webhooks).toHaveProperty("dataSync");

    // Verify webhook structure
    const userCreatedWebhook = parsedSchema.webhooks!.userCreated;
    expect(userCreatedWebhook.type).toBe("object");
    expect(userCreatedWebhook.title).toBe("UserCreatedWebhook");
    expect(userCreatedWebhook.properties).toHaveProperty("post");

    const dataSyncWebhook = parsedSchema.webhooks!.dataSync;
    expect(dataSyncWebhook.properties).toHaveProperty("get");
    expect(dataSyncWebhook.properties).toHaveProperty("post");

    // Generate TypeScript models
    const outputDir = join(tempDir, "generated");
    await generateModels(
      parsedSchema,
      { skipSchemaFile: false },
      { parser: "typescript" },
      [outputDir]
    );

    // Verify that models.ts was generated
    const modelsPath = join(outputDir, "models.ts");
    expect(() => readFileSync(modelsPath, "utf8")).not.toThrow();

    const generatedModels = readFileSync(modelsPath, "utf8");

    // Verify that component schemas are included
    expect(generatedModels).toContain("export interface User");
    expect(generatedModels).toContain("export interface Order");

    // Verify that webhook interfaces are included
    expect(generatedModels).toContain("UserCreatedWebhook");
    expect(generatedModels).toContain("OrderStatusChangedWebhook");
    expect(generatedModels).toContain("DataSyncWebhook");

    // Verify webhook structure in generated types
    expect(generatedModels).toContain("post");
    expect(generatedModels).toContain("requestBody");
    expect(generatedModels).toContain("responses");

    // Verify that schema.json was also generated
    const schemaPath = join(outputDir, "schema.json");
    expect(() => readFileSync(schemaPath, "utf8")).not.toThrow();

    const generatedSchema = JSON.parse(readFileSync(schemaPath, "utf8"));
    expect(generatedSchema.definitions).toHaveProperty("User");
    expect(generatedSchema.definitions).toHaveProperty("Order");
  });

  test("should handle webhook reference resolution to shared components", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API with Webhook References",
        version: "1.0.0"
      },
      paths: {},
      components: {
        schemas: {
          WebhookPayload: {
            type: "object",
            properties: {
              eventType: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
              data: { type: "object" }
            },
            required: ["eventType", "timestamp", "data"]
          },
          WebhookResponse: {
            type: "object",
            properties: {
              received: { type: "boolean" },
              processedAt: { type: "string", format: "date-time" }
            },
            required: ["received"]
          }
        }
      },
      webhooks: {
        genericEvent: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/WebhookPayload"
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
                      $ref: "#/components/schemas/WebhookResponse"
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-with-refs.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    expect(parsedSchema.webhooks).toBeDefined();
    expect(parsedSchema.webhooks).toHaveProperty("genericEvent");

    // Verify that component schemas are properly included
    expect(parsedSchema.definitions).toHaveProperty("WebhookPayload");
    expect(parsedSchema.definitions).toHaveProperty("WebhookResponse");

    // Generate models and verify references are resolved
    const outputDir = join(tempDir, "generated-refs");
    await generateModels(
      parsedSchema,
      { skipSchemaFile: false },
      { parser: "typescript" },
      [outputDir]
    );

    const generatedModels = readFileSync(join(outputDir, "models.ts"), "utf8");
    expect(generatedModels).toContain("export interface WebhookPayload");
    expect(generatedModels).toContain("export interface WebhookResponse");
    expect(generatedModels).toContain("GenericEventWebhook");
  });

  test("should handle webhook parsing with disabled webhook support", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {
        testWebhook: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object" }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-disabled.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: false,
    });

    // Webhooks should not be processed when disabled
    expect(parsedSchema.webhooks).toBeUndefined();
  });

  test("should handle invalid webhook configurations gracefully", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API with Invalid Webhooks",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {
        invalidWebhook: {
          invalidMethod: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object" }
                }
              }
            }
          }
        }
      }
    };

    const specPath = join(tempDir, "openapi-spec-invalid.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    // Should throw an error due to invalid webhook configuration
    await expect(parseSchema(specPath, "json", {
      enableWebhooks: true,
    })).rejects.toThrow("Invalid webhook configuration");
  });

  test("should handle empty webhook definitions", async () => {
    const openApiSpec = {
      openapi: "3.1.0",
      info: {
        title: "Test API with Empty Webhooks",
        version: "1.0.0"
      },
      paths: {},
      webhooks: {}
    };

    const specPath = join(tempDir, "openapi-spec-empty.json");
    writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));

    const parsedSchema = await parseSchema(specPath, "json", {
      enableWebhooks: true,
    });

    // Should handle empty webhooks gracefully
    expect(parsedSchema.webhooks).toEqual({});
  });
});