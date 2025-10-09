import * as prettier from "prettier";
import type { GenerateOptions } from "../GenerateOptions";
import type { ParsedSchema } from "../parse-schema";
export declare function generateModels(schema: ParsedSchema, options: Pick<GenerateOptions, "skipSchemaFile">, prettierOptions: prettier.Options, outDirs: string[]): Promise<void>;
