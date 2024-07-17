import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import { ValidatorOutput } from "../GenerateOptions";

export async function generateMetaFile(
  definitionNames: string[],
  outDirs: string[],
  prettierOptions: prettier.Options,
  esm: boolean
): Promise<void> {
  const metas = definitionNames
    .map((definitionName) => {
      return `${definitionName}: info<${definitionName}>('${definitionName}', '#/definitions/${definitionName}'),`;
    })
    .join("\n");

  const rawOutput = metaTemplate(esm)
    .replace(/\$Definitions/g, metas)
    .replace(/\$ModelImports/g, definitionNames.join(", "));

  const output = await prettier.format(rawOutput, prettierOptions);

  for (const outDir of outDirs) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "meta.ts"), output);
  }
}

const metaTemplate = (esm: boolean) => {
  const importExtension = esm ? ".js" : "";
  return `
/* eslint-disable */
import type { $ModelImports } from './models${importExtension}';

export const schemaDefinitions = {
  $Definitions
}

export interface SchemaInfo<T> {
  definitionName: string;
  schemaRef: string;
}

function info<T>(definitionName: string, schemaRef: string): SchemaInfo<T> {
  return { definitionName, schemaRef };
}
`;
};
