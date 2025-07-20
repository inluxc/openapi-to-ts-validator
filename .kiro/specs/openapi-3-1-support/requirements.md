# Requirements Document

## Introduction

This feature adds support for OpenAPI 3.1 specification to the openapi-to-ts-validator library. OpenAPI 3.1 introduces significant changes including full JSON Schema compatibility, improved schema composition, and new features that enhance API specification capabilities. Currently, the library only supports OpenAPI 3.0, limiting users who want to leverage the latest OpenAPI features.

## Requirements

### Requirement 1

**User Story:** As a developer using OpenAPI 3.1 specifications, I want to generate TypeScript types and validators from my OpenAPI 3.1 schemas, so that I can leverage the latest OpenAPI features while maintaining type safety and runtime validation.

#### Acceptance Criteria

1. WHEN a user provides an OpenAPI 3.1 specification file THEN the system SHALL parse and process it successfully
2. WHEN the system encounters OpenAPI 3.1 specific features THEN it SHALL handle them appropriately without errors
3. WHEN generating TypeScript types from OpenAPI 3.1 schemas THEN the output SHALL be valid and type-safe
4. WHEN generating validators from OpenAPI 3.1 schemas THEN the validators SHALL correctly validate data according to the specification

### Requirement 2

**User Story:** As a developer, I want the library to handle JSON Schema Draft 2020-12 features used in OpenAPI 3.1, so that I can use advanced schema validation features like prefixItems, unevaluatedProperties, and conditional schemas.

#### Acceptance Criteria

1. WHEN an OpenAPI 3.1 schema uses prefixItems THEN the system SHALL generate appropriate TypeScript tuple types
2. WHEN an OpenAPI 3.1 schema uses unevaluatedProperties THEN the system SHALL handle it correctly in validation
3. WHEN an OpenAPI 3.1 schema uses if/then/else conditional logic THEN the system SHALL generate appropriate TypeScript conditional types
4. WHEN an OpenAPI 3.1 schema uses const keyword THEN the system SHALL generate literal types
5. WHEN an OpenAPI 3.1 schema uses contains keyword for arrays THEN the system SHALL validate array contents correctly

### Requirement 3

**User Story:** As a developer, I want the library to properly handle OpenAPI 3.1's improved null handling, so that I can work with schemas that use the new null type approach instead of nullable property.

#### Acceptance Criteria

1. WHEN an OpenAPI 3.1 schema uses type: ["string", "null"] THEN the system SHALL generate string | null TypeScript type
2. WHEN an OpenAPI 3.1 schema mixes type arrays with other constraints THEN the system SHALL generate correct union types
3. WHEN the system encounters both nullable and type arrays THEN it SHALL handle the conversion appropriately
4. WHEN generating validators for null union types THEN the validators SHALL correctly accept null values

### Requirement 4

**User Story:** As a developer, I want the library to support OpenAPI 3.1's enhanced discriminator functionality, so that I can use more flexible polymorphic schemas with better type discrimination.

#### Acceptance Criteria

1. WHEN an OpenAPI 3.1 schema uses discriminator with mapping THEN the system SHALL generate appropriate discriminated union types
2. WHEN an OpenAPI 3.1 schema uses discriminator without explicit mapping THEN the system SHALL infer the mapping correctly
3. WHEN generating validators for discriminated unions THEN the validators SHALL correctly identify and validate the appropriate schema variant
4. WHEN the discriminator property is not at the root level THEN the system SHALL handle nested discriminators appropriately

### Requirement 5

**User Story:** As a developer, I want the library to maintain backward compatibility with OpenAPI 3.0 specifications, so that I can upgrade the library without breaking existing implementations.

#### Acceptance Criteria

1. WHEN a user provides an OpenAPI 3.0 specification THEN the system SHALL continue to process it exactly as before
2. WHEN the system detects the OpenAPI version THEN it SHALL apply the appropriate parsing and generation logic
3. WHEN generating output from OpenAPI 3.0 specs THEN the generated code SHALL remain identical to previous versions
4. WHEN configuration options are used THEN they SHALL work consistently across both OpenAPI 3.0 and 3.1

### Requirement 6

**User Story:** As a developer, I want clear error messages when OpenAPI 3.1 features are not yet supported, so that I can understand what needs to be addressed in my schema or wait for future updates.

#### Acceptance Criteria

1. WHEN the system encounters an unsupported OpenAPI 3.1 feature THEN it SHALL provide a clear, descriptive error message
2. WHEN an error occurs during OpenAPI 3.1 processing THEN the error message SHALL indicate the specific feature and location
3. WHEN the system cannot convert an OpenAPI 3.1 feature to TypeScript THEN it SHALL suggest alternatives or workarounds where possible
4. WHEN debugging is enabled THEN the system SHALL provide detailed information about OpenAPI 3.1 processing steps

### Requirement 7

**User Story:** As a developer, I want the library to handle OpenAPI 3.1's webhook specifications, so that I can generate types and validators for webhook payloads and responses.

#### Acceptance Criteria

1. WHEN an OpenAPI 3.1 specification includes webhooks THEN the system SHALL parse the webhook definitions
2. WHEN generating types for webhooks THEN the system SHALL create appropriate TypeScript interfaces for webhook payloads
3. WHEN generating validators for webhooks THEN the validators SHALL correctly validate webhook data
4. WHEN webhooks reference shared components THEN the system SHALL resolve references correctly