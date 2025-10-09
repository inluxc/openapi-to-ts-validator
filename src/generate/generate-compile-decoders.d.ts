import type { FormatsPluginOptions } from "ajv-formats";
import * as prettier from "prettier";
export declare function generateCompileBasedDecoders(definitionNames: string[], addFormats: boolean, formatOptions: FormatsPluginOptions | undefined, outDirs: string[], prettierOptions: prettier.Options): Promise<void>;
