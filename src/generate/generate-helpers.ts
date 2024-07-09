import * as prettier from "prettier";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export function generateHelpers(
	prettierOptions: prettier.Options,
	outDirs: string[],
) {
	const helpers = prettier.format(helpersTemplate, prettierOptions);

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
