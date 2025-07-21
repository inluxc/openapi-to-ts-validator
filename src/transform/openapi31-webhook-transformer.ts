import type { JSONSchema } from "json-schema-to-typescript";
import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";

/**
 * Result of webhook transformation
 */
export interface WebhookTransformResult {
  /** Whether any webhooks were transformed */
  wasTransformed: boolean;
  /** Transformed webhook schemas */
  webhooks: Record<string, JSONSchema>;
}

/**
 * Webhook operation schema structure
 */
export interface WebhookOperationSchema {
  requestBody?: JSONSchema;
  responses?: Record<string, JSONSchema>;
}

/**
 * Webhook schema structure
 */
export interface WebhookSchema {
  [httpMethod: string]: WebhookOperationSchema;
}

/**
 * Transforms OpenAPI 3.1 webhooks into structured JSON schemas
 * @param webhooks Raw webhooks object from OpenAPI 3.1 spec
 * @returns Transformation result with processed webhook schemas
 */
export function transformWebhooks(webhooks: any): WebhookTransformResult {
  if (!webhooks || typeof webhooks !== 'object') {
    return {
      wasTransformed: false,
      webhooks: {},
    };
  }

  const processedWebhooks: Record<string, JSONSchema> = {};
  let wasTransformed = false;

  for (const [webhookName, webhook] of Object.entries(webhooks)) {
    if (!webhook || typeof webhook !== 'object') {
      continue;
    }

    const webhookSchema = processWebhookDefinition(webhookName, webhook);
    if (webhookSchema) {
      processedWebhooks[webhookName] = webhookSchema;
      wasTransformed = true;
    }
  }

  return {
    wasTransformed,
    webhooks: processedWebhooks,
  };
}

/**
 * Processes a single webhook definition
 * @param webhookName Name of the webhook
 * @param webhook Webhook definition object
 * @returns Processed webhook schema or null if invalid
 */
function processWebhookDefinition(webhookName: string, webhook: any): JSONSchema | null {
  const webhookSchema: JSONSchema = {
    type: 'object',
    title: `${capitalizeFirst(webhookName)}Webhook`,
    description: `Webhook definition for ${webhookName}`,
    properties: {},
    additionalProperties: false,
  };

  let hasValidOperations = false;

  // Process each HTTP method in the webhook
  for (const [method, operation] of Object.entries(webhook)) {
    if (!operation || typeof operation !== 'object') {
      continue;
    }

    const operationSchema = processWebhookOperation(method, operation);
    if (operationSchema && Object.keys(operationSchema.properties || {}).length > 0) {
      (webhookSchema.properties as any)[method] = operationSchema;
      hasValidOperations = true;
    }
  }

  return hasValidOperations ? webhookSchema : null;
}

/**
 * Processes a single webhook operation (HTTP method)
 * @param method HTTP method name
 * @param operation Operation definition object
 * @returns Processed operation schema or null if invalid
 */
function processWebhookOperation(method: string, operation: any): JSONSchema | null {
  const operationSchema: JSONSchema = {
    type: 'object',
    title: `${capitalizeFirst(method)}Operation`,
    description: `${method.toUpperCase()} operation for webhook`,
    properties: {},
    additionalProperties: false,
  };

  let hasValidContent = false;

  // Process request body
  if (operation.requestBody?.content) {
    const requestBodySchema = processRequestBody(operation.requestBody);
    if (requestBodySchema) {
      (operationSchema.properties as any).requestBody = requestBodySchema;
      hasValidContent = true;
    }
  }

  // Process responses
  if (operation.responses) {
    const responsesSchema = processResponses(operation.responses);
    if (responsesSchema && Object.keys(responsesSchema.properties || {}).length > 0) {
      (operationSchema.properties as any).responses = responsesSchema;
      hasValidContent = true;
    }
  }

  // Process parameters if present
  if (operation.parameters && Array.isArray(operation.parameters)) {
    const parametersSchema = processParameters(operation.parameters);
    if (parametersSchema && Object.keys(parametersSchema.properties || {}).length > 0) {
      (operationSchema.properties as any).parameters = parametersSchema;
      hasValidContent = true;
    }
  }

  // Process headers if present
  if (operation.headers) {
    const headersSchema = processHeaders(operation.headers);
    if (headersSchema && Object.keys(headersSchema.properties || {}).length > 0) {
      (operationSchema.properties as any).headers = headersSchema;
      hasValidContent = true;
    }
  }

  return hasValidContent ? operationSchema : null;
}

/**
 * Processes request body content
 * @param requestBody Request body definition
 * @returns Processed request body schema or null if invalid
 */
function processRequestBody(requestBody: any): JSONSchema | null {
  if (!requestBody.content || typeof requestBody.content !== 'object') {
    return null;
  }

  const requestBodySchema: JSONSchema = {
    type: 'object',
    title: 'RequestBody',
    description: 'Request body content',
    properties: {},
    additionalProperties: false,
  };

  let hasValidContent = false;

  for (const [mediaType, mediaTypeObject] of Object.entries(requestBody.content)) {
    if (!mediaTypeObject || typeof mediaTypeObject !== 'object') {
      continue;
    }

    const mediaTypeSchema = (mediaTypeObject as any).schema;
    if (mediaTypeSchema) {
      try {
        // Convert OpenAPI schema to JSON Schema
        const jsonSchema = toJsonSchema(mediaTypeSchema);
        (requestBodySchema.properties as any)[normalizeMediaType(mediaType)] = jsonSchema;
        hasValidContent = true;
      } catch (error) {
        console.warn(`Failed to process request body schema for media type ${mediaType}:`, error);
      }
    }
  }

  // Add required field if request body is required
  if (requestBody.required === true && hasValidContent) {
    requestBodySchema.required = Object.keys(requestBodySchema.properties || {});
  }

  return hasValidContent ? requestBodySchema : null;
}

/**
 * Processes response definitions
 * @param responses Responses definition object
 * @returns Processed responses schema or null if invalid
 */
function processResponses(responses: any): JSONSchema | null {
  if (!responses || typeof responses !== 'object') {
    return null;
  }

  const responsesSchema: JSONSchema = {
    type: 'object',
    title: 'Responses',
    description: 'Response definitions',
    properties: {},
    additionalProperties: false,
  };

  let hasValidResponses = false;

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response || typeof response !== 'object') {
      continue;
    }

    const responseSchema = processResponse(statusCode, response);
    if (responseSchema) {
      (responsesSchema.properties as any)[statusCode] = responseSchema;
      hasValidResponses = true;
    }
  }

  return hasValidResponses ? responsesSchema : null;
}

/**
 * Processes a single response definition
 * @param statusCode HTTP status code
 * @param response Response definition object
 * @returns Processed response schema or null if invalid
 */
function processResponse(statusCode: string, response: any): JSONSchema | null {
  const responseSchema: JSONSchema = {
    type: 'object',
    title: `Response${statusCode}`,
    description: `Response for status code ${statusCode}`,
    properties: {},
    additionalProperties: false,
  };

  let hasValidContent = false;

  // Process response content
  if (response.content && typeof response.content === 'object') {
    const contentSchema: JSONSchema = {
      type: 'object',
      title: 'Content',
      description: 'Response content',
      properties: {},
      additionalProperties: false,
    };

    for (const [mediaType, mediaTypeObject] of Object.entries(response.content)) {
      if (!mediaTypeObject || typeof mediaTypeObject !== 'object') {
        continue;
      }

      const mediaTypeSchema = (mediaTypeObject as any).schema;
      if (mediaTypeSchema) {
        try {
          // Convert OpenAPI schema to JSON Schema
          const jsonSchema = toJsonSchema(mediaTypeSchema);
          (contentSchema.properties as any)[normalizeMediaType(mediaType)] = jsonSchema;
          hasValidContent = true;
        } catch (error) {
          console.warn(`Failed to process response schema for media type ${mediaType}:`, error);
        }
      }
    }

    if (hasValidContent) {
      (responseSchema.properties as any).content = contentSchema;
    }
  }

  // Process response headers
  if (response.headers && typeof response.headers === 'object') {
    const headersSchema = processHeaders(response.headers);
    if (headersSchema && Object.keys(headersSchema.properties || {}).length > 0) {
      (responseSchema.properties as any).headers = headersSchema;
      hasValidContent = true;
    }
  }

  return hasValidContent ? responseSchema : null;
}

/**
 * Processes parameter definitions
 * @param parameters Array of parameter definitions
 * @returns Processed parameters schema or null if invalid
 */
function processParameters(parameters: any[]): JSONSchema | null {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return null;
  }

  const parametersSchema: JSONSchema = {
    type: 'object',
    title: 'Parameters',
    description: 'Operation parameters',
    properties: {},
    additionalProperties: false,
  };

  let hasValidParameters = false;

  for (const parameter of parameters) {
    if (!parameter || typeof parameter !== 'object' || !parameter.name) {
      continue;
    }

    try {
      const paramSchema = parameter.schema ? toJsonSchema(parameter.schema) : { type: 'string' };
      
      // Add parameter metadata
      if (parameter.description) {
        paramSchema.description = parameter.description;
      }
      
      (parametersSchema.properties as any)[parameter.name] = paramSchema;
      hasValidParameters = true;

      // Add to required array if parameter is required
      if (parameter.required === true) {
        if (!parametersSchema.required) {
          parametersSchema.required = [];
        }
        if (Array.isArray(parametersSchema.required)) {
          parametersSchema.required.push(parameter.name);
        }
      }
    } catch (error) {
      console.warn(`Failed to process parameter ${parameter.name}:`, error);
    }
  }

  return hasValidParameters ? parametersSchema : null;
}

/**
 * Processes header definitions
 * @param headers Headers definition object
 * @returns Processed headers schema or null if invalid
 */
function processHeaders(headers: any): JSONSchema | null {
  if (!headers || typeof headers !== 'object') {
    return null;
  }

  const headersSchema: JSONSchema = {
    type: 'object',
    title: 'Headers',
    description: 'HTTP headers',
    properties: {},
    additionalProperties: false,
  };

  let hasValidHeaders = false;

  for (const [headerName, header] of Object.entries(headers)) {
    if (!header || typeof header !== 'object') {
      continue;
    }

    try {
      const headerSchema = (header as any).schema ? toJsonSchema((header as any).schema) : { type: 'string' };
      
      // Add header metadata
      if ((header as any).description) {
        headerSchema.description = (header as any).description;
      }
      
      (headersSchema.properties as any)[headerName] = headerSchema;
      hasValidHeaders = true;

      // Add to required array if header is required
      if ((header as any).required === true) {
        if (!headersSchema.required) {
          headersSchema.required = [];
        }
        if (Array.isArray(headersSchema.required)) {
          headersSchema.required.push(headerName);
        }
      }
    } catch (error) {
      console.warn(`Failed to process header ${headerName}:`, error);
    }
  }

  return hasValidHeaders ? headersSchema : null;
}

/**
 * Normalizes media type for use as property name
 * @param mediaType Media type string (e.g., "application/json")
 * @returns Normalized property name (e.g., "applicationJson")
 */
function normalizeMediaType(mediaType: string): string {
  return mediaType
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Capitalizes the first letter of a string
 * @param str Input string
 * @returns String with first letter capitalized
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if a schema contains webhook definitions
 * @param schema Schema object to check
 * @returns True if webhooks are present
 */
export function hasWebhooks(schema: any): boolean {
  return schema && typeof schema === 'object' && schema.webhooks && typeof schema.webhooks === 'object';
}

/**
 * Extracts webhook names from a schema
 * @param schema Schema object
 * @returns Array of webhook names
 */
export function extractWebhookNames(schema: any): string[] {
  if (!hasWebhooks(schema)) {
    return [];
  }

  return Object.keys(schema.webhooks);
}

/**
 * Validates webhook configuration
 * @param webhooks Webhooks object to validate
 * @returns Validation result with any errors
 */
export function validateWebhookConfig(webhooks: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!webhooks || typeof webhooks !== 'object') {
    errors.push('Webhooks must be an object');
    return { isValid: false, errors };
  }

  for (const [webhookName, webhook] of Object.entries(webhooks)) {
    if (!webhook || typeof webhook !== 'object') {
      errors.push(`Webhook '${webhookName}' must be an object`);
      continue;
    }

    // Validate HTTP methods
    const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
    for (const [method, operation] of Object.entries(webhook)) {
      if (!validMethods.includes(method.toLowerCase())) {
        errors.push(`Invalid HTTP method '${method}' in webhook '${webhookName}'`);
        continue;
      }

      if (!operation || typeof operation !== 'object') {
        errors.push(`Operation '${method}' in webhook '${webhookName}' must be an object`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a webhook schema for testing purposes
 * @param webhookName Name of the webhook
 * @param methods HTTP methods to include
 * @returns Test webhook schema
 */
export function createWebhookSchema(webhookName: string, methods: string[] = ['post']): any {
  const webhook: any = {};

  for (const method of methods) {
    webhook[method] = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                data: { type: 'object' },
              },
              required: ['id', 'timestamp'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                },
                required: ['success'],
              },
            },
          },
        },
      },
    };
  }

  return { [webhookName]: webhook };
}