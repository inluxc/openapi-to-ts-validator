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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsArray = exports.conditional = exports.tuple = exports.const = exports.constFunction = exports.constSchema = exports.compose = exports.constant = exports.enumerate = exports.anyOf = exports.oneOf = exports.optional = exports.nillable = exports.nullable = exports.map = exports.array = exports.ref = exports.object = exports.relativeJsonPointer = exports.jsonPointer = exports.uuid = exports.regex = exports.ipv6 = exports.ipv4 = exports.hostname = exports.email = exports.uriTemplate = exports.uriReference = exports.uri = exports.duration = exports.dateTime = exports.time = exports.date = exports.anonymousData = exports.any = exports.boolean = exports.number = exports.string = void 0;
var string = function (options) {
    if (options === void 0) { options = {}; }
    return (__assign({ type: "string" }, options));
};
exports.string = string;
var number = function (options) {
    if (options === void 0) { options = {}; }
    return (__assign({ type: "number" }, options));
};
exports.number = number;
var boolean = function (options) {
    if (options === void 0) { options = {}; }
    return (__assign({ type: "boolean" }, options));
};
exports.boolean = boolean;
var any = function (options) {
    if (options === void 0) { options = {}; }
    return (__assign({}, options));
};
exports.any = any;
var anonymousData = function (options) { return (__assign({ additionalProperties: { type: "string" } }, options)); };
exports.anonymousData = anonymousData;
var stringFormat = function (format) {
    return function (options) {
        if (options === void 0) { options = {}; }
        return __assign({ type: "string", format: format }, (options !== null && options !== void 0 ? options : {}));
    };
};
exports.date = stringFormat("date");
exports.time = stringFormat("time");
exports.dateTime = stringFormat("date-time");
exports.duration = stringFormat("duration");
exports.uri = stringFormat("uri");
exports.uriReference = stringFormat("uri-reference");
exports.uriTemplate = stringFormat("uri-template");
exports.email = stringFormat("email");
exports.hostname = stringFormat("hostname");
exports.ipv4 = stringFormat("ipv4");
exports.ipv6 = stringFormat("ipv6");
exports.regex = stringFormat("regex");
exports.uuid = stringFormat("uuid");
exports.jsonPointer = stringFormat("json-pointer");
exports.relativeJsonPointer = stringFormat("relative-json-pointer");
var object = function (properties, options) {
    if (options === void 0) { options = {}; }
    var required = [];
    var schemaProperties = {};
    for (var _i = 0, _a = Object.entries(properties); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], property = _b[1];
        if (property.kind === "custom") {
            if (!property.optional) {
                required.push("key");
            }
            schemaProperties[key] = property.object;
        }
        else {
            required.push(key);
            schemaProperties[key] = property;
        }
    }
    return __assign({ type: "object", properties: schemaProperties, required: required.length === 0 ? undefined : required }, options);
};
exports.object = object;
var ref = function (refName) { return ({
    $ref: "#/definitions/".concat(refName),
}); };
exports.ref = ref;
var autoRef = function (type) {
    return typeof type === "string" ? (0, exports.ref)(type) : type;
};
var array = function (itemType, options) {
    if (options === void 0) { options = {}; }
    return (__assign({ type: "array", items: autoRef(itemType) }, options));
};
exports.array = array;
var map = function (itemType) { return ({
    type: "object",
    patternProperties: {
        ".*": autoRef(itemType),
    },
    additionalProperties: false,
}); };
exports.map = map;
var nullable = function (type) {
    var obj = autoRef(type);
    var types = [
        "string",
        "number",
        "boolean",
        "integer",
    ];
    if (typeof obj.type === "string" && types.includes(obj.type)) {
        return __assign(__assign({}, obj), { type: [obj.type, "null"] });
    }
    return (0, exports.anyOf)([obj, { type: "null" }]);
};
exports.nullable = nullable;
var nillable = function (type) {
    return (0, exports.optional)((0, exports.nullable)(type));
};
exports.nillable = nillable;
var optional = function (type) { return ({
    kind: "custom",
    object: autoRef(type),
    optional: true,
}); };
exports.optional = optional;
var oneOf = function (types) { return ({
    oneOf: types.map(autoRef),
}); };
exports.oneOf = oneOf;
var anyOf = function (types) { return ({
    anyOf: types.map(autoRef),
}); };
exports.anyOf = anyOf;
var enumerate = function (values) { return ({
    type: "string",
    enum: values,
}); };
exports.enumerate = enumerate;
var constant = function (value) { return ({
    type: "string",
    enum: [value],
}); };
exports.constant = constant;
var compose = function () {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sources[_i] = arguments[_i];
    }
    if (sources === undefined) {
        throw new Error("Sources for 'compose' cannot be undefined");
    }
    var properties = {};
    var requiredRecord = {};
    for (var _a = 0, sources_1 = sources; _a < sources_1.length; _a++) {
        var source = sources_1[_a];
        Object.assign(properties, source.properties);
        if (Array.isArray(source.required)) {
            for (var _b = 0, _c = source.required; _b < _c.length; _b++) {
                var key = _c[_b];
                requiredRecord[key] = true;
            }
        }
    }
    var required = Object.keys(requiredRecord);
    return {
        type: "object",
        properties: properties,
        required: required.length === 0 ? undefined : required,
    };
};
exports.compose = compose;
var constSchema = function (value, options) {
    if (options === void 0) { options = {}; }
    // Validate that the value is JSON-serializable
    try {
        JSON.stringify(value);
    }
    catch (error) {
        throw new Error('const value must be JSON-serializable');
    }
    // Check for unsupported types
    if (typeof value === 'symbol' || typeof value === 'function' || typeof value === 'undefined') {
        throw new Error('Unsupported const value type');
    }
    // Determine the type based on the value
    var type;
    if (value === null) {
        type = 'null';
    }
    else if (typeof value === 'string') {
        type = 'string';
    }
    else if (typeof value === 'boolean') {
        type = 'boolean';
    }
    else if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'number';
    }
    else if (Array.isArray(value)) {
        type = 'array';
    }
    else if (typeof value === 'object') {
        type = 'object';
    }
    else {
        throw new Error('Unsupported const value type');
    }
    return __assign({ const: value, type: type, enum: [value] }, options);
};
exports.constSchema = constSchema;
// Simplified const function for common use cases
var constFunction = function (value, options) {
    if (options === void 0) { options = {}; }
    var type;
    if (typeof value === 'string') {
        type = 'string';
    }
    else if (typeof value === 'boolean') {
        type = 'boolean';
    }
    else if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'number';
    }
    else {
        throw new Error('const() only supports string, number, and boolean values');
    }
    return __assign({ const: value, type: type, enum: [value] }, options);
};
exports.constFunction = constFunction;
exports.const = exports.constFunction;
var tuple = function (items, options) {
    if (options === void 0) { options = {}; }
    var additionalItems = options.additionalItems, arrayOptions = __rest(options, ["additionalItems"]);
    var result = __assign({ type: 'array', prefixItems: items.map(autoRef) }, arrayOptions);
    if (additionalItems === true) {
        result.items = true; // OpenAPI 3.1 allows boolean for items
    }
    else if (additionalItems !== undefined && additionalItems !== false) {
        result.items = autoRef(additionalItems);
    }
    else {
        result.items = false; // OpenAPI 3.1 allows boolean for items
    }
    return result;
};
exports.tuple = tuple;
var conditional = function (ifCondition, thenSchema, elseSchema, options) {
    if (options === void 0) { options = {}; }
    var result = __assign({ if: autoRef(ifCondition), then: autoRef(thenSchema) }, options);
    if (elseSchema !== undefined) {
        result.else = autoRef(elseSchema);
    }
    return result;
};
exports.conditional = conditional;
var containsArray = function (containsSchema, options) {
    if (options === void 0) { options = {}; }
    var minContains = options.minContains, maxContains = options.maxContains, arrayOptions = __rest(options, ["minContains", "maxContains"]);
    // Validate minContains
    if (minContains !== undefined) {
        if (!Number.isInteger(minContains) || minContains < 0) {
            throw new Error('minContains must be a non-negative integer');
        }
    }
    // Validate maxContains
    if (maxContains !== undefined) {
        if (!Number.isInteger(maxContains) || maxContains < 0) {
            throw new Error('maxContains must be a non-negative integer');
        }
    }
    // Validate minContains <= maxContains
    if (minContains !== undefined && maxContains !== undefined && minContains > maxContains) {
        throw new Error('minContains must be less than or equal to maxContains');
    }
    var result = __assign({ type: 'array', contains: autoRef(containsSchema) }, arrayOptions);
    if (minContains !== undefined) {
        result.minContains = minContains;
    }
    if (maxContains !== undefined) {
        result.maxContains = maxContains;
    }
    return result;
};
exports.containsArray = containsArray;
//# sourceMappingURL=builder.js.map