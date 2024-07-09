import $RefParser from "@apidevtools/json-schema-ref-parser";
import { readFileSync } from "node:fs";
import jsYaml from "js-yaml";
import type { JSONSchema } from "json-schema-to-typescript";
import { dirname } from "node:path";

import toJsonSchema from "@openapi-contrib/openapi-schema-to-json-schema";

export type SchemaType = "yaml" | "json" | "custom";

export interface ParsedSchema {
	json: string;
	definitions: Record<string, JSONSchema>;
	whitelistedDecoders: string[] | undefined;
}

export async function parseSchema(
	inputFilePath: string,
	schemaType: SchemaType,
): Promise<ParsedSchema> {
	switch (schemaType) {
		case "json":
		case "yaml":
			return parseOpenApiSchema(inputFilePath, schemaType);
		case "custom":
			return parseCustomSchema(inputFilePath);
	}
}

async function parseOpenApiSchema(
	inputFilePath: string,
	schemaType: "yaml" | "json",
): Promise<ParsedSchema> {
	let schema: any;

	const inputFileContent = readFileSync(inputFilePath, "utf8");

	if (schemaType === "yaml") {
		schema = jsYaml.load(inputFileContent);
	} else {
		schema = JSON.parse(inputFileContent);
	}

	const originalDirectory = process.cwd();
	process.chdir(dirname(inputFilePath));
	// resolve external references to original schema
	schema = await $RefParser.bundle(schema);
	// change back to original directory
	process.chdir(originalDirectory);

	const properties: Record<string, any> = {};
	const definitions: Record<string, any> = {};

	for (const [key, value] of Object.entries(schema.components.schemas)) {
		properties[key] = { $ref: `#/definitions/${key}` };
		definitions[key] = toJsonSchema(value as any);
	}

	// open api is a bit different so we need to creata a different schema
	const schemaJsonOutput = JSON.stringify(
		{
			type: "object",
			title: "Schema",
			definitions,
			properties,
		},
		undefined,
		2,
	).replace(/\#\/components\/schemas/g, "#/definitions");

	return {
		json: schemaJsonOutput,
		definitions,
		whitelistedDecoders: undefined,
	};
}

function parseCustomSchema(inputFilePath: string): ParsedSchema {
	const schema = require(inputFilePath);

	if (typeof schema.types !== "object") {
		throw new Error('schema "types" should be an object');
	}

	const properties: Record<string, any> = {};
	const definitions: Record<string, any> = {};

	for (const [key, value] of Object.entries(schema.types)) {
		properties[key] = { $ref: `#/definitions/${key}` };
		definitions[key] = value;
	}

	const schemaJsonOutput = JSON.stringify(
		{
			type: "object",
			title: "Schema",
			definitions,
			properties,
		},
		undefined,
		2,
	);

	return {
		json: schemaJsonOutput,
		definitions,
		whitelistedDecoders: schema.decoders,
	};
}
