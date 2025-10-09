"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWebhookValidators = void 0;
var ajv_1 = __importDefault(require("ajv"));
var ajv_formats_1 = __importDefault(require("ajv-formats"));
var standalone_1 = __importDefault(require("ajv/dist/standalone"));
var node_fs_1 = require("node:fs");
var path = __importStar(require("node:path"));
var prettier = __importStar(require("prettier"));
/**
 * Generates webhook validators for OpenAPI 3.1 specifications
 * @param schema Parsed schema containing webhook definitions
 * @param addFormats Whether to add format validation
 * @param formatOptions Format validation options
 * @param output Validator output format
 * @param esm Whether to use ES modules
 * @param outDirs Output directories
 * @param prettierOptions Prettier formatting options
 */
function generateWebhookValidators(schema, addFormats, formatOptions, output, esm, outDirs, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var webhookValidatorsOutput, webhookHelpersOutput, webhookTypesOutput, _a, _i, outDirs_1, outDir, webhookDir, indexOutput;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!schema.webhooks || Object.keys(schema.webhooks).length === 0) {
                        return [2 /*return*/]; // No webhooks to process
                    }
                    return [4 /*yield*/, generateStandaloneWebhookValidators(schema, addFormats, formatOptions, output, prettierOptions)];
                case 1:
                    webhookValidatorsOutput = _b.sent();
                    return [4 /*yield*/, generateWebhookHelpers(schema, output, esm, prettierOptions)];
                case 2:
                    webhookHelpersOutput = _b.sent();
                    if (!(output === "module")) return [3 /*break*/, 4];
                    return [4 /*yield*/, generateWebhookTypeDefinitions(schema, prettierOptions)];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = null;
                    _b.label = 5;
                case 5:
                    webhookTypesOutput = _a;
                    _i = 0, outDirs_1 = outDirs;
                    _b.label = 6;
                case 6:
                    if (!(_i < outDirs_1.length)) return [3 /*break*/, 9];
                    outDir = outDirs_1[_i];
                    webhookDir = path.join(outDir, "webhooks");
                    (0, node_fs_1.mkdirSync)(webhookDir, { recursive: true });
                    // Write validators
                    (0, node_fs_1.writeFileSync)(path.join(webhookDir, "validators.js"), webhookValidatorsOutput);
                    // Write helpers
                    (0, node_fs_1.writeFileSync)(path.join(webhookDir, "helpers.ts"), webhookHelpersOutput);
                    // Write type definitions for modules
                    if (webhookTypesOutput) {
                        (0, node_fs_1.writeFileSync)(path.join(webhookDir, "validators.d.ts"), webhookTypesOutput);
                    }
                    return [4 /*yield*/, generateWebhookIndex(output, esm, prettierOptions)];
                case 7:
                    indexOutput = _b.sent();
                    (0, node_fs_1.writeFileSync)(path.join(webhookDir, "index.ts"), indexOutput);
                    _b.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.generateWebhookValidators = generateWebhookValidators;
/**
 * Generates standalone webhook validators using AJV
 * @param schema Parsed schema with webhooks
 * @param formats Whether to add format validation
 * @param formatOptions Format validation options
 * @param output Validator output format
 * @param prettierOptions Prettier formatting options
 * @returns Generated validator code
 */
function generateStandaloneWebhookValidators(schema, formats, formatOptions, output, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var ajvOptions, ajv, webhookSchemas, _i, _a, _b, webhookName, webhookSchema, combinedSchema, refs, _c, _d, webhookName, jsOutput, rawValidatorsOutput;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    ajvOptions = {
                        code: { source: true },
                        strict: false,
                        allowUnionTypes: true,
                        discriminator: true,
                        nullable: true
                    };
                    ajv = new ajv_1.default(ajvOptions);
                    if (formats) {
                        (0, ajv_formats_1.default)(ajv, formatOptions);
                    }
                    webhookSchemas = {};
                    if (schema.webhooks) {
                        for (_i = 0, _a = Object.entries(schema.webhooks); _i < _a.length; _i++) {
                            _b = _a[_i], webhookName = _b[0], webhookSchema = _b[1];
                            webhookSchemas[webhookName] = webhookSchema;
                        }
                    }
                    combinedSchema = {
                        type: "object",
                        definitions: __assign(__assign({}, schema.definitions), webhookSchemas)
                    };
                    ajv.compile(combinedSchema);
                    refs = {};
                    if (schema.webhooks) {
                        for (_c = 0, _d = Object.keys(schema.webhooks); _c < _d.length; _c++) {
                            webhookName = _d[_c];
                            refs[createWebhookValidatorName(webhookName)] = "#/definitions/".concat(webhookName);
                        }
                    }
                    jsOutput = (0, standalone_1.default)(ajv, refs);
                    // Convert to ES modules if needed
                    if (output === "module") {
                        jsOutput = jsOutput.replace(/exports\.(\w+) = (\w+)/gm, "export const $1 = $2");
                    }
                    rawValidatorsOutput = webhookValidatorsTemplate.replace(/\$Validators/g, jsOutput);
                    return [4 /*yield*/, prettier.format(rawValidatorsOutput, prettierOptions)];
                case 1: return [2 /*return*/, _e.sent()];
            }
        });
    });
}
/**
 * Generates webhook helper functions for validation
 * @param schema Parsed schema with webhooks
 * @param output Validator output format
 * @param esm Whether to use ES modules
 * @param prettierOptions Prettier formatting options
 * @returns Generated helper code
 */
function generateWebhookHelpers(schema, output, esm, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var webhookNames, importExtension, validatorImports, validatorImportStatement, webhookValidationFunctions, rawHelpersOutput;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!schema.webhooks) return [3 /*break*/, 2];
                    return [4 /*yield*/, prettier.format("// No webhooks defined", prettierOptions)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    webhookNames = Object.keys(schema.webhooks);
                    importExtension = esm ? ".js" : "";
                    validatorImports = webhookNames
                        .map(function (name) { return createWebhookValidatorName(name); })
                        .join(", ");
                    validatorImportStatement = output === "module"
                        ? "import { ".concat(validatorImports, " } from './validators").concat(importExtension, "';")
                        : "const { ".concat(validatorImports, " } = require('./validators');");
                    webhookValidationFunctions = webhookNames
                        .map(function (webhookName) { return generateWebhookValidationFunction(webhookName, schema.webhooks[webhookName]); })
                        .join("\n\n");
                    rawHelpersOutput = webhookHelpersTemplate
                        .replace(/\$ValidatorImports/g, validatorImportStatement)
                        .replace(/\$WebhookValidationFunctions/g, webhookValidationFunctions)
                        .replace(/\$WebhookNames/g, JSON.stringify(webhookNames));
                    return [4 /*yield*/, prettier.format(rawHelpersOutput, prettierOptions)];
                case 3: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Generates validation function for a specific webhook
 * @param webhookName Name of the webhook
 * @param webhookSchema Schema definition for the webhook
 * @returns Generated validation function code
 */
function generateWebhookValidationFunction(webhookName, webhookSchema) {
    var validatorName = createWebhookValidatorName(webhookName);
    var functionName = "validate".concat(capitalizeFirst(webhookName), "Webhook");
    return "\n/**\n * Validates ".concat(webhookName, " webhook data\n * @param data Data to validate\n * @returns Validation result\n */\nexport function ").concat(functionName, "(data: unknown): WebhookValidationResult {\n  const validator = ").concat(validatorName, " as WebhookValidator;\n  \n  if (validator(data)) {\n    return {\n      isValid: true,\n      data: data\n    };\n  }\n\n  const errors = validator.errors?.map(error => \n    `${error.instancePath}: ${error.message}`\n  ) || ['Unknown validation error'];\n\n  return {\n    isValid: false,\n    errors: errors\n  };\n}");
}
/**
 * Generates TypeScript type definitions for webhook validators
 * @param schema Parsed schema with webhooks
 * @param prettierOptions Prettier formatting options
 * @returns Generated type definitions
 */
function generateWebhookTypeDefinitions(schema, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var webhookNames, typeDefinitions;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!schema.webhooks) return [3 /*break*/, 2];
                    return [4 /*yield*/, prettier.format("// No webhook type definitions", prettierOptions)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    webhookNames = Object.keys(schema.webhooks);
                    typeDefinitions = webhookNames
                        .map(function (name) { return "export function ".concat(createWebhookValidatorName(name), "(json: unknown): boolean;"); })
                        .join("\n");
                    return [4 /*yield*/, prettier.format(typeDefinitions, prettierOptions)];
                case 3: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Generates index file for webhook validators
 * @param output Validator output format
 * @param esm Whether to use ES modules
 * @param prettierOptions Prettier formatting options
 * @returns Generated index file content
 */
function generateWebhookIndex(output, esm, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var importExtension, indexContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    importExtension = esm ? ".js" : "";
                    indexContent = "\nexport * from './helpers".concat(importExtension, "';\nexport type { WebhookValidator, WebhookValidationResult, WebhookValidatorHelpers } from './helpers").concat(importExtension, "';\n");
                    return [4 /*yield*/, prettier.format(indexContent, prettierOptions)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * Creates a webhook validator name from webhook name
 * @param webhookName Name of the webhook
 * @returns Validator function name
 */
function createWebhookValidatorName(webhookName) {
    return "".concat(webhookName, "WebhookValidator");
}
/**
 * Capitalizes the first letter of a string
 * @param str Input string
 * @returns String with first letter capitalized
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
// Templates
var webhookValidatorsTemplate = "\n/* eslint-disable */\n// Generated webhook validators\n\n$Validators\n";
var webhookHelpersTemplate = "\n/* eslint-disable */\n// Generated webhook validation helpers\n\n$ValidatorImports\n\n/**\n * Webhook validator function interface\n */\nexport interface WebhookValidator {\n  (json: unknown): boolean;\n  errors?: any[] | null;\n}\n\n/**\n * Webhook validation result\n */\nexport interface WebhookValidationResult {\n  isValid: boolean;\n  data?: any;\n  errors?: string[];\n}\n\n/**\n * Available webhook names\n */\nexport const WEBHOOK_NAMES = $WebhookNames;\n\n/**\n * Validates webhook data against the appropriate schema\n * @param webhookName Name of the webhook\n * @param data Data to validate\n * @returns Validation result\n */\nexport function validateWebhookData(webhookName: string, data: unknown): WebhookValidationResult {\n  if (!WEBHOOK_NAMES.includes(webhookName)) {\n    return {\n      isValid: false,\n      errors: [`Unknown webhook: ${webhookName}`]\n    };\n  }\n\n  // Dynamic validation based on webhook name\n  switch (webhookName) {\n    $WebhookValidationFunctions\n    default:\n      return {\n        isValid: false,\n        errors: [`No validator found for webhook: ${webhookName}`]\n      };\n  }\n}\n\n$WebhookValidationFunctions\n\n/**\n * Gets all available webhook names\n * @returns Array of webhook names\n */\nexport function getWebhookNames(): string[] {\n  return [...WEBHOOK_NAMES];\n}\n\n/**\n * Checks if a webhook name is valid\n * @param webhookName Name to check\n * @returns True if webhook name is valid\n */\nexport function isValidWebhookName(webhookName: string): boolean {\n  return WEBHOOK_NAMES.includes(webhookName);\n}\n";
//# sourceMappingURL=generate-webhook-validators.js.map