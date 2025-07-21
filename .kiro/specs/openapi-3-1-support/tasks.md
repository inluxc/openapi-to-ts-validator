# Implementation Plan

- [x] 1. Set up OpenAPI version detection infrastructure
  - Create version detection module that parses the `openapi` field from schemas
  - Implement version validation and support checking
  - Add version information to ParsedSchema interface
  - Write unit tests for version detection with various OpenAPI spec formats
  - _Requirements: 1.1, 5.2_

- [x] 2. Extend schema parsing for OpenAPI 3.1 compatibility
  - Modify parseOpenApiSchema function to handle version-specific parsing
  - Add OpenAPI31ParseOptions interface for 3.1-specific configuration
  - Implement schema normalization for 3.1 features before JSON Schema conversion
  - Create error handling for unsupported 3.1 features with clear messages
  - Write tests for parsing both 3.0 and 3.1 schemas
  - _Requirements: 1.1, 1.2, 6.1, 6.2_
  
- [x] 3. Implement null type handling for OpenAPI 3.1
  - Create transformer function to convert type arrays (e.g., ["string", "null"]) to union types
  - Update TypeScript type generation to handle union types with null
  - Modify AJV validator generation to support type array validation with boolean return and error messages
  - Handle mixed nullable property and type array scenarios
  - Write comprehensive tests for null type handling edge cases
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Add support for JSON Schema Draft 2020-12 const keyword

  - Implement const keyword transformation to literal types in TypeScript
  - Update validator generation to handle const validation with boolean return and error messages
  - Add support for const in custom builder helpers
  - Create tests for const keyword with various data types
  - _Requirements: 2.4_

- [x] 5. Implement prefixItems support for tuple types



  - Create prefixItems transformer that converts to TypeScript tuple types
  - Handle mixed prefixItems with additional items constraints
  - Update array type generation to support tuple patterns
  - Generate AJV validators for tuple validation that return boolean success/failure with error messages
  - Write tests for various tuple type scenarios
  - _Requirements: 2.1_
 
- [x] 6. Add conditional schema support (if/then/else)
  - Implement conditional schema transformer for if/then/else patterns
  - Generate TypeScript conditional types where applicable
  - Create AJV validators that handle conditional validation logic with boolean return and error messages
  - Handle nested and complex conditional schema scenarios
  - Write comprehensive tests for conditional schema patterns
  - _Requirements: 2.3_

- [x] 7. Enhance discriminator functionality for OpenAPI 3.1
  - Extend discriminator handling to support improved 3.1 discriminator features
  - Implement mapping inference when explicit mapping is not provided
  - Generate enhanced discriminated union types in TypeScript
  - Update validator generation for improved discriminator validation with boolean return and error messages
  - Handle nested discriminator scenarios
  - Write tests for various discriminator patterns
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Add webhook support infrastructure
  - Parse webhook definitions from OpenAPI 3.1 specifications
  - Create webhook schema extraction and processing logic   
  - Generate TypeScript interfaces for webhook payloads and responses
  - Handle webhook reference resolution to shared components
  - Write tests for webhook parsing and type generation
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 9. Implement webhook validator generation
  - Generate AJV validators for webhook request and response schemas that return boolean success/failure with error messages
  - Handle webhook-specific validation scenarios
  - Integrate webhook validators with existing validator generation pipeline
  - Create helper functions for webhook validation
  - Write comprehensive tests for webhook validation
  - _Requirements: 7.3_

- [x] 10. Add unevaluatedProperties support
  - Implement unevaluatedProperties handling in schema transformation
  - Generate appropriate TypeScript types for unevaluated properties
  - Create AJV validators that handle unevaluatedProperties correctly with boolean return and error messages
  - Handle interaction with existing additionalProperties logic
  - Write tests for unevaluatedProperties scenarios
  - _Requirements: 2.2_  


  - [x] 11. Implement contains keyword for array validation 
  - Add contains keyword support in schema transformation
  - Generate TypeScript types that reflect contains constraints
  - Create AJV validators for contains array validation that return boolean success/failure with error messages
  - Handle contains with minContains and maxContains
  - Write tests for various contains validation scenarios
  - _Requirements: 2.5_

- [x] 12. Update GenerateOptions for OpenAPI 3.1 configuration
  - Extend GenerateOptions interface with OpenAPI 3.1 specific options
  - Add configuration for enabling/disabling 3.1 features
  - Implement feature flag system for gradual 3.1 feature rollout
  - Update option validation and default value handling
  - Write tests for configuration option handling
  - _Requirements: 5.4_

- [x] 13. Enhance error handling and messaging for OpenAPI 3.1  
  - Create specific error classes for OpenAPI 3.1 feature errors
  - Implement detailed error messages with location informati  on
  - Add suggestions and workarounds in error messages where possible
  - Create debug logging for OpenAPI 3.1 processing steps
  - Write tests for error handling scenarios
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 14. Ensure backward compatibility with OpenAPI 3.0
  - Verify that existing OpenAPI 3.0 processing remains unchanged
  - Add regression tests for OpenAPI 3.0 functionality
  - Implement version-specific processing branches
  - Test mixed version scenarios and edge cases
  - Validate that generated output for 3.0 specs remains identical
  - _Requirements: 5.1, 5.3_

- [x] 15. Create comprehensive integration tests





  - Build test suite with real-world OpenAPI 3.1 specifications
  - Test complete generation pipeline from 3.1 spec to working TypeScript code
  - Validate generated validators work correctly with sample data
  - Test performance impact of 3.1 support on large schemas
  - Create cross-version compatibility tests
  - _Requirements: 1.3, 1.4_

- [x] 16. Update builder helpers for OpenAPI 3.1 features
  - Add const() helper function to builder API
  - Implement tuple() helper for prefixItems support
  - Add conditional() helper for if/then/else schemas
  - Update nullable() helper to support type arrays
  - Write tests for new builder helper functions
  - _Requirements: 2.4, 2.1, 2.3, 3.1_

- [x] 17. Optimize performance for OpenAPI 3.1 processing

 
  - Profile schema parsing performance with 3.1 features
  - Optimize transformation pipeline for complex 3.1 schemas
  - Implement caching for repeated schema transformations
  - Benchmark generation speed compared to 3.0 processing
  - Write performance tests and establish benchmarks
  - _Requirements: 1.1, 1.2_

- [x] 18. Final integration and validation



  - Run complete test suite across all OpenAPI versions
  - Validate all requirements are met with end-to-end tests
  - Test library with various real-world OpenAPI 3.1 specifications
  - Verify error handling works correctly in all scenarios
  - Confirm backward compatibility is maintained
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_