/* eslint-disable */

import Ajv from 'ajv';

import type { Decoder } from './helpers';
import { validateJson } from './validate';
import type { User } from './models';
import jsonSchema from './schema.json' assert { type: 'json' };

export const ajv = new Ajv({ strict: false });

ajv.compile(jsonSchema);

// Decoders
export const UserDecoder: Decoder<User> = {
  definitionName: 'User',
  schemaRef: '#/definitions/User',

  decode(json: unknown): User {
    const schema = ajv.getSchema(UserDecoder.schemaRef);
    if (!schema) {
      throw new Error(`Schema ${UserDecoder.definitionName} not found`);
    }
    return validateJson(json, schema, UserDecoder.definitionName);
  },
};
