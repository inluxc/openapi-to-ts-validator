import type { FormatsPluginOptions } from "ajv-formats";
import * as prettier from "prettier";
import type { ValidatorOutput } from "../GenerateOptions";
import type { ParsedSchema } from "../parse-schema";
export declare function generateStandaloneDecoders(definitionNames: string[], schema: ParsedSchema, addFormats: boolean, formatOptions: FormatsPluginOptions | undefined, output: ValidatorOutput, esm: boolean, outDirs: string[], prettierOptions: prettier.Options): Promise<void>;
export declare function generateStandaloneMergedDecoders(definitionNames: string[], schema: ParsedSchema, addFormats: boolean, formatOptions: FormatsPluginOptions | undefined, output: ValidatorOutput, esm: boolean, outDirs: string[], prettierOptions: prettier.Options): Promise<void>;
