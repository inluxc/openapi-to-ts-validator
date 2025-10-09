import type { FormatsPluginOptions } from "ajv-formats";
import type { Options } from "prettier";
import type { SchemaType } from "./parse-schema";
export type ValidatorOutput = "module" | "commonjs";
export interface StandaloneOptions {
    /**
     * Merge decoders into a single file
     * This will reduce the build size, but might increase the time it takes to treeshake the bundle
     * Only works for standalone builds
     */
    mergeDecoders?: boolean;
    /**
     * JS format of the validators We can't generate TS yet. Ajv doesn't support it.
     */
    validatorOutput: ValidatorOutput;
}
export interface OpenAPI31ParseOptions {
    /** Enable webhook processing */
    enableWebhooks?: boolean;
    /** Strict null handling for type arrays */
    strictNullHandling?: boolean;
    /** Enable conditional schemas (if/then/else) */
    enableConditionalSchemas?: boolean;
    /** Enable prefixItems keyword support */
    enablePrefixItems?: boolean;
    /** Enable unevaluatedProperties keyword support */
    enableUnevaluatedProperties?: boolean;
    /** Enable const keyword support */
    enableConstKeyword?: boolean;
    /** Enable contains keyword support */
    enableContainsKeyword?: boolean;
    /** Enable enhanced discriminator support */
    enableEnhancedDiscriminator?: boolean;
    /** Fallback to OpenAPI 3.0 processing if 3.1 fails */
    fallbackToOpenAPI30?: boolean;
}
export interface GenerateOptions {
    /** file location of the schema */
    schemaFile: string;
    schemaType: SchemaType;
    /** location(s) where the output files will be stored. */
    directory: string | string[];
    /**
     * adds the "ajv-formats" packages
     * @default false
     */
    addFormats?: boolean;
    /**
     * Options send to add the addFormats
     * @default undefined
     */
    formatOptions?: FormatsPluginOptions;
    /**
     * @default prettier typescript options
     */
    prettierOptions?: Options;
    /**
     * list of definitions to generate decoders for
     * @default generates decoder for every element
     */
    decoders?: string[];
    /**
     * Generates all validators up front.
     * Read more about it at the AJV 7 upgrade: https://openjsf.org/blog/2021/02/11/project-news-ajv-version-7-big-changes-and-improvements/
     * @default undefined
     */
    standalone?: StandaloneOptions;
    /**
     * don't output the meta file
     */
    skipMetaFile?: boolean;
    /**
     * don't output the schema file
     */
    skipSchemaFile?: boolean;
    /**
     * don't output decoder files
     */
    skipDecoders?: boolean;
    /**
     * when this option is enabled, standaloneOptions.validatorOutput is automatically set to "module"
     */
    esm?: boolean;
    debug?: boolean;
    /**
     * OpenAPI 3.1 specific parsing options
     */
    openapi31?: OpenAPI31ParseOptions;
}
