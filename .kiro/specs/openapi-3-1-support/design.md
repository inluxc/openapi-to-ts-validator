# Design Document

## Overview

This design adds comprehensive OpenAPI 3.1 support to the openapi-to-ts-validator library while maintaining full backward compatibility with OpenAPI 3.0. The implementation focuses on handling the key differences between OpenAPI 3.0 and 3.1, particularly the adoption of JSON Schema Draft 2020-12, improved null handling, enhanced discriminator functionality, and new features like webhooks.

The design follows the existing architecture pattern of parsing, transforming, and generating code, with extensions to handle OpenAPI 3.1 specific features.

## Architecture

### Version Detection and Routing

The system will detect the OpenAPI version from the specification and route to appropriate parsing logic:

```typescript
interface OpenAPIVersion {
  major: number;
  minor: number;
  patch?: number;
}

interface VersionAwareParser {
  detectVersion(schema: any): OpenAPIVersion;
  parseSchema(schema: any, version: OpenAPIVersion): ParsedSchema;
}
```

### Enhanced Schema Processing Pipeline

The current pipeline will be extended to handle OpenAPI 3.1 features:

1. **Version Detection**: Identify OpenAPI version from `openapi` field
2. **Schema Normalization**: Convert OpenAPI 3.1 features to compatible JSON Schema
3. **Reference Resolution**: Handle both OpenAPI 3.0 and 3.1 reference patterns
4. **Type Generation**: Generate TypeScript types with 3.1-specific features
5. **Validator Generation**: Create AJV validators compatible with JSON Schema Draft 2020-12

### Backward Compatibility Strategy

- OpenAPI 3.0 processing remains unchanged
- Version-specific processing branches based on detected version
- Shared utilities for common functionality
- Feature flags for gradual rollout of 3.1 features

## Components and Interfaces

### 1. Version Detection Module

```typescript
// src/version-detection.ts
export interface OpenAPIVersionInfo {
  version: string;
  major: number;
  minor: number;
  isVersion31: boolean;
}

export function detectOpenAPIVersion(schema: any): OpenAPIVersionInfo;
export function validateVersionSupport(version: OpenAPIVersionInfo): void;
```

### 2. Enhanced Schema Parser

```typescript
// src/parse-schema.ts (extended)
export interface OpenAPI31ParseOptions {
  enableWebhooks?: boolean;
  strictNullHandling?: boolean;
  enableConditionalSchemas?: boolean;
}

export interface ParsedSchema {
  json: string;
  definitions: Record<string, JSONSchema>;
  whitelistedDecoders: string[] | undefined;
  webhooks?: Record<string, any>; // New for 3.1
  version: OpenAPIVersionInfo; // New for version tracking
}
```

### 3. OpenAPI 3.1 Schema Transformer

```typescript
// src/transform/openapi31-transformer.ts
export interface OpenAPI31Transformer {
  transformNullTypes(schema: JSONSchema): JSONSchema;
  transformConditionalSchemas(schema: JSONSchema): JSONSchema;
  transformPrefixItems(schema: JSONSchema): JSONSchema;
  transformDiscriminators(schema: JSONSchema): JSONSchema;
  transformWebhooks(webhooks: any): Record<string, JSONSchema>;
}
```

### 4. Enhanced Type Generator

```typescript
// src/generate/generate-models-31.ts
export interface TypeGenerationOptions31 {
  enableUnionTypes: boolean;
  enableConditionalTypes: boolean;
  enableTupleTypes: boolean;
}

export function generateModels31(
  schema: ParsedSchema,
  options: TypeGenerationOptions31
): Promise<void>;
```

### 5. JSON Schema Draft 2020-12 Validator Generator

```typescript
// src/generate/generate-validators-31.ts
export interface ValidatorOptions31 {
  enableDraft202012: boolean;
  enableUnevaluatedProperties: boolean;
  enableConditionalValidation: boolean;
}

export function generateValidators31(
  definitions: Record<string, JSONSchema>,
  options: ValidatorOptions31
): void;
```

## Data Models

### OpenAPI 3.1 Specific Schema Extensions

```typescript
// Extended JSON Schema for OpenAPI 3.1 features
interface JSONSchema31 extends JSONSchema {
  // New in 3.1
  prefixItems?: JSONSchema[];
  unevaluatedProperties?: boolean | JSONSchema;
  unevaluatedItems?: boolean | JSONSchema;
  
  // Enhanced discriminator
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
    extensions?: Record<string, any>;
  };
  
  // Conditional schemas
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;
  
  // Enhanced null handling
  type?: string | string[];
  const?: any;
  
  // Webhook specific
  webhooks?: Record<string, WebhookSchema>;
}

interface WebhookSchema {
  [httpMethod: string]: {
    requestBody?: any;
    responses?: Record<string, any>;
  };
}
```

### Configuration Extensions

```typescript
// Extended GenerateOptions for OpenAPI 3.1
interface GenerateOptions31 extends GenerateOptions {
  openapi31?: {
    enableWebhooks?: boolean;
    strictNullHandling?: boolean;
    enableConditionalTypes?: boolean;
    enableTupleTypes?: boolean;
    fallbackToOpenAPI30?: boolean;
  };
}
```

## Error Handling

### Version Compatibility Errors

```typescript
class OpenAPIVersionError extends Error {
  constructor(
    public version: string,
    public feature: string,
    public suggestion?: string
  ) {
    super(`OpenAPI ${version} feature '${feature}' is not supported. ${suggestion || ''}`);
  }
}

class OpenAPI31FeatureError extends Error {
  constructor(
    public feature: string,
    public location: string,
    public workaround?: string
  ) {
    super(`OpenAPI 3.1 feature '${feature}' at '${location}' is not yet implemented. ${workaround || ''}`);
  }
}
```

### Graceful Degradation Strategy

1. **Feature Detection**: Identify unsupported 3.1 features
2. **Warning System**: Log warnings for unsupported features
3. **Fallback Behavior**: Convert 3.1 features to 3.0 equivalents where possible
4. **Error Reporting**: Provide clear guidance on unsupported features

## Testing Strategy

### Unit Testing Approach

1. **Version Detection Tests**: Verify correct version identification
2. **Schema Transformation Tests**: Test conversion of 3.1 features to compatible formats
3. **Type Generation Tests**: Validate TypeScript output for 3.1 features
4. **Validator Tests**: Ensure AJV validators work with 3.1 schemas
5. **Backward Compatibility Tests**: Verify 3.0 functionality remains unchanged

### Integration Testing

1. **End-to-End Pipeline Tests**: Full generation pipeline with 3.1 schemas
2. **Real-world Schema Tests**: Test with actual OpenAPI 3.1 specifications
3. **Cross-version Tests**: Verify mixed 3.0/3.1 scenarios
4. **Performance Tests**: Ensure 3.1 support doesn't degrade performance

### Test Schema Examples

```yaml
# OpenAPI 3.1 test schema with new features
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: ["string", "null"]  # 3.1 null handling
        tags:
          type: array
          prefixItems:  # 3.1 tuple support
            - type: string
            - type: number
          items: false
        metadata:
          if:  # 3.1 conditional schema
            properties:
              type:
                const: "premium"
          then:
            properties:
              features:
                type: array
                items:
                  type: string
webhooks:  # 3.1 webhooks
  userCreated:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
```

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
- Version detection system
- Enhanced schema parser structure
- Basic OpenAPI 3.1 schema loading
- Backward compatibility verification

### Phase 2: Core Features
- Null type handling (type arrays)
- Basic conditional schema support (if/then/else)
- Enhanced discriminator support
- prefixItems/tuple type generation

### Phase 3: Advanced Features
- Webhook support
- unevaluatedProperties handling
- Advanced conditional types
- Performance optimizations

### Phase 4: Polish and Documentation
- Comprehensive error messages
- Documentation updates
- Migration guides
- Performance benchmarking

## Migration Strategy

### For Library Users

1. **Automatic Detection**: Library automatically detects OpenAPI version
2. **Opt-in Features**: Advanced 3.1 features available via configuration
3. **Migration Warnings**: Helpful messages for deprecated 3.0 patterns
4. **Gradual Adoption**: Users can migrate schemas incrementally

### For Library Maintainers

1. **Feature Flags**: Enable/disable 3.1 features during development
2. **Comprehensive Testing**: Extensive test coverage for both versions
3. **Performance Monitoring**: Track performance impact of 3.1 support
4. **Documentation**: Clear guides for troubleshooting and migration