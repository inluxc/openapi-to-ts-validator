/* eslint-disable */
import type { User } from './models';

export const schemaDefinitions = {
  User: info<User>('User', '#/definitions/User'),
};

export interface SchemaInfo<T> {
  definitionName: string;
  schemaRef: string;
}

function info<T>(definitionName: string, schemaRef: string): SchemaInfo<T> {
  return { definitionName, schemaRef };
}
