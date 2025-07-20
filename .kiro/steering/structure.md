# Project Structure & Organization

## Root Directory Layout

```
├── src/                    # Source code
├── tests/                  # Test suite (separate package)
├── dist/                   # Compiled output (generated)
├── .kiro/                  # Kiro configuration
├── .github/                # GitHub workflows
├── .vscode/                # VS Code settings
└── package.json            # Main package configuration
```

## Source Code Organization (`src/`)

### Core Files
- `index.ts` - Main entry point, exports public API
- `generate.ts` - Main generation orchestrator
- `GenerateOptions.ts` - Type definitions for configuration options
- `parse-schema.ts` - Schema parsing logic (OpenAPI, JSON, custom)
- `builder.ts` - Custom schema builder helpers and utilities

### Generation Modules (`src/generate/`)
Contains specialized generators for different output types:
- Model generation (TypeScript interfaces)
- Decoder generation (AJV validators)
- Helper utilities
- Meta file generation

## Test Structure (`tests/`)

- **Separate package**: Own package.json with test-specific dependencies
- **Schema fixtures**: `tests/schemas/` contains test schema files
- **Generated output**: Tests generate code to verify functionality
- **Integration focused**: Tests the full generation pipeline

## Architecture Patterns

### Modular Generation
- Each generator handles a specific output type
- Generators are orchestrated by main `generate()` function
- Options-driven configuration for flexible output

### Schema Processing Pipeline
1. **Parse**: Convert input (OpenAPI/JSON/custom) to unified format
2. **Transform**: Process references and convert to JSON Schema
3. **Generate**: Create TypeScript types and AJV validators
4. **Format**: Apply Prettier formatting
5. **Output**: Write to specified directories

### Builder Pattern
- `builder.ts` provides fluent API for programmatic schema creation
- Helper functions for common schema patterns (string, number, object, etc.)
- Support for complex compositions (anyOf, oneOf, nullable, etc.)

## File Naming Conventions

- **Kebab-case**: For schema files and generated outputs
- **PascalCase**: For TypeScript interfaces and types
- **camelCase**: For functions and variables
- **SCREAMING_SNAKE_CASE**: For constants