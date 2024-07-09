import * as prettier from "prettier";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export function generateAjvValidator(
  prettierOptions: prettier.Options,
  outDirs: string[]
) {
  const helpers = prettier.format(helpersTemplate, prettierOptions);

  for (const outDir of outDirs) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "validate.ts"), helpers);
  }
}
const helpersTemplate = `
/* eslint-disable */
import type { ErrorObject } from "ajv";
import{  lazyParse } from 'simdjson';

export interface Validator {
  (json: unknown): boolean;
  errors?: ErrorObject[] | null;
}

export function validateJson(
  json: any,
  validator: Validator,
  definitionName: string
): any {
  const jsonObject = typeof json === "string" ? JSON.parse(json) : json;

  if (validator(jsonObject)) {
    return jsonObject;
  }

  const jsonPreviewStr = (
    typeof json === "string" ? json : JSON.stringify(jsonObject)
  );
  if (validator.errors) {
    throw Error(\`\${ definitionName } \${ errorsText(validator.errors, jsonPreviewStr)}\`\
    );
  }

  throw Error(\`\${ definitionName } Unexpected data received.JSON: \${ jsonPreviewStr } \`\);
}

function errorsText(errors: ErrorObject[], jsonPreviewStr: Object): string {

  const JSONbuffer = lazyParse(jsonPreviewStr.toString()); // external (C++) parsed JSON object
  return errors
    .map((error)=> {
      const fieldName = error.instancePath.split("/");
      const tagPath = fieldName.join(".").substring(1);
      const errorPayload = tagPath.replace(\`\.\${ fieldName[fieldName.length - 1] } \`\, "");
      return \`\${ error.instancePath }: \${ error.message } | value returned: \${ JSONbuffer.valueForKeyPath(tagPath) } .JSON: \${ JSON.stringify(JSONbuffer.valueForKeyPath(errorPayload)) } \`\;
    })
    .join("\n");
}`;
