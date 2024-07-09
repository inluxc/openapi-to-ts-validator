import Ajv from "ajv";
import type { FormatsPluginOptions } from "ajv-formats";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import * as prettier from "prettier";
import type { ValidatorOutput } from "../GenerateOptions";
import type { ParsedSchema } from "../parse-schema";
import { createDecoderName, createValidatorName } from "./generation-utils";

export function generateStandaloneDecoders(
	definitionNames: string[],
	schema: ParsedSchema,
	addFormats: boolean,
	formatOptions: FormatsPluginOptions | undefined,
	output: ValidatorOutput,
	esm: boolean,
	outDirs: string[],
	prettierOptions: prettier.Options,
): void {
	const indexExports: string[] = [];

	for (const definitionName of definitionNames) {
		const validatorName = createValidatorName(definitionName);
		const decoderName = createDecoderName(definitionName);

		const validatorsOutput = standAloneValidatorOutput(
			schema,
			[definitionName],
			addFormats,
			formatOptions,
			output,
			prettierOptions,
		);

		const validatorImportStatement = createValidatorImportStatement(
			validatorName,
			output,
			false,
			esm,
		);

		const rawDecoderOutput = decoderFileTemplate(esm)
			.replace(/\$DecoderName/g, decoderName)
			.replace(/\$Class/g, definitionName)
			.replace(/\$ValidatorImports/g, validatorImportStatement)
			.replace(/\$ValidatorName/g, validatorName);

		const decoderOutput = prettier.format(rawDecoderOutput, prettierOptions);

		const validatorDefinitions = validatorDefinitionsOutput(
			[definitionName],
			prettierOptions,
		);

		indexExports.push(
			`export { ${decoderName} } from './${definitionName}/decoder${
				esm ? ".js" : ""
			}';`,
		);

		for (const outDir of outDirs) {
			const decoderDir = path.join(outDir, "decoders", definitionName);
			mkdirSync(decoderDir, { recursive: true });

			writeFileSync(path.join(decoderDir, "decoder.ts"), decoderOutput);
			writeFileSync(path.join(decoderDir, "validator.js"), validatorsOutput);

			if (output === "module") {
				writeFileSync(
					path.join(decoderDir, "validator.d.ts"),
					validatorDefinitions,
				);
			}
		}
	}

	const indexOutputRaw = decodersFileTemplate.replace(
		/\$Exports/gm,
		indexExports.join("\n"),
	);

	const indexOutput = prettier.format(indexOutputRaw, prettierOptions);

	for (const outDir of outDirs) {
		const decoderDir = path.join(outDir, "decoders");
		mkdirSync(decoderDir, { recursive: true });

		writeFileSync(path.join(decoderDir, "index.ts"), indexOutput);
	}
}

export function generateStandaloneMergedDecoders(
	definitionNames: string[],
	schema: ParsedSchema,
	addFormats: boolean,
	formatOptions: FormatsPluginOptions | undefined,
	output: ValidatorOutput,
	esm: boolean,
	outDirs: string[],
	prettierOptions: prettier.Options,
) {
	const decoders = definitionNames
		.map((definitionName) =>
			decoderTemplate
				.replace(/\$DecoderName/g, createDecoderName(definitionName))
				.replace(/\$Class/g, definitionName)
				.replace(/\$ValidatorName/g, createValidatorName(definitionName))
				.trim(),
		)
		.join("\n");

	const validatorImports = definitionNames
		.map((d) => createValidatorName(d))
		.join(", ");

	const validatorImportStatement = createValidatorImportStatement(
		validatorImports,
		output,
		true,
		esm,
	);

	const rawDecoderOutput = mergedDecodersFileTemplate(esm)
		.replace(/\$ValidatorImports/g, validatorImportStatement)
		.replace(/\$ModelImports/g, definitionNames.join(", "))
		.replace(/\$Decoders/g, decoders);

	const decoderOutput = prettier.format(rawDecoderOutput, prettierOptions);

	const rawValidatorsOutput = validatorsFileTemplate.replace(
		/\$Validators/g,
		standAloneValidatorOutput(
			schema,
			definitionNames,
			addFormats,
			formatOptions,
			output,
			prettierOptions,
		),
	);

	const validatorsOutput = prettier.format(
		rawValidatorsOutput,
		prettierOptions,
	);
	const validatorDefinitions = validatorDefinitionsOutput(
		definitionNames,
		prettierOptions,
	);

	for (const outDir of outDirs) {
		mkdirSync(outDir, { recursive: true });

		writeFileSync(path.join(outDir, "decoders.ts"), decoderOutput);
		writeFileSync(path.join(outDir, "validators.js"), validatorsOutput);

		if (output === "module") {
			writeFileSync(path.join(outDir, "validators.d.ts"), validatorDefinitions);
		}
	}
}

function createValidatorImportStatement(
	validatorImportString: string,
	output: ValidatorOutput,
	merged: boolean,
	esm: boolean,
) {
	const fileName = merged ? "validators" : "validator";
	switch (output) {
		case "commonjs":
			return `const { ${validatorImportString} } = require("./${fileName}")`;
		case "module":
			if (!esm) {
				return `import { ${validatorImportString} } from './${fileName}'`;
			}
			return `import { ${validatorImportString} } from './${fileName}.js'`;
	}
}

function standAloneValidatorOutput(
	schema: ParsedSchema,
	definitions: string[],
	formats: boolean,
	formatOptions: FormatsPluginOptions | undefined,
	output: ValidatorOutput,
	prettierOptions: prettier.Options,
): string {
	const ajv = new Ajv({ code: { source: true }, strict: false });
	if (formats) {
		addFormats(ajv, formatOptions);
	}
	ajv.compile(JSON.parse(schema.json));

	const refs = definitions.reduce<Record<string, string>>(
		(acc, definitionName) => {
			acc[createValidatorName(definitionName)] =
				`#/definitions/${definitionName}`;
			return acc;
		},
		{},
	);

	let jsOutput = standaloneCode(ajv, refs);

	if (output === "module") {
		jsOutput = jsOutput.replace(
			/exports\.(\w+Validator) = (\w+)/gm,
			"export const $1 = $2",
		);
	}

	const rawValidatorsOutput = validatorsFileTemplate.replace(
		/\$Validators/g,
		jsOutput,
	);

	const validatorsOutput = prettier.format(
		rawValidatorsOutput,
		prettierOptions,
	);
	return validatorsOutput;
}

function validatorDefinitionsOutput(
	definitions: string[],
	prettierOptions: prettier.Options,
) {
	const raw = definitions
		.map(
			(d) =>
				`export function ${createValidatorName(d)}(json: unknown): boolean;`,
		)
		.join("\n");

	return prettier.format(raw, prettierOptions);
}

const validatorsFileTemplate = `
/* eslint-disable */

$Validators
`;

const decoderTemplate = `
export const $DecoderName: Decoder<$Class> = {
  definitionName: '$Class',
  schemaRef: '#/definitions/$Class',

  decode(json: unknown): $Class {
    return validateJson(json, $ValidatorName as Validator, $DecoderName.definitionName);
  }
}
`;

const decoderFileTemplate = (esm: boolean) => {
	const importExtension = esm ? ".js" : "";
	return `
  /* eslint-disable */

  import { Decoder } from '../../helpers${importExtension}';
  import { validateJson, Validator } from '../../validate${importExtension}';
  import { $Class } from '../../models${importExtension}';
  $ValidatorImports

  ${decoderTemplate}
  `;
};

const decodersFileTemplate = `
/* eslint-disable */

$Exports
`;

const mergedDecodersFileTemplate = (esm: boolean) => {
	const importExtension = esm ? ".js" : "";
	return `
  /* eslint-disable */

  import { Decoder } from './helpers${importExtension}';
  import { validateJson, Validator } from './validate${importExtension}';
  import { $ModelImports } from './models${importExtension}';
  $ValidatorImports

  $Decoders
  `;
};
