"use strict";
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
exports.generateStandaloneMergedDecoders = exports.generateStandaloneDecoders = void 0;
var ajv_1 = __importDefault(require("ajv"));
var ajv_formats_1 = __importDefault(require("ajv-formats"));
var standalone_1 = __importDefault(require("ajv/dist/standalone"));
var node_fs_1 = require("node:fs");
var path = __importStar(require("node:path"));
var prettier = __importStar(require("prettier"));
var generation_utils_1 = require("./generation-utils");
function generateStandaloneDecoders(definitionNames, schema, addFormats, formatOptions, output, esm, outDirs, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var indexExports, indexOutputRaw, indexOutput, _i, outDirs_1, outDir, decoderDir;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    indexExports = [];
                    return [4 /*yield*/, Promise.all(definitionNames.map(function (definitionName) { return __awaiter(_this, void 0, void 0, function () {
                            var validatorName, decoderName, validatorsOutput, validatorImportStatement, rawDecoderOutput, decoderOutput, validatorDefinitions, _i, outDirs_2, outDir, decoderDir;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        validatorName = (0, generation_utils_1.createValidatorName)(definitionName);
                                        decoderName = (0, generation_utils_1.createDecoderName)(definitionName);
                                        return [4 /*yield*/, standAloneValidatorOutput(schema, [definitionName], addFormats, formatOptions, output, prettierOptions)];
                                    case 1:
                                        validatorsOutput = _a.sent();
                                        validatorImportStatement = createValidatorImportStatement(validatorName, output, false, esm);
                                        rawDecoderOutput = decoderFileTemplate(esm)
                                            .replace(/\$DecoderName/g, decoderName)
                                            .replace(/\$Class/g, definitionName)
                                            .replace(/\$ValidatorImports/g, validatorImportStatement)
                                            .replace(/\$ValidatorName/g, validatorName);
                                        return [4 /*yield*/, prettier.format(rawDecoderOutput, prettierOptions)];
                                    case 2:
                                        decoderOutput = _a.sent();
                                        return [4 /*yield*/, validatorDefinitionsOutput([definitionName], prettierOptions)];
                                    case 3:
                                        validatorDefinitions = _a.sent();
                                        indexExports.push("export { ".concat(decoderName, " } from './").concat(definitionName, "/decoder").concat(esm ? ".js" : "", "';"));
                                        for (_i = 0, outDirs_2 = outDirs; _i < outDirs_2.length; _i++) {
                                            outDir = outDirs_2[_i];
                                            decoderDir = path.join(outDir, "decoders", definitionName);
                                            (0, node_fs_1.mkdirSync)(decoderDir, { recursive: true });
                                            (0, node_fs_1.writeFileSync)(path.join(decoderDir, "decoder.ts"), decoderOutput);
                                            (0, node_fs_1.writeFileSync)(path.join(decoderDir, "validator.js"), validatorsOutput);
                                            if (output === "module") {
                                                (0, node_fs_1.writeFileSync)(path.join(decoderDir, "validator.d.ts"), validatorDefinitions);
                                            }
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    _a.sent();
                    indexOutputRaw = decodersFileTemplate.replace(/\$Exports/gm, indexExports.join("\n"));
                    return [4 /*yield*/, prettier.format(indexOutputRaw, prettierOptions)];
                case 2:
                    indexOutput = _a.sent();
                    for (_i = 0, outDirs_1 = outDirs; _i < outDirs_1.length; _i++) {
                        outDir = outDirs_1[_i];
                        decoderDir = path.join(outDir, "decoders");
                        (0, node_fs_1.mkdirSync)(decoderDir, { recursive: true });
                        (0, node_fs_1.writeFileSync)(path.join(decoderDir, "index.ts"), indexOutput);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.generateStandaloneDecoders = generateStandaloneDecoders;
function generateStandaloneMergedDecoders(definitionNames, schema, addFormats, formatOptions, output, esm, outDirs, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var decoders, validatorImports, validatorImportStatement, rawDecoderOutput, decoderOutput, validatorOutput, rawValidatorsOutput, validatorsOutput, validatorDefinitions, _i, outDirs_3, outDir;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    decoders = definitionNames
                        .map(function (definitionName) {
                        return decoderTemplate
                            .replace(/\$DecoderName/g, (0, generation_utils_1.createDecoderName)(definitionName))
                            .replace(/\$Class/g, definitionName)
                            .replace(/\$ValidatorName/g, (0, generation_utils_1.createValidatorName)(definitionName))
                            .trim();
                    })
                        .join("\n");
                    validatorImports = definitionNames
                        .map(function (d) { return (0, generation_utils_1.createValidatorName)(d); })
                        .join(", ");
                    validatorImportStatement = createValidatorImportStatement(validatorImports, output, true, esm);
                    rawDecoderOutput = mergedDecodersFileTemplate(esm)
                        .replace(/\$ValidatorImports/g, validatorImportStatement)
                        .replace(/\$ModelImports/g, definitionNames.join(", "))
                        .replace(/\$Decoders/g, decoders);
                    return [4 /*yield*/, prettier.format(rawDecoderOutput, prettierOptions)];
                case 1:
                    decoderOutput = _a.sent();
                    return [4 /*yield*/, standAloneValidatorOutput(schema, definitionNames, addFormats, formatOptions, output, prettierOptions)];
                case 2:
                    validatorOutput = _a.sent();
                    rawValidatorsOutput = validatorsFileTemplate.replace(/\$Validators/g, validatorOutput);
                    return [4 /*yield*/, prettier.format(rawValidatorsOutput, prettierOptions)];
                case 3:
                    validatorsOutput = _a.sent();
                    return [4 /*yield*/, validatorDefinitionsOutput(definitionNames, prettierOptions)];
                case 4:
                    validatorDefinitions = _a.sent();
                    for (_i = 0, outDirs_3 = outDirs; _i < outDirs_3.length; _i++) {
                        outDir = outDirs_3[_i];
                        (0, node_fs_1.mkdirSync)(outDir, { recursive: true });
                        (0, node_fs_1.writeFileSync)(path.join(outDir, "decoders.ts"), decoderOutput);
                        (0, node_fs_1.writeFileSync)(path.join(outDir, "validators.js"), validatorsOutput);
                        if (output === "module") {
                            (0, node_fs_1.writeFileSync)(path.join(outDir, "validators.d.ts"), validatorDefinitions);
                        }
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.generateStandaloneMergedDecoders = generateStandaloneMergedDecoders;
function createValidatorImportStatement(validatorImportString, output, merged, esm) {
    var fileName = merged ? "validators" : "validator";
    switch (output) {
        case "commonjs":
            return "const { ".concat(validatorImportString, " } = require(\"./").concat(fileName, "\")");
        case "module":
            if (!esm) {
                return "import { ".concat(validatorImportString, " } from './").concat(fileName, "'");
            }
            return "import { ".concat(validatorImportString, " } from './").concat(fileName, ".js'");
    }
}
function standAloneValidatorOutput(schema, definitions, formats, formatOptions, output, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var ajv, refs, jsOutput, rawValidatorsOutput, validatorsOutput;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ajv = new ajv_1.default({ code: { source: true }, strict: false });
                    if (formats) {
                        (0, ajv_formats_1.default)(ajv, formatOptions);
                    }
                    ajv.compile(JSON.parse(schema.json));
                    refs = definitions.reduce(function (acc, definitionName) {
                        acc[(0, generation_utils_1.createValidatorName)(definitionName)] = "#/definitions/".concat(definitionName);
                        return acc;
                    }, {});
                    jsOutput = (0, standalone_1.default)(ajv, refs);
                    if (output === "module") {
                        jsOutput = jsOutput.replace(/exports\.(\w+Validator) = (\w+)/gm, "export const $1 = $2");
                    }
                    rawValidatorsOutput = validatorsFileTemplate.replace(/\$Validators/g, jsOutput);
                    return [4 /*yield*/, prettier.format(rawValidatorsOutput, prettierOptions)];
                case 1:
                    validatorsOutput = _a.sent();
                    return [2 /*return*/, validatorsOutput];
            }
        });
    });
}
function validatorDefinitionsOutput(definitions, prettierOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var raw;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    raw = definitions
                        .map(function (d) {
                        return "export function ".concat((0, generation_utils_1.createValidatorName)(d), "(json: unknown): boolean;");
                    })
                        .join("\n");
                    return [4 /*yield*/, prettier.format(raw, prettierOptions)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
var validatorsFileTemplate = "\n/* eslint-disable */\n\n$Validators\n";
var decoderTemplate = "\nexport const $DecoderName: Decoder<$Class> = {\n  definitionName: '$Class',\n  schemaRef: '#/definitions/$Class',\n\n  decode(json: unknown): $Class {\n    return validateJson(json, $ValidatorName as Validator, $DecoderName.definitionName);\n  }\n}\n";
var decoderFileTemplate = function (esm) {
    var importExtension = esm ? ".js" : "";
    return "\n  /* eslint-disable */\n\n  import { Decoder } from '../../helpers".concat(importExtension, "';\n  import { validateJson, Validator } from '../../validate").concat(importExtension, "';\n  import { $Class } from '../../models").concat(importExtension, "';\n  $ValidatorImports\n\n  ").concat(decoderTemplate, "\n  ");
};
var decodersFileTemplate = "\n/* eslint-disable */\n\n$Exports\n";
var mergedDecodersFileTemplate = function (esm) {
    var importExtension = esm ? ".js" : "";
    return "\n  /* eslint-disable */\n\n  import { Decoder } from './helpers".concat(importExtension, "';\n  import { validateJson, Validator } from './validate").concat(importExtension, "';\n  import { $ModelImports } from './models").concat(importExtension, "';\n  $ValidatorImports\n\n  $Decoders\n  ");
};
//# sourceMappingURL=generate-standalone-decoders.js.map