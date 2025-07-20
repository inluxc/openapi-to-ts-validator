import Ajv from "ajv";
import type { FormatsPluginOptions } from "ajv-formats";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import * as prettier from "prettier";
import type { ValidatorOutput } from "../GenerateOptions";
import type { ParsedSchema } from "../parse-schema";
import { createValidatorName } from "./generation-utils";

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
export async function generateWebhookValidators(
  schema: ParsedSchema,
  addFormats: boolean,
  formatOptions: FormatsPluginOptions | undefined,
  output: ValidatorOutput,
  esm: boolean,
  outDirs: string[],
  prettierOptions: prettier.Options
): Promise<void> {
  if (!schema.webhooks || Object.keys(schema.webhooks).length === 0) {
    return; // No webhooks to process
  }

  // Generate standalone webhook validators
  const webhookValidatorsOutput = await generateStandaloneWebhookValidators(
    schema,
    addFormats,
    formatOptions,
    output,
    prettierOptions
  );

  // Generate webhook helper functions
  const webhookHelpersOutput = await generateWebhookHelpers(
    schema,
    output,
    esm,
    prettierOptions
  );

  // Generate webhook type definitions if using modules
  const webhookTypesOutput = output === "module" 
    ? await generateWebhookTypeDefinitions(schema, prettierOptions)
    : null;

  // Write files to output directories
  for (const outDir of outDirs) {
    const webhookDir = path.join(outDir, "webhooks");
    mkdirSync(webhookDir, { recursive: true });

    // Write validators
    writeFileSync(
      path.join(webhookDir, "validators.js"), 
      webhookValidatorsOutput
    );

    // Write helpers
    writeFileSync(
      path.join(webhookDir, "helpers.ts"), 
      webhookHelpersOutput
    );

    // Write type definitions for modules
    if (webhookTypesOutput) {
      writeFileSync(
        path.join(webhookDir, "validators.d.ts"), 
        webhookTypesOutput
      );
    }

    // Write index file for easy imports
    const indexOutput = await generateWebhookIndex(output, esm, prettierOptions);
    writeFileSync(
      path.join(webhookDir, "index.ts"), 
      indexOutput
    );
  }
}

/**
 * Generates standalone webhook validators using AJV
 * @param schema Parsed schema with webhooks
 * @param formats Whether to add format validation
 * @param formatOptions Format validation options
 * @param output Validator output format
 * @param prettierOptions Prettier formatting options
 * @returns Generated validator code
 */
async function generateStandaloneWebhookValidators(
  schema: ParsedSchema,
  formats: boolean,
  formatOptions: FormatsPluginOptions | undefined,
  output: ValidatorOutput,
  prettierOptions: prettier.Options
): Promise<string> {
  // Configure AJV for OpenAPI 3.1 webhook validation
  const ajvOptions: any = { 
    code: { source: true }, 
    strict: false,
    allowUnionTypes: true,
    discriminator: true,
    nullable: true
  };
  
  const ajv = new Ajv(ajvOptions);
  
  if (formats) {
    addFormats(ajv, formatOptions);
  }

  // Create a combined schema with webhook definitions
  const webhookSchemas: Record<string, any> = {};
  
  if (schema.webhooks) {
    for (const [webhookName, webhookSchema] of Object.entries(schema.webhooks)) {
      webhookSchemas[webhookName] = webhookSchema;
    }
  }

  // Compile the webhook schemas
  const combinedSchema = {
    type: "object",
    definitions: {
      ...schema.definitions,
      ...webhookSchemas
    }
  };

  ajv.compile(combinedSchema);

  // Generate validator references for each webhook
  const refs: Record<string, string> = {};
  
  if (schema.webhooks) {
    for (const webhookName of Object.keys(schema.webhooks)) {
      refs[createWebhookValidatorName(webhookName)] = `#/definitions/${webhookName}`;
    }
  }

  let jsOutput = standaloneCode(ajv, refs);

  // Convert to ES modules if needed
  if (output === "module") {
    jsOutput = jsOutput.replace(
      /exports\.(\w+) = (\w+)/gm,
      "export const $1 = $2"
    );
  }

  const rawValidatorsOutput = webhookValidatorsTemplate.replace(
    /\$Validators/g,
    jsOutput
  );

  return await prettier.format(rawValidatorsOutput, prettierOptions);
}

/**
 * Generates webhook helper functions for validation
 * @param schema Parsed schema with webhooks
 * @param output Validator output format
 * @param esm Whether to use ES modules
 * @param prettierOptions Prettier formatting options
 * @returns Generated helper code
 */
async function generateWebhookHelpers(
  schema: ParsedSchema,
  output: ValidatorOutput,
  esm: boolean,
  prettierOptions: prettier.Options
): Promise<string> {
  if (!schema.webhooks) {
    return await prettier.format("// No webhooks defined", prettierOptions);
  }

  const webhookNames = Object.keys(schema.webhooks);
  const importExtension = esm ? ".js" : "";
  
  // Generate validator imports
  const validatorImports = webhookNames
    .map(name => createWebhookValidatorName(name))
    .join(", ");

  const validatorImportStatement = output === "module" 
    ? `import { ${validatorImports} } from './validators${importExtension}';`
    : `const { ${validatorImports} } = require('./validators');`;

  // Generate webhook validation functions
  const webhookValidationFunctions = webhookNames
    .map(webhookName => generateWebhookValidationFunction(webhookName, schema.webhooks![webhookName]))
    .join("\n\n");

  const rawHelpersOutput = webhookHelpersTemplate
    .replace(/\$ValidatorImports/g, validatorImportStatement)
    .replace(/\$WebhookValidationFunctions/g, webhookValidationFunctions)
    .replace(/\$WebhookNames/g, JSON.stringify(webhookNames));

  return await prettier.format(rawHelpersOutput, prettierOptions);
}

/**
 * Generates validation function for a specific webhook
 * @param webhookName Name of the webhook
 * @param webhookSchema Schema definition for the webhook
 * @returns Generated validation function code
 */
function generateWebhookValidationFunction(webhookName: string, webhookSchema: any): string {
  const validatorName = createWebhookValidatorName(webhookName);
  const functionName = `validate${capitalizeFirst(webhookName)}Webhook`;
  
  return `
/**
 * Validates ${webhookName} webhook data
 * @param data Data to validate
 * @returns Validation result
 */
export function ${functionName}(data: unknown): WebhookValidationResult {
  const validator = ${validatorName} as WebhookValidator;
  
  if (validator(data)) {
    return {
      isValid: true,
      data: data
    };
  }

  const errors = validator.errors?.map(error => 
    \`\${error.instancePath}: \${error.message}\`
  ) || ['Unknown validation error'];

  return {
    isValid: false,
    errors: errors
  };
}`;
}

/**
 * Generates TypeScript type definitions for webhook validators
 * @param schema Parsed schema with webhooks
 * @param prettierOptions Prettier formatting options
 * @returns Generated type definitions
 */
async function generateWebhookTypeDefinitions(
  schema: ParsedSchema,
  prettierOptions: prettier.Options
): Promise<string> {
  if (!schema.webhooks) {
    return await prettier.format("// No webhook type definitions", prettierOptions);
  }

  const webhookNames = Object.keys(schema.webhooks);
  
  const typeDefinitions = webhookNames
    .map(name => `export function ${createWebhookValidatorName(name)}(json: unknown): boolean;`)
    .join("\n");

  return await prettier.format(typeDefinitions, prettierOptions);
}

/**
 * Generates index file for webhook validators
 * @param output Validator output format
 * @param esm Whether to use ES modules
 * @param prettierOptions Prettier formatting options
 * @returns Generated index file content
 */
async function generateWebhookIndex(
  output: ValidatorOutput,
  esm: boolean,
  prettierOptions: prettier.Options
): Promise<string> {
  const importExtension = esm ? ".js" : "";
  
  const indexContent = `
export * from './helpers${importExtension}';
export type { WebhookValidator, WebhookValidationResult, WebhookValidatorHelpers } from './helpers${importExtension}';
`;

  return await prettier.format(indexContent, prettierOptions);
}

/**
 * Creates a webhook validator name from webhook name
 * @param webhookName Name of the webhook
 * @returns Validator function name
 */
function createWebhookValidatorName(webhookName: string): string {
  return `${webhookName}WebhookValidator`;
}

/**
 * Capitalizes the first letter of a string
 * @param str Input string
 * @returns String with first letter capitalized
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Templates

const webhookValidatorsTemplate = `
/* eslint-disable */
// Generated webhook validators

$Validators
`;

const webhookHelpersTemplate = `
/* eslint-disable */
// Generated webhook validation helpers

$ValidatorImports

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
 * Available webhook names
 */
export const WEBHOOK_NAMES = $WebhookNames;

/**
 * Validates webhook data against the appropriate schema
 * @param webhookName Name of the webhook
 * @param data Data to validate
 * @returns Validation result
 */
export function validateWebhookData(webhookName: string, data: unknown): WebhookValidationResult {
  if (!WEBHOOK_NAMES.includes(webhookName)) {
    return {
      isValid: false,
      errors: [\`Unknown webhook: \${webhookName}\`]
    };
  }

  // Dynamic validation based on webhook name
  switch (webhookName) {
    $WebhookValidationFunctions
    default:
      return {
        isValid: false,
        errors: [\`No validator found for webhook: \${webhookName}\`]
      };
  }
}

$WebhookValidationFunctions

/**
 * Gets all available webhook names
 * @returns Array of webhook names
 */
export function getWebhookNames(): string[] {
  return [...WEBHOOK_NAMES];
}

/**
 * Checks if a webhook name is valid
 * @param webhookName Name to check
 * @returns True if webhook name is valid
 */
export function isValidWebhookName(webhookName: string): boolean {
  return WEBHOOK_NAMES.includes(webhookName);
}
`;