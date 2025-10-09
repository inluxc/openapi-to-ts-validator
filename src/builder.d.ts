import type { JSONSchema } from "json-schema-to-typescript";
type SchemaObject = JSONSchema;
type SchemaObjectOrRef = SchemaObject | string;
interface CustomSchemaObject {
    kind: "custom";
    object: SchemaObject;
    optional?: boolean;
}
type PropertyValue = SchemaObject | CustomSchemaObject;
type PropertyBaseOptions = Pick<JSONSchema, "title" | "description" | "default">;
type ObjectBaseOptions = Pick<JSONSchema, "title" | "description" | "default">;
type ArrayOptions = PropertyBaseOptions;
type StringOptions = PropertyBaseOptions & Pick<JSONSchema, "minLength" | "maxLength" | "pattern">;
type NumberOptions = PropertyBaseOptions & Pick<JSONSchema, "exclusiveMinimum" | "exclusiveMaximum" | "maximum" | "minimum" | "multipleOf">;
type BooleanOptions = PropertyBaseOptions;
interface FormatOptions extends StringOptions {
    formatMinimum?: string;
    formatMaximum?: string;
    formatExclusiveMinimum?: string;
    formatExclusiveMaximum?: string;
}
export declare const string: (options?: StringOptions) => PropertyValue;
export declare const number: (options?: NumberOptions) => PropertyValue;
export declare const boolean: (options?: BooleanOptions) => PropertyValue;
export declare const any: (options?: JSONSchema) => PropertyValue;
export declare const anonymousData: (options: JSONSchema) => PropertyValue;
export declare const date: (options?: FormatOptions) => PropertyValue;
export declare const time: (options?: FormatOptions) => PropertyValue;
export declare const dateTime: (options?: FormatOptions) => PropertyValue;
export declare const duration: (options?: FormatOptions) => PropertyValue;
export declare const uri: (options?: FormatOptions) => PropertyValue;
export declare const uriReference: (options?: FormatOptions) => PropertyValue;
export declare const uriTemplate: (options?: FormatOptions) => PropertyValue;
export declare const email: (options?: FormatOptions) => PropertyValue;
export declare const hostname: (options?: FormatOptions) => PropertyValue;
export declare const ipv4: (options?: FormatOptions) => PropertyValue;
export declare const ipv6: (options?: FormatOptions) => PropertyValue;
export declare const regex: (options?: FormatOptions) => PropertyValue;
export declare const uuid: (options?: FormatOptions) => PropertyValue;
export declare const jsonPointer: (options?: FormatOptions) => PropertyValue;
export declare const relativeJsonPointer: (options?: FormatOptions) => PropertyValue;
export declare const object: (properties: Record<string, PropertyValue>, options?: ObjectBaseOptions) => SchemaObject;
export declare const ref: (refName: string) => SchemaObject;
export declare const array: (itemType: SchemaObjectOrRef, options?: ArrayOptions) => SchemaObject;
export declare const map: (itemType: SchemaObjectOrRef) => SchemaObject;
export declare const nullable: (type: SchemaObjectOrRef) => SchemaObject;
export declare const nillable: (type: SchemaObjectOrRef) => SchemaObject;
export declare const optional: (type: SchemaObjectOrRef) => CustomSchemaObject;
export declare const oneOf: (types: SchemaObjectOrRef[]) => SchemaObject;
export declare const anyOf: (types: SchemaObjectOrRef[]) => SchemaObject;
export declare const enumerate: (values: string[]) => SchemaObject;
export declare const constant: (value: string) => SchemaObject;
export declare const compose: (...sources: SchemaObject[]) => SchemaObject;
type ConstOptions = PropertyBaseOptions;
export declare const constSchema: (value: any, options?: ConstOptions) => SchemaObject;
export declare const constFunction: (value: string | number | boolean, options?: ConstOptions) => SchemaObject;
export { constFunction as const };
interface TupleOptions extends ArrayOptions {
    additionalItems?: boolean | SchemaObjectOrRef;
    minItems?: number;
    maxItems?: number;
}
export declare const tuple: (items: SchemaObjectOrRef[], options?: TupleOptions) => SchemaObject;
interface ConditionalOptions extends PropertyBaseOptions {
}
export declare const conditional: (ifCondition: SchemaObjectOrRef, thenSchema: SchemaObjectOrRef, elseSchema?: SchemaObjectOrRef, options?: ConditionalOptions) => SchemaObject;
interface ContainsArrayOptions extends ArrayOptions {
    minContains?: number;
    maxContains?: number;
    minItems?: number;
    maxItems?: number;
}
export declare const containsArray: (containsSchema: SchemaObjectOrRef, options?: ContainsArrayOptions) => SchemaObject;
