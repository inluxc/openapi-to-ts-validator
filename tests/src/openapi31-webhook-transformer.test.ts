import {
  transformWebhooks,
  hasWebhooks,
  extractWebhookNames,
  validateWebhookConfig,
  createWebhookSchema,
} from "../../src/transform/openapi31-webhook-transformer";

describe("OpenAPI 3.1 Webhook Transformer", () => {
  describe("hasWebhooks", () => {
    test("should return true for schema with webhooks", () => {
      const schema = {
        openapi: "3.1.0",
        webhooks: {
          userCreated: {
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

      expect(hasWebhooks(schema)).toBe(true);
    });

    test("should return false for schema without webhooks", () => {
      const schema = {
        openapi: "3.1.0",
        paths: {}
      };

      expect(hasWebhooks(schema)).toBe(false);
    });

    test("should return false for null or undefined schema", () => {
      expect(hasWebhooks(null)).toBe(false);
      expect(hasWebhooks(undefined)).toBe(false);
    });
  });

  describe("extractWebhookNames", () => {
    test("should extract webhook names from schema", () => {
      const schema = {
        webhooks: {
          userCreated: {},
          orderUpdated: {},
          paymentProcessed: {}
        }
      };

      const names = extractWebhookNames(schema);
      expect(names).toEqual(["userCreated", "orderUpdated", "paymentProcessed"]);
    });

    test("should return empty array for schema without webhooks", () => {
      const schema = { paths: {} };
      expect(extractWebhookNames(schema)).toEqual([]);
    });
  });

  describe("validateWebhookConfig", () => {
    test("should validate correct webhook configuration", () => {
      const webhooks = {
        userCreated: {
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
      };

      const result = validateWebhookConfig(webhooks);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should reject invalid HTTP methods", () => {
      const webhooks = {
        userCreated: {
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
      };

      const result = validateWebhookConfig(webhooks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid HTTP method 'invalidMethod' in webhook 'userCreated'");
    });

    test("should reject non-object webhook definitions", () => {
      const webhooks = {
        userCreated: "invalid"
      };

      const result = validateWebhookConfig(webhooks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Webhook 'userCreated' must be an object");
    });

    test("should reject non-object operation definitions", () => {
      const webhooks = {
        userCreated: {
          post: "invalid"
        }
      };

      const result = validateWebhookConfig(webhooks);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Operation 'post' in webhook 'userCreated' must be an object");
    });
  });

  describe("transformWebhooks", () => {
    test("should transform simple webhook with request body", () => {
      const webhooks = {
        userCreated: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      userId: { type: "string" },
                      email: { type: "string" }
                    },
                    required: ["userId"]
                  }
                }
              },
              required: true
            }
          }
        }
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      expect(result.webhooks).toHaveProperty("userCreated");
      
      const userCreatedWebhook = result.webhooks.userCreated;
      expect(userCreatedWebhook.type).toBe("object");
      expect(userCreatedWebhook.title).toBe("UserCreatedWebhook");
      expect(userCreatedWebhook.properties).toHaveProperty("post");
      
      const postOperation = (userCreatedWebhook.properties as any).post;
      expect(postOperation.type).toBe("object");
      expect(postOperation.properties).toHaveProperty("requestBody");
    });

    test("should transform webhook with responses", () => {
      const webhooks = {
        orderUpdated: {
          post: {
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
                        error: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      expect(result.webhooks).toHaveProperty("orderUpdated");
      
      const orderUpdatedWebhook = result.webhooks.orderUpdated;
      const postOperation = (orderUpdatedWebhook.properties as any).post;
      expect(postOperation.properties).toHaveProperty("responses");
      
      const responses = postOperation.properties.responses;
      expect(responses.properties).toHaveProperty("200");
      expect(responses.properties).toHaveProperty("400");
    });

    test("should transform webhook with parameters", () => {
      const webhooks = {
        dataSync: {
          get: {
            parameters: [
              {
                name: "userId",
                in: "query",
                required: true,
                schema: { type: "string" },
                description: "User identifier"
              },
              {
                name: "limit",
                in: "query",
                required: false,
                schema: { type: "integer", minimum: 1, maximum: 100 }
              }
            ]
          }
        }
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      const dataSyncWebhook = result.webhooks.dataSync;
      const getOperation = (dataSyncWebhook.properties as any).get;
      expect(getOperation.properties).toHaveProperty("parameters");
      
      const parameters = getOperation.properties.parameters;
      expect(parameters.properties).toHaveProperty("userId");
      expect(parameters.properties).toHaveProperty("limit");
      expect(parameters.required).toContain("userId");
      expect(parameters.required).not.toContain("limit");
    });

    test("should transform webhook with headers", () => {
      const webhooks = {
        notification: {
          post: {
            headers: {
              "X-Webhook-Signature": {
                required: true,
                schema: { type: "string" },
                description: "Webhook signature for verification"
              },
              "X-Request-ID": {
                required: false,
                schema: { type: "string" }
              }
            }
          }
        }
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      const notificationWebhook = result.webhooks.notification;
      const postOperation = (notificationWebhook.properties as any).post;
      expect(postOperation.properties).toHaveProperty("headers");
      
      const headers = postOperation.properties.headers;
      expect(headers.properties).toHaveProperty("X-Webhook-Signature");
      expect(headers.properties).toHaveProperty("X-Request-ID");
      expect(headers.required).toContain("X-Webhook-Signature");
      expect(headers.required).not.toContain("X-Request-ID");
    });

    test("should handle multiple HTTP methods in single webhook", () => {
      const webhooks = {
        resourceManagement: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object", properties: { action: { type: "string" } } }
                }
              }
            }
          },
          put: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object", properties: { update: { type: "object" } } }
                }
              }
            }
          },
          delete: {
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
              }
            ]
          }
        }
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      const resourceWebhook = result.webhooks.resourceManagement;
      expect(resourceWebhook.properties).toHaveProperty("post");
      expect(resourceWebhook.properties).toHaveProperty("put");
      expect(resourceWebhook.properties).toHaveProperty("delete");
    });

    test("should handle complex media types", () => {
      const webhooks = {
        fileUpload: {
          post: {
            requestBody: {
              content: {
                "multipart/form-data": {
                  schema: {
                    type: "object",
                    properties: {
                      file: { type: "string", format: "binary" },
                      metadata: { type: "object" }
                    }
                  }
                },
                "application/x-www-form-urlencoded": {
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
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      const fileUploadWebhook = result.webhooks.fileUpload;
      const postOperation = (fileUploadWebhook.properties as any).post;
      const requestBody = postOperation.properties.requestBody;
      
      expect(requestBody.properties).toHaveProperty("multipartFormData");
      expect(requestBody.properties).toHaveProperty("applicationXWwwFormUrlencoded");
    });

    test("should return empty result for null or invalid webhooks", () => {
      expect(transformWebhooks(null)).toEqual({ wasTransformed: false, webhooks: {} });
      expect(transformWebhooks(undefined)).toEqual({ wasTransformed: false, webhooks: {} });
      expect(transformWebhooks("invalid")).toEqual({ wasTransformed: false, webhooks: {} });
    });

    test("should skip invalid webhook definitions", () => {
      const webhooks = {
        validWebhook: {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object" }
                }
              }
            }
          }
        },
        invalidWebhook: null,
        anotherInvalidWebhook: "string"
      };

      const result = transformWebhooks(webhooks);
      
      expect(result.wasTransformed).toBe(true);
      expect(result.webhooks).toHaveProperty("validWebhook");
      expect(result.webhooks).not.toHaveProperty("invalidWebhook");
      expect(result.webhooks).not.toHaveProperty("anotherInvalidWebhook");
    });
  });

  describe("createWebhookSchema", () => {
    test("should create webhook schema with default POST method", () => {
      const schema = createWebhookSchema("testWebhook");
      
      expect(schema).toHaveProperty("testWebhook");
      expect(schema.testWebhook).toHaveProperty("post");
      expect(schema.testWebhook.post).toHaveProperty("requestBody");
      expect(schema.testWebhook.post).toHaveProperty("responses");
    });

    test("should create webhook schema with custom methods", () => {
      const schema = createWebhookSchema("testWebhook", ["get", "post", "put"]);
      
      expect(schema.testWebhook).toHaveProperty("get");
      expect(schema.testWebhook).toHaveProperty("post");
      expect(schema.testWebhook).toHaveProperty("put");
    });

    test("should create valid webhook structure", () => {
      const schema = createWebhookSchema("userEvent");
      const webhook = schema.userEvent.post;
      
      expect(webhook.requestBody.content["application/json"].schema.type).toBe("object");
      expect(webhook.requestBody.content["application/json"].schema.properties).toHaveProperty("id");
      expect(webhook.requestBody.content["application/json"].schema.properties).toHaveProperty("timestamp");
      expect(webhook.requestBody.content["application/json"].schema.properties).toHaveProperty("data");
      expect(webhook.requestBody.content["application/json"].schema.required).toContain("id");
      expect(webhook.requestBody.content["application/json"].schema.required).toContain("timestamp");
      
      expect(webhook.responses["200"].content["application/json"].schema.type).toBe("object");
      expect(webhook.responses["200"].content["application/json"].schema.properties).toHaveProperty("success");
      expect(webhook.responses["200"].content["application/json"].schema.properties).toHaveProperty("message");
      expect(webhook.responses["200"].content["application/json"].schema.required).toContain("success");
    });
  });
});