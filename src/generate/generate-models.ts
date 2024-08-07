import { compile } from "json-schema-to-typescript";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import type { GenerateOptions } from "../GenerateOptions";
import type { ParsedSchema } from "../parse-schema";

export async function generateModels(
  schema: ParsedSchema,
  options: Pick<GenerateOptions, "skipSchemaFile">,
  prettierOptions: prettier.Options,
  outDirs: string[]
): Promise<void> {
  const compiledTypescriptModels = await compile(
    JSON.parse(schema.json),
    "Schema"
  );
  const rawTypescriptModels = modelsFileTemplate
    .replace(/\$Models/g, compiledTypescriptModels)
    .replace(/\s*\[k: string\]: unknown;/g, "") // Allow additional properties in schema but not in typescript
    .replace(/export interface Schema \{[^]*?\n\}/, "");

  const typescriptModels = await prettier.format(
    rawTypescriptModels,
    prettierOptions
  );

  for (const outDir of outDirs) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "models.ts"), typescriptModels);
    if (options.skipSchemaFile !== true) {
      writeFileSync(path.join(outDir, "schema.json"), schema.json);
    }
  }
}

const modelsFileTemplate = `
$Models
`;
