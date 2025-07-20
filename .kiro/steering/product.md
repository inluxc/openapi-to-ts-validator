# Product Overview

**openapi-to-ts-validator** is a TypeScript code generator that converts OpenAPI 3.0 schemas into:
- TypeScript interfaces and types
- Runtime validators using AJV (>= 8.0.0) for JSON schema validation

## Core Functionality

The tool takes OpenAPI schemas (YAML/JSON) or custom JavaScript schema definitions and generates:
- Type-safe TypeScript models
- Decoder functions that validate JSON data against schemas
- Standalone or modular validation code

## Key Features

- **Schema Support**: OpenAPI 3.0, JSON Schema, and custom JavaScript schema builders
- **Validation**: Runtime validation with detailed error messages using AJV
- **References**: Full support for `$ref` resolution including external references
- **Flexible Output**: CommonJS or ES modules, standalone or modular decoders
- **Custom Builders**: Programmatic schema definition with helper functions

## Target Users

Developers who need type-safe data validation in TypeScript applications, particularly those working with APIs and need to validate incoming JSON data against OpenAPI specifications.