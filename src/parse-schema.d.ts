import type { JSONSchema } from "json-schema-to-typescript";
import { type OpenAPIVersionInfo } from "./version-detection";
import type { OpenAPI31ParseOptions } from "./GenerateOptions";
export type SchemaType = "yaml" | "json" | "custom";
export interface ParsedSchema {
    json: string;
    definitions: Record<string, JSONSchema>;
    whitelistedDecoders: string[] | undefined;
    webhooks?: Record<string, any>;
    version: OpenAPIVersionInfo;
}
export declare function parseSchema(inputFilePath: string, schemaType: SchemaType, options?: OpenAPI31ParseOptions): Promise<ParsedSchema>;
