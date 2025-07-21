# Tech Stack & Build System

## Core Technologies

- **TypeScript 4.9.5**: Primary language, compiled to ES5/CommonJS
- **Node.js >= 20**: Runtime requirement
- **AJV 8.0+**: JSON schema validation engine
- **Prettier**: Code formatting

## Key Dependencies

### Runtime Dependencies
- `@apidevtools/json-schema-ref-parser`: External reference resolution
- `@openapi-contrib/openapi-schema-to-json-schema`: OpenAPI to JSON Schema conversion
- `json-schema-to-typescript`: TypeScript type generation
- `js-yaml`: YAML parsing support
- `lodash.keyby`: Utility for object manipulation

### Development Dependencies
- `jest`: Testing framework
- `ts-jest`: TypeScript Jest integration
- `prettier`: Code formatting

## Build System

### TypeScript Configuration
- Target: ES5
- Module: CommonJS
- Strict mode enabled
- Declaration files generated
- Source maps included

### Common Commands

```bash
# Build the project
npm run build

# Build with watch mode
npm run build:watch

# Run tests (builds first, then runs tests in tests/ directory)
npm test

# Prepare for publishing (builds and cleans dist)
npm run prepare
npm run prepublishOnly

# Publish workflow
npm run postpublish  # pushes git tags after publish
```

## Testing Setup

- Tests located in separate `tests/` directory with own package.json
- Uses Jest with ts-jest preset
- Node test environment
- Ignores generated and build directories
- Requires Node >= 20 with experimental VM modules

## Output Structure

- Source: `src/`
- Compiled output: `dist/`
- Generated files include .js, .d.ts, and .map files