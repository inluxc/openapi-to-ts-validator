# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-06-20

### Security
- **Dependency Updates**: Updated multiple dependencies to address security vulnerabilities
  - Bumped @babel/helpers from 7.24.8 to 7.27.6 in tests directory
  - Updated esbuild, micromatch, and cross-spawn packages
  - Updated main package dependencies

### Added
- **Debug Option**: Added comprehensive debug option to GenerateOptions
  - Enhanced debugging capabilities for schema processing
  - Improved error reporting and troubleshooting support
  - Better visibility into generation process

### Changed
- **Package Management**: Updated package-lock.json files for both main and test packages
- **Import Syntax**: Fixed JSON import statements from `with` to `assert` for better compatibility
- **Code Quality**: Fixed semicolon consistency across codebase

### Fixed
- **Test Suite**: Resolved test failures and improved test reliability
- **Repository Configuration**: Fixed repository path references
- **JSON Type Handling**: Added proper JSON type support for imports

### Maintenance
- **Dependabot Integration**: Merged multiple Dependabot PRs for security updates
- **Package Cleanup**: Removed deprecated packages and cleaned up dependencies
- **Build Process**: Improved build stability and error handling

## Previous Versions

### [1.0.0] - Initial Release
- Core OpenAPI to TypeScript validator functionality
- AJV-based runtime validation
- Support for OpenAPI 3.0 schemas
- TypeScript interface generation
- Modular and standalone decoder options

---

## Development Notes

This changelog was generated from git history on 2025-07-20 after a major cleanup of the project structure. The project has been actively maintained with regular security updates and feature enhancements.

### Recent Development Activity
- **Security Focus**: Regular dependency updates via Dependabot
- **Code Quality**: Ongoing improvements to TypeScript compatibility
- **Testing**: Enhanced test suite reliability
- **Documentation**: Improved project documentation and setup guides