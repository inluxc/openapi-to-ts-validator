"use strict";
/**
 * OpenAPI 3.1 discriminator transformer
 * Handles enhanced discriminator functionality including mapping inference and nested discriminators
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDiscriminator = exports.extractDiscriminatorInfo = exports.hasDiscriminators = exports.transformDiscriminators = void 0;
/**
 * Transforms OpenAPI 3.1 discriminator schemas to enhanced discriminated union types
 * @param schema The JSON Schema to transform
 * @param location Current location in schema for error reporting
 * @returns Transformation result
 */
function transformDiscriminators(schema, location) {
    if (location === void 0) { location = '#/'; }
    if (!schema || typeof schema !== 'object') {
        return { schema: schema, wasTransformed: false };
    }
    var transformed = __assign({}, schema);
    var wasTransformed = false;
    var discriminators = [];
    // Handle discriminator in oneOf/anyOf schemas
    if (transformed.discriminator && (transformed.oneOf || transformed.anyOf)) {
        var discriminatorResult = processDiscriminator(transformed, transformed.discriminator, location);
        if (discriminatorResult.wasTransformed) {
            Object.assign(transformed, discriminatorResult.schema);
            wasTransformed = true;
            if (discriminatorResult.discriminatorInfo) {
                discriminators.push(discriminatorResult.discriminatorInfo);
            }
        }
    }
    // Handle discriminator in allOf schemas (inheritance scenarios)
    if (transformed.discriminator && transformed.allOf) {
        var discriminatorResult = processInheritanceDiscriminator(transformed, transformed.discriminator, location);
        if (discriminatorResult.wasTransformed) {
            Object.assign(transformed, discriminatorResult.schema);
            wasTransformed = true;
            if (discriminatorResult.discriminatorInfo) {
                discriminators.push(discriminatorResult.discriminatorInfo);
            }
        }
    }
    // Recursively transform nested schemas
    var nestedResults = transformNestedSchemas(transformed, location);
    if (nestedResults.wasTransformed) {
        Object.assign(transformed, nestedResults.schema);
        wasTransformed = true;
        discriminators.push.apply(discriminators, (nestedResults.discriminators || []));
    }
    return {
        schema: transformed,
        wasTransformed: wasTransformed,
        discriminators: discriminators.length > 0 ? discriminators : undefined
    };
}
exports.transformDiscriminators = transformDiscriminators;
/**
 * Processes discriminator in oneOf/anyOf schemas
 */
function processDiscriminator(schema, discriminator, location) {
    if (!discriminator || typeof discriminator !== 'object' || !discriminator.propertyName) {
        return { schema: schema, wasTransformed: false };
    }
    var transformed = __assign({}, schema);
    var propertyName = discriminator.propertyName;
    var explicitMapping = discriminator.mapping;
    // Get the union schemas (oneOf or anyOf)
    var unionSchemas = (transformed.oneOf || transformed.anyOf);
    if (!Array.isArray(unionSchemas) || unionSchemas.length === 0) {
        return { schema: schema, wasTransformed: false };
    }
    // Infer mapping if not explicitly provided
    var mapping = explicitMapping || inferDiscriminatorMapping(unionSchemas, propertyName, location);
    // Enhance union schemas with discriminator information
    var enhancedSchemas = enhanceUnionSchemasWithDiscriminator(unionSchemas, propertyName, mapping, location);
    // Update the schema with enhanced union schemas
    if (transformed.oneOf) {
        transformed.oneOf = enhancedSchemas;
    }
    else if (transformed.anyOf) {
        transformed.anyOf = enhancedSchemas;
    }
    // Add discriminator metadata for TypeScript generation
    transformed['x-discriminator-enhanced'] = {
        propertyName: propertyName,
        mapping: mapping,
        location: location
    };
    var discriminatorInfo = {
        propertyName: propertyName,
        mapping: explicitMapping,
        inferredMapping: explicitMapping ? undefined : mapping,
        location: location
    };
    return {
        schema: transformed,
        wasTransformed: true,
        discriminatorInfo: discriminatorInfo
    };
}
/**
 * Processes discriminator in allOf schemas (inheritance scenarios)
 */
function processInheritanceDiscriminator(schema, discriminator, location) {
    if (!discriminator || typeof discriminator !== 'object' || !discriminator.propertyName) {
        return { schema: schema, wasTransformed: false };
    }
    var transformed = __assign({}, schema);
    var propertyName = discriminator.propertyName;
    // For inheritance scenarios, we need to ensure the discriminator property
    // is properly defined in the base schema
    if (!transformed.properties) {
        transformed.properties = {};
    }
    // Add discriminator property if not already present
    if (!transformed.properties[propertyName]) {
        transformed.properties[propertyName] = {
            type: 'string',
            description: "Discriminator property for ".concat(location)
        };
    }
    // Ensure discriminator property is required
    if (!transformed.required) {
        transformed.required = [];
    }
    if (Array.isArray(transformed.required) && !transformed.required.includes(propertyName)) {
        transformed.required.push(propertyName);
    }
    // Add discriminator metadata
    transformed['x-discriminator-enhanced'] = {
        propertyName: propertyName,
        mapping: discriminator.mapping,
        location: location,
        isInheritance: true
    };
    var discriminatorInfo = {
        propertyName: propertyName,
        mapping: discriminator.mapping,
        location: location,
        isNested: false
    };
    return {
        schema: transformed,
        wasTransformed: true,
        discriminatorInfo: discriminatorInfo
    };
}
/**
 * Infers discriminator mapping from union schemas when explicit mapping is not provided
 */
function inferDiscriminatorMapping(unionSchemas, propertyName, location) {
    var mapping = {};
    unionSchemas.forEach(function (unionSchema, index) {
        if (!unionSchema || typeof unionSchema !== 'object') {
            return;
        }
        var discriminatorValue;
        var schemaRef;
        // Check if schema has a $ref
        if (unionSchema.$ref) {
            schemaRef = unionSchema.$ref;
            // Extract schema name from $ref (e.g., "#/components/schemas/Cat" -> "Cat")
            var refParts = unionSchema.$ref.split('/');
            discriminatorValue = refParts[refParts.length - 1];
        }
        // Check if discriminator property has a const value
        else if (unionSchema.properties && unionSchema.properties[propertyName]) {
            var discriminatorProp = unionSchema.properties[propertyName];
            if (discriminatorProp.const) {
                discriminatorValue = String(discriminatorProp.const);
            }
            else if (discriminatorProp.enum && discriminatorProp.enum.length === 1) {
                discriminatorValue = String(discriminatorProp.enum[0]);
            }
        }
        // Check if schema has a title that can be used as discriminator value
        else if (unionSchema.title) {
            discriminatorValue = unionSchema.title;
        }
        // If we found a discriminator value, add it to the mapping
        if (discriminatorValue) {
            var targetRef = schemaRef || "".concat(location, "/unionSchemas/").concat(index);
            mapping[discriminatorValue] = targetRef;
        }
    });
    return mapping;
}
/**
 * Enhances union schemas with discriminator information
 */
function enhanceUnionSchemasWithDiscriminator(unionSchemas, propertyName, mapping, location) {
    return unionSchemas.map(function (unionSchema, index) {
        if (!unionSchema || typeof unionSchema !== 'object') {
            return unionSchema;
        }
        var enhanced = __assign({}, unionSchema);
        // Find the discriminator value for this schema
        var discriminatorValue;
        // Check mapping first
        for (var _i = 0, _a = Object.entries(mapping); _i < _a.length; _i++) {
            var _b = _a[_i], value = _b[0], ref = _b[1];
            if (ref === unionSchema.$ref || ref.endsWith("/".concat(index))) {
                discriminatorValue = value;
                break;
            }
        }
        // If not found in mapping, try to infer from schema
        if (!discriminatorValue) {
            if (unionSchema.$ref) {
                var refParts = unionSchema.$ref.split('/');
                discriminatorValue = refParts[refParts.length - 1];
            }
            else if (unionSchema.title) {
                discriminatorValue = unionSchema.title;
            }
        }
        // Ensure discriminator property is properly defined in the schema
        if (discriminatorValue && !enhanced.$ref) {
            if (!enhanced.properties) {
                enhanced.properties = {};
            }
            // Add or enhance discriminator property
            enhanced.properties[propertyName] = {
                type: 'string',
                const: discriminatorValue,
                description: "Discriminator value for this variant"
            };
            // Ensure discriminator property is required
            if (!enhanced.required) {
                enhanced.required = [];
            }
            if (Array.isArray(enhanced.required) && !enhanced.required.includes(propertyName)) {
                enhanced.required.push(propertyName);
            }
        }
        return enhanced;
    });
}
/**
 * Recursively transforms nested schemas for discriminators
 */
function transformNestedSchemas(schema, location) {
    var transformed = __assign({}, schema);
    var wasTransformed = false;
    var discriminators = [];
    // Transform properties
    if (transformed.properties) {
        for (var _i = 0, _a = Object.entries(transformed.properties); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], prop = _b[1];
            var result = transformDiscriminators(prop, "".concat(location, "/properties/").concat(key));
            if (result.wasTransformed) {
                transformed.properties[key] = result.schema;
                wasTransformed = true;
                if (result.discriminators) {
                    discriminators.push.apply(discriminators, result.discriminators.map(function (d) { return (__assign(__assign({}, d), { isNested: true })); }));
                }
            }
        }
    }
    // Transform items
    if (transformed.items) {
        if (Array.isArray(transformed.items)) {
            transformed.items = transformed.items.map(function (item, index) {
                var result = transformDiscriminators(item, "".concat(location, "/items/").concat(index));
                if (result.wasTransformed) {
                    wasTransformed = true;
                    if (result.discriminators) {
                        discriminators.push.apply(discriminators, result.discriminators.map(function (d) { return (__assign(__assign({}, d), { isNested: true })); }));
                    }
                }
                return result.schema;
            });
        }
        else {
            var result = transformDiscriminators(transformed.items, "".concat(location, "/items"));
            if (result.wasTransformed) {
                transformed.items = result.schema;
                wasTransformed = true;
                if (result.discriminators) {
                    discriminators.push.apply(discriminators, result.discriminators.map(function (d) { return (__assign(__assign({}, d), { isNested: true })); }));
                }
            }
        }
    }
    // Transform additionalProperties
    if (transformed.additionalProperties && typeof transformed.additionalProperties === 'object') {
        var result = transformDiscriminators(transformed.additionalProperties, "".concat(location, "/additionalProperties"));
        if (result.wasTransformed) {
            transformed.additionalProperties = result.schema;
            wasTransformed = true;
            if (result.discriminators) {
                discriminators.push.apply(discriminators, result.discriminators.map(function (d) { return (__assign(__assign({}, d), { isNested: true })); }));
            }
        }
    }
    var _loop_1 = function (combiner) {
        if (Array.isArray(transformed[combiner])) {
            transformed[combiner] = transformed[combiner].map(function (subSchema, index) {
                var result = transformDiscriminators(subSchema, "".concat(location, "/").concat(combiner, "/").concat(index));
                if (result.wasTransformed) {
                    wasTransformed = true;
                    if (result.discriminators) {
                        discriminators.push.apply(discriminators, result.discriminators.map(function (d) { return (__assign(__assign({}, d), { isNested: true })); }));
                    }
                }
                return result.schema;
            });
        }
    };
    // Transform combiners (allOf, anyOf, oneOf)
    for (var _c = 0, _d = ['allOf', 'anyOf', 'oneOf']; _c < _d.length; _c++) {
        var combiner = _d[_c];
        _loop_1(combiner);
    }
    return {
        schema: transformed,
        wasTransformed: wasTransformed,
        discriminators: discriminators.length > 0 ? discriminators : undefined
    };
}
/**
 * Checks if a schema contains discriminators that need transformation
 * @param schema The schema to check
 * @returns True if the schema contains discriminators
 */
function hasDiscriminators(schema) {
    if (!schema || typeof schema !== 'object') {
        return false;
    }
    // Check for direct discriminator
    if (schema.discriminator) {
        return true;
    }
    // Check nested schemas
    if (schema.properties) {
        for (var _i = 0, _a = Object.values(schema.properties); _i < _a.length; _i++) {
            var prop = _a[_i];
            if (hasDiscriminators(prop)) {
                return true;
            }
        }
    }
    if (schema.items) {
        if (Array.isArray(schema.items)) {
            if (schema.items.some(function (item) { return hasDiscriminators(item); })) {
                return true;
            }
        }
        else if (hasDiscriminators(schema.items)) {
            return true;
        }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        if (hasDiscriminators(schema.additionalProperties)) {
            return true;
        }
    }
    // Check combiners
    for (var _b = 0, _c = ['allOf', 'anyOf', 'oneOf']; _b < _c.length; _b++) {
        var combiner = _c[_b];
        if (Array.isArray(schema[combiner])) {
            if (schema[combiner].some(function (subSchema) { return hasDiscriminators(subSchema); })) {
                return true;
            }
        }
    }
    return false;
}
exports.hasDiscriminators = hasDiscriminators;
/**
 * Extracts discriminator information from a schema
 * @param schema The schema to analyze
 * @returns Array of discriminator information
 */
function extractDiscriminatorInfo(schema) {
    var result = transformDiscriminators(schema);
    return result.discriminators || [];
}
exports.extractDiscriminatorInfo = extractDiscriminatorInfo;
/**
 * Validates discriminator configuration
 * @param discriminator The discriminator object to validate
 * @param location Current location for error reporting
 * @throws Error if discriminator configuration is invalid
 */
var errors_1 = require("../errors");
function validateDiscriminator(discriminator, location) {
    errors_1.loggers.discriminator.debug("Validating discriminator at ".concat(location));
    if (!discriminator || typeof discriminator !== 'object') {
        throw new errors_1.DiscriminatorError(location, 'must be an object', 'Ensure discriminator is defined as an object with at least a propertyName field');
    }
    if (!discriminator.propertyName || typeof discriminator.propertyName !== 'string') {
        throw new errors_1.DiscriminatorError(location, 'propertyName must be a non-empty string', 'Add a propertyName field with the name of the property used for discrimination');
    }
    if (discriminator.mapping && typeof discriminator.mapping !== 'object') {
        throw new errors_1.DiscriminatorError(location, 'mapping must be an object', 'Ensure mapping is an object with string keys and values, or remove it to use implicit mapping');
    }
    if (discriminator.mapping) {
        for (var _i = 0, _a = Object.entries(discriminator.mapping); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (typeof value !== 'string') {
                throw new errors_1.DiscriminatorError(location, "mapping value for '".concat(key, "' must be a string"), 'All mapping values must be strings pointing to schema references');
            }
        }
    }
    errors_1.loggers.discriminator.debug("Discriminator validation passed at ".concat(location));
}
exports.validateDiscriminator = validateDiscriminator;
//# sourceMappingURL=openapi31-discriminator-transformer.js.map