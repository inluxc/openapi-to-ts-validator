"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookSchema = exports.validateWebhookConfig = exports.extractWebhookNames = exports.hasWebhooks = exports.transformWebhooks = void 0;
var openapi_schema_to_json_schema_1 = __importDefault(require("@openapi-contrib/openapi-schema-to-json-schema"));
/**
 * Transforms OpenAPI 3.1 webhooks into structured JSON schemas
 * @param webhooks Raw webhooks object from OpenAPI 3.1 spec
 * @returns Transformation result with processed webhook schemas
 */
function transformWebhooks(webhooks) {
    if (!webhooks || typeof webhooks !== 'object') {
        return {
            wasTransformed: false,
            webhooks: {},
        };
    }
    var processedWebhooks = {};
    var wasTransformed = false;
    for (var _i = 0, _a = Object.entries(webhooks); _i < _a.length; _i++) {
        var _b = _a[_i], webhookName = _b[0], webhook = _b[1];
        if (!webhook || typeof webhook !== 'object') {
            continue;
        }
        var webhookSchema = processWebhookDefinition(webhookName, webhook);
        if (webhookSchema) {
            processedWebhooks[webhookName] = webhookSchema;
            wasTransformed = true;
        }
    }
    return {
        wasTransformed: wasTransformed,
        webhooks: processedWebhooks,
    };
}
exports.transformWebhooks = transformWebhooks;
/**
 * Processes a single webhook definition
 * @param webhookName Name of the webhook
 * @param webhook Webhook definition object
 * @returns Processed webhook schema or null if invalid
 */
function processWebhookDefinition(webhookName, webhook) {
    var webhookSchema = {
        type: 'object',
        title: "".concat(capitalizeFirst(webhookName), "Webhook"),
        description: "Webhook definition for ".concat(webhookName),
        properties: {},
        additionalProperties: false,
    };
    var hasValidOperations = false;
    // Process each HTTP method in the webhook
    for (var _i = 0, _a = Object.entries(webhook); _i < _a.length; _i++) {
        var _b = _a[_i], method = _b[0], operation = _b[1];
        if (!operation || typeof operation !== 'object') {
            continue;
        }
        var operationSchema = processWebhookOperation(method, operation);
        if (operationSchema && Object.keys(operationSchema.properties || {}).length > 0) {
            webhookSchema.properties[method] = operationSchema;
            hasValidOperations = true;
        }
    }
    return hasValidOperations ? webhookSchema : null;
}
/**
 * Processes a single webhook operation (HTTP method)
 * @param method HTTP method name
 * @param operation Operation definition object
 * @returns Processed operation schema or null if invalid
 */
function processWebhookOperation(method, operation) {
    var _a;
    var operationSchema = {
        type: 'object',
        title: "".concat(capitalizeFirst(method), "Operation"),
        description: "".concat(method.toUpperCase(), " operation for webhook"),
        properties: {},
        additionalProperties: false,
    };
    var hasValidContent = false;
    // Process request body
    if ((_a = operation.requestBody) === null || _a === void 0 ? void 0 : _a.content) {
        var requestBodySchema = processRequestBody(operation.requestBody);
        if (requestBodySchema) {
            operationSchema.properties.requestBody = requestBodySchema;
            hasValidContent = true;
        }
    }
    // Process responses
    if (operation.responses) {
        var responsesSchema = processResponses(operation.responses);
        if (responsesSchema && Object.keys(responsesSchema.properties || {}).length > 0) {
            operationSchema.properties.responses = responsesSchema;
            hasValidContent = true;
        }
    }
    // Process parameters if present
    if (operation.parameters && Array.isArray(operation.parameters)) {
        var parametersSchema = processParameters(operation.parameters);
        if (parametersSchema && Object.keys(parametersSchema.properties || {}).length > 0) {
            operationSchema.properties.parameters = parametersSchema;
            hasValidContent = true;
        }
    }
    // Process headers if present
    if (operation.headers) {
        var headersSchema = processHeaders(operation.headers);
        if (headersSchema && Object.keys(headersSchema.properties || {}).length > 0) {
            operationSchema.properties.headers = headersSchema;
            hasValidContent = true;
        }
    }
    return hasValidContent ? operationSchema : null;
}
/**
 * Processes request body content
 * @param requestBody Request body definition
 * @returns Processed request body schema or null if invalid
 */
function processRequestBody(requestBody) {
    if (!requestBody.content || typeof requestBody.content !== 'object') {
        return null;
    }
    var requestBodySchema = {
        type: 'object',
        title: 'RequestBody',
        description: 'Request body content',
        properties: {},
        additionalProperties: false,
    };
    var hasValidContent = false;
    for (var _i = 0, _a = Object.entries(requestBody.content); _i < _a.length; _i++) {
        var _b = _a[_i], mediaType = _b[0], mediaTypeObject = _b[1];
        if (!mediaTypeObject || typeof mediaTypeObject !== 'object') {
            continue;
        }
        var mediaTypeSchema = mediaTypeObject.schema;
        if (mediaTypeSchema) {
            try {
                // Convert OpenAPI schema to JSON Schema
                var jsonSchema = (0, openapi_schema_to_json_schema_1.default)(mediaTypeSchema);
                requestBodySchema.properties[normalizeMediaType(mediaType)] = jsonSchema;
                hasValidContent = true;
            }
            catch (error) {
                console.warn("Failed to process request body schema for media type ".concat(mediaType, ":"), error);
            }
        }
    }
    // Add required field if request body is required
    if (requestBody.required === true && hasValidContent) {
        requestBodySchema.required = Object.keys(requestBodySchema.properties || {});
    }
    return hasValidContent ? requestBodySchema : null;
}
/**
 * Processes response definitions
 * @param responses Responses definition object
 * @returns Processed responses schema or null if invalid
 */
function processResponses(responses) {
    if (!responses || typeof responses !== 'object') {
        return null;
    }
    var responsesSchema = {
        type: 'object',
        title: 'Responses',
        description: 'Response definitions',
        properties: {},
        additionalProperties: false,
    };
    var hasValidResponses = false;
    for (var _i = 0, _a = Object.entries(responses); _i < _a.length; _i++) {
        var _b = _a[_i], statusCode = _b[0], response = _b[1];
        if (!response || typeof response !== 'object') {
            continue;
        }
        var responseSchema = processResponse(statusCode, response);
        if (responseSchema) {
            responsesSchema.properties[statusCode] = responseSchema;
            hasValidResponses = true;
        }
    }
    return hasValidResponses ? responsesSchema : null;
}
/**
 * Processes a single response definition
 * @param statusCode HTTP status code
 * @param response Response definition object
 * @returns Processed response schema or null if invalid
 */
function processResponse(statusCode, response) {
    var responseSchema = {
        type: 'object',
        title: "Response".concat(statusCode),
        description: "Response for status code ".concat(statusCode),
        properties: {},
        additionalProperties: false,
    };
    var hasValidContent = false;
    // Process response content
    if (response.content && typeof response.content === 'object') {
        var contentSchema = {
            type: 'object',
            title: 'Content',
            description: 'Response content',
            properties: {},
            additionalProperties: false,
        };
        for (var _i = 0, _a = Object.entries(response.content); _i < _a.length; _i++) {
            var _b = _a[_i], mediaType = _b[0], mediaTypeObject = _b[1];
            if (!mediaTypeObject || typeof mediaTypeObject !== 'object') {
                continue;
            }
            var mediaTypeSchema = mediaTypeObject.schema;
            if (mediaTypeSchema) {
                try {
                    // Convert OpenAPI schema to JSON Schema
                    var jsonSchema = (0, openapi_schema_to_json_schema_1.default)(mediaTypeSchema);
                    contentSchema.properties[normalizeMediaType(mediaType)] = jsonSchema;
                    hasValidContent = true;
                }
                catch (error) {
                    console.warn("Failed to process response schema for media type ".concat(mediaType, ":"), error);
                }
            }
        }
        if (hasValidContent) {
            responseSchema.properties.content = contentSchema;
        }
    }
    // Process response headers
    if (response.headers && typeof response.headers === 'object') {
        var headersSchema = processHeaders(response.headers);
        if (headersSchema && Object.keys(headersSchema.properties || {}).length > 0) {
            responseSchema.properties.headers = headersSchema;
            hasValidContent = true;
        }
    }
    return hasValidContent ? responseSchema : null;
}
/**
 * Processes parameter definitions
 * @param parameters Array of parameter definitions
 * @returns Processed parameters schema or null if invalid
 */
function processParameters(parameters) {
    if (!Array.isArray(parameters) || parameters.length === 0) {
        return null;
    }
    var parametersSchema = {
        type: 'object',
        title: 'Parameters',
        description: 'Operation parameters',
        properties: {},
        additionalProperties: false,
    };
    var hasValidParameters = false;
    for (var _i = 0, parameters_1 = parameters; _i < parameters_1.length; _i++) {
        var parameter = parameters_1[_i];
        if (!parameter || typeof parameter !== 'object' || !parameter.name) {
            continue;
        }
        try {
            var paramSchema = parameter.schema ? (0, openapi_schema_to_json_schema_1.default)(parameter.schema) : { type: 'string' };
            // Add parameter metadata
            if (parameter.description) {
                paramSchema.description = parameter.description;
            }
            parametersSchema.properties[parameter.name] = paramSchema;
            hasValidParameters = true;
            // Add to required array if parameter is required
            if (parameter.required === true) {
                if (!parametersSchema.required) {
                    parametersSchema.required = [];
                }
                if (Array.isArray(parametersSchema.required)) {
                    parametersSchema.required.push(parameter.name);
                }
            }
        }
        catch (error) {
            console.warn("Failed to process parameter ".concat(parameter.name, ":"), error);
        }
    }
    return hasValidParameters ? parametersSchema : null;
}
/**
 * Processes header definitions
 * @param headers Headers definition object
 * @returns Processed headers schema or null if invalid
 */
function processHeaders(headers) {
    if (!headers || typeof headers !== 'object') {
        return null;
    }
    var headersSchema = {
        type: 'object',
        title: 'Headers',
        description: 'HTTP headers',
        properties: {},
        additionalProperties: false,
    };
    var hasValidHeaders = false;
    for (var _i = 0, _a = Object.entries(headers); _i < _a.length; _i++) {
        var _b = _a[_i], headerName = _b[0], header = _b[1];
        if (!header || typeof header !== 'object') {
            continue;
        }
        try {
            var headerSchema = header.schema ? (0, openapi_schema_to_json_schema_1.default)(header.schema) : { type: 'string' };
            // Add header metadata
            if (header.description) {
                headerSchema.description = header.description;
            }
            headersSchema.properties[headerName] = headerSchema;
            hasValidHeaders = true;
            // Add to required array if header is required
            if (header.required === true) {
                if (!headersSchema.required) {
                    headersSchema.required = [];
                }
                if (Array.isArray(headersSchema.required)) {
                    headersSchema.required.push(headerName);
                }
            }
        }
        catch (error) {
            console.warn("Failed to process header ".concat(headerName, ":"), error);
        }
    }
    return hasValidHeaders ? headersSchema : null;
}
/**
 * Normalizes media type for use as property name
 * @param mediaType Media type string (e.g., "application/json")
 * @returns Normalized property name (e.g., "applicationJson")
 */
function normalizeMediaType(mediaType) {
    return mediaType
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .replace(/_([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
}
/**
 * Capitalizes the first letter of a string
 * @param str Input string
 * @returns String with first letter capitalized
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Checks if a schema contains webhook definitions
 * @param schema Schema object to check
 * @returns True if webhooks are present
 */
function hasWebhooks(schema) {
    return schema && typeof schema === 'object' && schema.webhooks && typeof schema.webhooks === 'object';
}
exports.hasWebhooks = hasWebhooks;
/**
 * Extracts webhook names from a schema
 * @param schema Schema object
 * @returns Array of webhook names
 */
function extractWebhookNames(schema) {
    if (!hasWebhooks(schema)) {
        return [];
    }
    return Object.keys(schema.webhooks);
}
exports.extractWebhookNames = extractWebhookNames;
/**
 * Validates webhook configuration
 * @param webhooks Webhooks object to validate
 * @returns Validation result with any errors
 */
function validateWebhookConfig(webhooks) {
    var errors = [];
    if (!webhooks || typeof webhooks !== 'object') {
        errors.push('Webhooks must be an object');
        return { isValid: false, errors: errors };
    }
    for (var _i = 0, _a = Object.entries(webhooks); _i < _a.length; _i++) {
        var _b = _a[_i], webhookName = _b[0], webhook = _b[1];
        if (!webhook || typeof webhook !== 'object') {
            errors.push("Webhook '".concat(webhookName, "' must be an object"));
            continue;
        }
        // Validate HTTP methods
        var validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
        for (var _c = 0, _d = Object.entries(webhook); _c < _d.length; _c++) {
            var _e = _d[_c], method = _e[0], operation = _e[1];
            if (!validMethods.includes(method.toLowerCase())) {
                errors.push("Invalid HTTP method '".concat(method, "' in webhook '").concat(webhookName, "'"));
                continue;
            }
            if (!operation || typeof operation !== 'object') {
                errors.push("Operation '".concat(method, "' in webhook '").concat(webhookName, "' must be an object"));
            }
        }
    }
    return {
        isValid: errors.length === 0,
        errors: errors,
    };
}
exports.validateWebhookConfig = validateWebhookConfig;
/**
 * Creates a webhook schema for testing purposes
 * @param webhookName Name of the webhook
 * @param methods HTTP methods to include
 * @returns Test webhook schema
 */
function createWebhookSchema(webhookName, methods) {
    var _a;
    if (methods === void 0) { methods = ['post']; }
    var webhook = {};
    for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
        var method = methods_1[_i];
        webhook[method] = {
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                timestamp: { type: 'string', format: 'date-time' },
                                data: { type: 'object' },
                            },
                            required: ['id', 'timestamp'],
                        },
                    },
                },
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: { type: 'boolean' },
                                    message: { type: 'string' },
                                },
                                required: ['success'],
                            },
                        },
                    },
                },
            },
        };
    }
    return _a = {}, _a[webhookName] = webhook, _a;
}
exports.createWebhookSchema = createWebhookSchema;
//# sourceMappingURL=openapi31-webhook-transformer.js.map