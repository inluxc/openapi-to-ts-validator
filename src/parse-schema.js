"use strict";
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
exports.parseSchema = void 0;
var json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
var node_fs_1 = require("node:fs");
var js_yaml_1 = __importDefault(require("js-yaml"));
var node_path_1 = require("node:path");
var openapi_schema_to_json_schema_1 = __importDefault(require("@openapi-contrib/openapi-schema-to-json-schema"));
var version_detection_1 = require("./version-detection");
function parseSchema(inputFilePath, schemaType, options) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (schemaType) {
                case "json":
                case "yaml":
                    return [2 /*return*/, parseOpenApiSchema(inputFilePath, schemaType, options)];
                case "custom":
                    return [2 /*return*/, parseCustomSchema(inputFilePath, options)];
            }
            return [2 /*return*/];
        });
    });
}
exports.parseSchema = parseSchema;
function parseOpenApiSchema(inputFilePath, schemaType, options) {
    return __awaiter(this, void 0, void 0, function () {
        var schema, inputFileContent, version, originalDirectory, properties, definitions, _i, _a, _b, key, value, schemaJsonOutput;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    inputFileContent = (0, node_fs_1.readFileSync)(inputFilePath, "utf8");
                    if (schemaType === "yaml") {
                        schema = js_yaml_1.default.load(inputFileContent);
                    }
                    else {
                        schema = JSON.parse(inputFileContent);
                    }
                    version = (0, version_detection_1.detectOpenAPIVersion)(schema);
                    originalDirectory = process.cwd();
                    process.chdir((0, node_path_1.dirname)(inputFilePath));
                    return [4 /*yield*/, json_schema_ref_parser_1.default.bundle(schema)];
                case 1:
                    // resolve external references to original schema
                    schema = _c.sent();
                    // change back to original directory
                    process.chdir(originalDirectory);
                    properties = {};
                    definitions = {};
                    for (_i = 0, _a = Object.entries(schema.components.schemas); _i < _a.length; _i++) {
                        _b = _a[_i], key = _b[0], value = _b[1];
                        properties[key] = { $ref: "#/definitions/".concat(key) };
                        definitions[key] = (0, openapi_schema_to_json_schema_1.default)(value);
                    }
                    schemaJsonOutput = JSON.stringify({
                        type: "object",
                        title: "Schema",
                        definitions: definitions,
                        properties: properties,
                    }, undefined, 2).replace(/\#\/components\/schemas/g, "#/definitions");
                    return [2 /*return*/, {
                            json: schemaJsonOutput,
                            definitions: definitions,
                            whitelistedDecoders: undefined,
                            version: version,
                        }];
            }
        });
    });
}
function parseCustomSchema(inputFilePath, options) {
    var schema = require(inputFilePath);
    if (typeof schema.types !== "object") {
        throw new Error('schema "types" should be an object');
    }
    var properties = {};
    var definitions = {};
    for (var _i = 0, _a = Object.entries(schema.types); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        properties[key] = { $ref: "#/definitions/".concat(key) };
        definitions[key] = value;
    }
    var schemaJsonOutput = JSON.stringify({
        type: "object",
        title: "Schema",
        definitions: definitions,
        properties: properties,
    }, undefined, 2);
    // For custom schemas, create a default version info since they don't have OpenAPI version
    var version = {
        version: "custom",
        major: 0,
        minor: 0,
        isVersion31: false,
        isVersion30: false,
    };
    return {
        json: schemaJsonOutput,
        definitions: definitions,
        whitelistedDecoders: schema.decoders,
        version: version,
    };
}
//# sourceMappingURL=parse-schema.js.map