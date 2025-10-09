import type { FormatsPluginOptions } from "ajv-formats";
import * as prettier from "prettier";
import type { ValidatorOutput } from "../GenerateOptions";
import type { ParsedSchema } from "../parse-schema";
/**
 * Webhook validator function interface
 */
export interface WebhookValidator {
    (json: unknown): boolean;
    errors?: any[] | null;
}
/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
    isValid: boolean;
    data?: any;
    errors?: string[];
}
/**
 * Webhook validator helper functions interface
 */
export interface WebhookValidatorHelpers {
    validateWebhookRequest: (webhookName: string, method: string, data: unknown) => WebhookValidationResult;
    validateWebhookResponse: (webhookName: string, method: string, statusCode: string, data: unknown) => WebhookValidationResult;
    getWebhookValidator: (webhookName: string, method: string, type: 'request' | 'response', statusCode?: string) => WebhookValidator | null;
}
/**
 * Generates webhook validators for OpenAPI 3.1 specifications
 * @param schema Parsed schema containing webhook definitions
 * @param addFormats Whether to add format validation
 * @param formatOptions Format validation options
 * @param output Validator output format
 * @param esm Whether to use ES modules
 * @param outDirs Output directories
 * @param prettierOptions Prettier formatting options
 */
export declare function generateWebhookValidators(schema: ParsedSchema, addFormats: boolean, formatOptions: FormatsPluginOptions | undefined, output: ValidatorOutput, esm: boolean, outDirs: string[], prettierOptions: prettier.Options): Promise<void>;
