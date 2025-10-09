/* eslint-disable */
import type { ErrorObject } from 'ajv';

export interface Validator {
  (json: unknown): boolean;
  errors?: ErrorObject[] | null;
}

export function validateJson(
  json: any,
  validator: Validator,
  definitionName: string,
): any {
  const jsonObject = typeof json === 'string' ? JSON.parse(json) : json;

  if (validator(jsonObject)) {
    return jsonObject;
  }

  const jsonPreviewStr =
    typeof json === 'string' ? json : JSON.stringify(jsonObject);
  if (validator.errors) {
    throw Error(
      `${definitionName} ${errorsText(validator.errors, jsonPreviewStr)}`,
    );
  }

  throw Error(
    `${definitionName} Unexpected data received.JSON: ${jsonPreviewStr} `,
  );
}

function errorsText(errors: ErrorObject[], jsonPreviewStr: Object): string {
  const JSONbuffer = JSON.parse(jsonPreviewStr.toString()); // external (C++) parsed JSON object
  return errors
    .map((error) => {
      const fieldName = error.instancePath.split('/');
      const tagPath = fieldName.join('.').substring(1);
      const errorPayload = tagPath.replace(
        `.${fieldName[fieldName.length - 1]} `,
        '',
      );
      return `${error.instancePath}: ${error.message} \n Returned: ${JSON.stringify(JSONbuffer)} `;
    })
    .join(`\n`);
}
