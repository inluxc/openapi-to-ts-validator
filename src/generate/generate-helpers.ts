import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as prettier from "prettier";

export async function generateHelpers(
  prettierOptions: prettier.Options,
  outDirs: string[]
) {
  const helpers = await prettier.format(helpersTemplate, prettierOptions);

  for (const outDir of outDirs) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "helpers.ts"), helpers);
  }
}

const helpersTemplate = `
/* eslint-disable */

export interface Decoder<T> {
  definitionName: string;
  schemaRef: string;
  decode: (json: unknown) => T;
}
`;
