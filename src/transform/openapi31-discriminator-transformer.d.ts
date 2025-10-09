/**
 * OpenAPI 3.1 discriminator transformer
 * Handles enhanced discriminator functionality including mapping inference and nested discriminators
 */
import type { JSONSchema } from "json-schema-to-typescript";
export interface DiscriminatorInfo {
    /** The discriminator property name */
    propertyName: string;
    /** Explicit mapping from discriminator values to schema references */
    mapping?: Record<string, string>;
    /** Inferred mapping when explicit mapping is not provided */
    inferredMapping?: Record<string, string>;
    /** Whether this discriminator is nested within another schema */
    isNested?: boolean;
    /** Location of the discriminator for error reporting */
    location?: string;
}
export interface DiscriminatorTransformResult {
    /** The transformed schema */
    schema: JSONSchema;
    /** Whether the schema was modified */
    wasTransformed: boolean;
    /** Information about discriminators found and processed */
    discriminators?: DiscriminatorInfo[];
}
/**
 * Transforms OpenAPI 3.1 discriminator schemas to enhanced discriminated union types
 * @param schema The JSON Schema to transform
 * @param location Current location in schema for error reporting
 * @returns Transformation result
 */
export declare function transformDiscriminators(schema: JSONSchema, location?: string): DiscriminatorTransformResult;
/**
 * Checks if a schema contains discriminators that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains discriminators
 */
export declare function hasDiscriminators(schema: JSONSchema): boolean;
/**
 * Extracts discriminator information from a schema
 * @param schema The schema to analyze
 * @returns Array of discriminator information
 */
export declare function extractDiscriminatorInfo(schema: JSONSchema): DiscriminatorInfo[];
export declare function validateDiscriminator(discriminator: any, location: string): void;
