import type { FormatsPluginOptions } from "ajv-formats";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import { createDecoderName } from "./generation-utils";

export async function generateCompileBasedDecoders(
  definitionNames: string[],
  addFormats: boolean,
  formatOptions: FormatsPluginOptions | undefined,
  outDirs: string[],
  prettierOptions: prettier.Options,
): Promise<void> {
  const decoders = definitionNames
    .map((definitionName) =>
      decoderTemplate
        .replace(/\$DecoderName/g, createDecoderName(definitionName))
        .replace(/\$Class/g, definitionName)
        .trim(),
    )
    .join("\n");

  const rawDecoderOutput = decodersFileTemplate
    .replace(
      /\$Imports/g,
      addFormats ? 'import addFormats from "ajv-formats"' : "",
    )
    .replace(
      /\$Formats/g,
      addFormats
        ? `addFormats(ajv, ${
            formatOptions ? JSON.stringify(formatOptions) : "undefined"
          });`
        : "",
    )
    .replace(/\$ModelImports/g, definitionNames.join(", "))
    .replace(/\$Decoders/g, decoders);

  const decoderOutput = await prettier.format(
    rawDecoderOutput,
    prettierOptions,
  );

  for (const outDir of outDirs) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "decoders.ts"), decoderOutput);
  }
}

const decodersFileTemplate = `
/* eslint-disable */

import Ajv from 'ajv';
$Imports
import type { Decoder } from './helpers';
import { validateJson } from './validate';
import type { $ModelImports } from './models';
import jsonSchema from './schema.json' assert { type: 'json' };

export const ajv = new Ajv({ strict: false });
$Formats
ajv.compile(jsonSchema);

// Decoders
$Decoders
`;

const decoderTemplate = `
export const $DecoderName: Decoder<$Class> = {
  definitionName: '$Class',
  schemaRef: '#/definitions/$Class',

  decode(json: unknown): $Class {
    const schema = ajv.getSchema($DecoderName.schemaRef);
    if (!schema) {
      throw new Error(\`Schema \${$DecoderName.definitionName} not found\`);
    }
    return validateJson(json, schema, $DecoderName.definitionName);
  }
}
`;
