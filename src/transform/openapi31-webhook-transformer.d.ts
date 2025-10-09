import type { JSONSchema } from "json-schema-to-typescript";
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
export declare function transformWebhooks(webhooks: any): WebhookTransformResult;
/**
 * Checks if a schema contains webhook definitions
 * @param schema Schema object to check
 * @returns True if webhooks are present
 */
export declare function hasWebhooks(schema: any): boolean;
/**
 * Extracts webhook names from a schema
 * @param schema Schema object
 * @returns Array of webhook names
 */
export declare function extractWebhookNames(schema: any): string[];
/**
 * Validates webhook configuration
 * @param webhooks Webhooks object to validate
 * @returns Validation result with any errors
 */
export declare function validateWebhookConfig(webhooks: any): {
    isValid: boolean;
    errors: string[];
};
/**
 * Creates a webhook schema for testing purposes
 * @param webhookName Name of the webhook
 * @param methods HTTP methods to include
 * @returns Test webhook schema
 */
export declare function createWebhookSchema(webhookName: string, methods?: string[]): any;
