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
exports.generate = void 0;
var lodash_keyby_1 = __importDefault(require("lodash.keyby"));
var parse_schema_1 = require("./parse-schema");
var generate_meta_1 = require("./generate/generate-meta");
var generate_compile_decoders_1 = require("./generate/generate-compile-decoders");
var generate_standalone_decoders_1 = require("./generate/generate-standalone-decoders");
var generate_helpers_1 = require("./generate/generate-helpers");
var generate_models_1 = require("./generate/generate-models");
var generate_ajv_validator_1 = require("./generate/generate-ajv-validator");
function generate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return __awaiter(this, void 0, void 0, function () {
        var schemaFile, schemaType, prettierOptions, directories, schema, allDefinitions, whistlistedDecoders, decoderWhitelistById, definitionNames;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    schemaFile = options.schemaFile, schemaType = options.schemaType;
                    prettierOptions = (_a = options.prettierOptions) !== null && _a !== void 0 ? _a : { parser: "typescript" };
                    directories = typeof options.directory === "string"
                        ? [options.directory]
                        : options.directory;
                    if ((_b = options.debug) !== null && _b !== void 0 ? _b : false) {
                        console.info("Start generating files for ".concat(schemaType, " schema: ").concat(schemaFile));
                    }
                    return [4 /*yield*/, (0, parse_schema_1.parseSchema)(schemaFile, schemaType)];
                case 1:
                    schema = _l.sent();
                    allDefinitions = Object.keys(schema.definitions);
                    whistlistedDecoders = (_c = options.decoders) !== null && _c !== void 0 ? _c : schema.whitelistedDecoders;
                    decoderWhitelistById = whistlistedDecoders
                        ? (0, lodash_keyby_1.default)(whistlistedDecoders, function (d) { return d; })
                        : undefined;
                    definitionNames = allDefinitions.filter(function (name) {
                        var _a;
                        var schemaType = (_a = schema.definitions[name]) === null || _a === void 0 ? void 0 : _a.type;
                        return !decoderWhitelistById || decoderWhitelistById[name];
                    });
                    if (options.skipDecoders !== true && definitionNames.length > 0) {
                        (0, generate_ajv_validator_1.generateAjvValidator)(prettierOptions, directories);
                        if (!options.standalone) {
                            (0, generate_compile_decoders_1.generateCompileBasedDecoders)(definitionNames, (_d = options.addFormats) !== null && _d !== void 0 ? _d : false, options.formatOptions, directories, prettierOptions);
                        }
                        else if (options.standalone.mergeDecoders === true) {
                            (0, generate_standalone_decoders_1.generateStandaloneMergedDecoders)(definitionNames, schema, (_e = options.addFormats) !== null && _e !== void 0 ? _e : false, options.formatOptions, options.esm ? "module" : options.standalone.validatorOutput, (_f = options.esm) !== null && _f !== void 0 ? _f : false, directories, prettierOptions);
                        }
                        else {
                            (0, generate_standalone_decoders_1.generateStandaloneDecoders)(definitionNames, schema, (_g = options.addFormats) !== null && _g !== void 0 ? _g : false, options.formatOptions, options.esm ? "module" : options.standalone.validatorOutput, (_h = options.esm) !== null && _h !== void 0 ? _h : false, directories, prettierOptions);
                        }
                    }
                    return [4 /*yield*/, (0, generate_models_1.generateModels)(schema, { skipSchemaFile: options.skipSchemaFile }, prettierOptions, directories)];
                case 2:
                    _l.sent();
                    (0, generate_helpers_1.generateHelpers)(prettierOptions, directories);
                    if (options.skipMetaFile !== true) {
                        (0, generate_meta_1.generateMetaFile)(allDefinitions, directories, prettierOptions, (_j = options.esm) !== null && _j !== void 0 ? _j : false);
                    }
                    if ((_k = options.debug) !== null && _k !== void 0 ? _k : false) {
                        console.info("Successfully generated files for ".concat(schemaFile));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.generate = generate;
//# sourceMappingURL=generate.js.map