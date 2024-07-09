# openapi-typescript-validator
Generate typescript with `ajv >= 8.0.0` validation based on openapi schemas

- [What does this do?](#what-does-this-do)
- [Getting started](#getting-started)
- [Documentation](#documentation)
  - [generate](#generate)

## What does this do?

This package will convert your `openapi 3.0` spec to:
- Typescript models
- Decoders which validate your models against a JSON schema

### Example
This schema (note: also works with JSON based schema's)
```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
      required: ['id']
```

Will convert to:

```typescript
export interface User {
  id: string;
  name?: string;
}
```

And will generate a decoder:

```typescript
// user will be of type User if the JSON is valid
const user = UserDecoder.decode(json);
```

If the JSON is invalid, it will throw an error:

```typescript
const user = UserDecoder.decode({
  id: 1
});

// User: /id: should be string. JSON: {"id":1}
```

### References
References als work, this schema

```json
{
  "components": {
    "schemas": {
      "Screen": {
        "type": "object",
        "properties": {
          "components": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Component" }
          }
        },
        "required": [ "components" ]
      },

      "Component": {
        "anyOf": [
          { "$ref": "#/components/schemas/TitleComponent" },
          { "$ref": "#/components/schemas/ImageComponent" }
        ]
      },

      "TitleComponent": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["title"]
          },
          "title": {
            "type": "string"
          },
          "subtitle": {
            "type": "string",
            "nullable": true
          }
        },
        "required": [ "type", "title" ]
      },

      "ImageComponent": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["image"]
          },
          "url": {
            "type": "string"
          }
        },
        "required": [ "type", "url" ]
      }
    }
  }
}
```

will generate

```typescript
export type Component = TitleComponent | ImageComponent;

export interface Screen {
  components: Component[];
}
export interface TitleComponent {
  type: "title";
  title: string;
  subtitle?: string | null;
}
export interface ImageComponent {
  type: "image";
  url: string;
}
```

### Custom builder

We also created a way to define your JSON schema a bit easier. The example above can also be written as:

Example: `custom-schema.js`
```javascript
const { anyOf, array, constant, nillable, object, string } = require('openapi-typescript-validator');

const types = {};

types.Screen = object({
  components: array('Component'),
})

types.Component = anyOf(['TitleComponent', 'ImageComponent']);

types.TitleComponent = object({
  type: constant('title'),
  title: string(),
  subtitle: nillable(string),
});

types.ImageComponent = object({
  type: constant('image'),
  url: string(),
});

module.exports = { types }
```

Just call `generate` with `schemaType: custom`.

See [src/builder.ts](src/builder.ts) for all helpers which can be used.

## Getting started

Install the package
```
npm i openapi-typescript-validator --save-dev
```

We use [ajv](https://github.com/ajv-validator/ajv) for the decoders
```
npm i ajv
```

Your `tsconfig.json` file will need to be able to resolve the json files.
```json
"resolveJsonModule": true
```

Create a node script called `generate-schemas.js`
```javascript

const path = require('path');
const { generate } = require('openapi-typescript-validator');

generate({
  schemaFile: path.join(__dirname, 'myswagger.yaml'),
  schemaType: 'yaml',
  directory: path.join(__dirname, '/generated')
})

```

and run `node generate-schemas.js`

**Note**
We recommened to setup your schema configuration in a different folder than your application. E.g:

- `schemas`
  - `package.json` which depends on this library
- `server`
  - `package.json` with `ajv` depedency and `ajv-formats` (if you use formats)

## Breaking changes

### upgrading to V3
When using the `custom` format for your schemas. The `string`, `boolean`, `number`, etc helpers are now a `function` instead of `const`.

You'll need to update your schemas
```javascript
// v2
object({ title: string })

// v3:
object({ title: string() })
```

## Documentation

### generate
`generate` can be called with [GenerateOptions](src/GenerateOptions.ts). See the file for more info.

## Contributers
- Q42 (https://github.com/Q42) | Forked from https://github.com/Q42/openapi-typescript-validator

- Fejes Márk (https://github.com/markfejes) | Added support for external references

- szabolcsnagy (https://github.com/szabolcsnagy) | Fix AJV order of formats

- Arnd Issler (https://github.com/arndissler) | Prettier update
