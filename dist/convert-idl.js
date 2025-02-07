"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIDL = void 0;
var ts = require("typescript");
var bufferSourceTypes = [
    'ArrayBuffer',
    'ArrayBufferView',
    'DataView',
    'Int8Array',
    'Uint8Array',
    'Int16Array',
    'Uint16Array',
    'Uint8ClampedArray',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
];
var integerTypes = ['byte', 'octet', 'short', 'unsigned short', 'long', 'unsigned long', 'long long', 'unsigned long long'];
var stringTypes = ['ByteString', 'DOMString', 'USVString', 'CSSOMString'];
var floatTypes = ['float', 'unrestricted float', 'double', 'unrestricted double'];
var sameTypes = ['any', 'boolean', 'Date', 'Function', 'Promise', 'void'];
var baseTypeConversionMap = new Map(__spreadArrays(__spreadArrays(bufferSourceTypes).map(function (type) { return [type, type]; }), __spreadArrays(integerTypes).map(function (type) { return [type, 'number']; }), __spreadArrays(floatTypes).map(function (type) { return [type, 'number']; }), __spreadArrays(stringTypes).map(function (type) { return [type, 'string']; }), __spreadArrays(sameTypes).map(function (type) { return [type, type]; }), [
    ['object', 'any'],
    ['sequence', 'Array'],
    ['record', 'Record'],
    ['FrozenArray', 'ReadonlyArray'],
    ['EventHandler', 'EventHandler'],
    ['VoidPtr', 'unknown'],
]));
function convertIDL(rootTypes, options) {
    var _a;
    var nodes = [];
    for (var _i = 0, rootTypes_1 = rootTypes; _i < rootTypes_1.length; _i++) {
        var rootType = rootTypes_1[_i];
        switch (rootType.type) {
            case 'interface':
            case 'interface mixin':
            case 'dictionary':
                nodes.push(convertInterface(rootType, options));
                for (var _b = 0, _c = rootType.extAttrs; _b < _c.length; _b++) {
                    var attr = _c[_b];
                    if (attr.name === 'Exposed' && ((_a = attr.rhs) === null || _a === void 0 ? void 0 : _a.value) === 'Window') {
                        nodes.push(ts.factory.createVariableStatement([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.factory.createVariableDeclarationList([
                            ts.factory.createVariableDeclaration(ts.factory.createIdentifier(rootType.name), undefined, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(rootType.name), undefined), undefined),
                        ], undefined)));
                    }
                }
                break;
            case 'includes':
                nodes.push(convertInterfaceIncludes(rootType));
                break;
            case 'enum':
                nodes.push(convertEnum(rootType));
                break;
            case 'callback':
                nodes.push(convertCallback(rootType));
                break;
            case 'typedef':
                nodes.push(convertTypedef(rootType));
                break;
            default:
                console.log(newUnsupportedError('Unsupported IDL type', rootType));
                break;
        }
    }
    return nodes;
}
exports.convertIDL = convertIDL;
function convertTypedef(idl) {
    return ts.factory.createTypeAliasDeclaration(undefined, undefined, ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType));
}
function createIterableMethods(name, keyType, valueType, pair, async) {
    return [
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments(pair ? [ts.createTupleTypeNode([keyType, valueType])] : [valueType], ts.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), async ? '[Symbol.asyncIterator]' : '[Symbol.iterator]', undefined),
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments([ts.createTupleTypeNode([keyType, valueType])], ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), 'entries', undefined),
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments([keyType], ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), 'keys', undefined),
        ts.createMethodSignature([], [], ts.createExpressionWithTypeArguments([valueType], ts.factory.createIdentifier(async ? 'AsyncIterableIterator' : 'IterableIterator')), 'values', undefined),
        ts.createMethodSignature([], [
            ts.factory.createParameterDeclaration([], [], undefined, 'callbackfn', undefined, ts.createFunctionTypeNode([], [
                ts.factory.createParameterDeclaration([], [], undefined, 'value', undefined, valueType),
                ts.factory.createParameterDeclaration([], [], undefined, pair ? 'key' : 'index', undefined, keyType),
                ts.factory.createParameterDeclaration([], [], undefined, pair ? 'iterable' : 'array', undefined, pair ? ts.createTypeReferenceNode(name, []) : ts.createArrayTypeNode(valueType)),
            ], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword))),
            ts.factory.createParameterDeclaration([], [], undefined, 'thisArg', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
        ], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 'forEach', undefined),
    ];
}
function convertInterface(idl, options) {
    var members = [];
    var inheritance = [];
    if ('inheritance' in idl && idl.inheritance) {
        inheritance.push(ts.createExpressionWithTypeArguments(undefined, ts.factory.createIdentifier(idl.inheritance)));
    }
    idl.members.forEach(function (member) {
        switch (member.type) {
            case 'attribute':
                // if (options?.emscripten) {
                //   members.push(createAttributeGetter(member))
                //   members.push(createAttributeSetter(member))
                // }
                members.push(convertMemberAttribute(member));
                break;
            case 'operation':
                if (member.name === idl.name) {
                    members.push(convertMemberConstructor(member, options));
                }
                else {
                    members.push(convertMemberOperation(member));
                }
                break;
            case 'constructor':
                members.push(convertMemberConstructor(member, options));
                break;
            case 'field':
                members.push(convertMemberField(member));
                break;
            case 'const':
                members.push(convertMemberConst(member));
                break;
            case 'iterable': {
                var indexedPropertyGetter = idl.members.find(function (member) {
                    return member.type === 'operation' && member.special === 'getter' && member.arguments[0].idlType.idlType === 'unsigned long';
                });
                if ((indexedPropertyGetter && member.idlType.length === 1) || member.idlType.length === 2) {
                    var keyType = convertType(indexedPropertyGetter ? indexedPropertyGetter.arguments[0].idlType : member.idlType[0]);
                    var valueType = convertType(member.idlType[member.idlType.length - 1]);
                    members.push.apply(members, createIterableMethods(idl.name, keyType, valueType, member.idlType.length === 2, member.async));
                }
                break;
            }
            default:
                console.log(newUnsupportedError('Unsupported IDL member', member));
                break;
        }
    });
    if (options === null || options === void 0 ? void 0 : options.emscripten) {
        return ts.createClassDeclaration(undefined, [], ts.factory.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
    }
    return ts.createInterfaceDeclaration(undefined, [], ts.factory.createIdentifier(idl.name), undefined, !inheritance.length ? undefined : [ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, inheritance)], members);
}
function convertInterfaceIncludes(idl) {
    return ts.createInterfaceDeclaration(undefined, [], ts.factory.createIdentifier(idl.target), undefined, [
        ts.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            ts.createExpressionWithTypeArguments(undefined, ts.factory.createIdentifier(idl.includes)),
        ]),
    ], []);
}
function createAttributeGetter(value) {
    return ts.createMethodSignature([], [], convertType(value.idlType), 'get_' + value.name, undefined);
}
function createAttributeSetter(value) {
    var parameter = ts.factory.createParameterDeclaration([], [], undefined, value.name, undefined, convertType(value.idlType));
    return ts.createMethodSignature([], [parameter], ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword), 'set_' + value.name, undefined);
}
function convertMemberOperation(idl) {
    var args = idl.arguments.map(convertArgument);
    var modifiers = [];
    if (idl.special === 'static') {
        modifiers.push(ts.factory.createModifier(ts.SyntaxKind.StaticKeyword));
    }
    return ts.factory.createMethodSignature(modifiers, idl.name, undefined, [], args, convertType(idl.idlType));
}
function convertMemberConstructor(idl, options) {
    var args = idl.arguments.map(convertArgument);
    if (options.emscripten) {
        return ts.createMethodSignature([], args, undefined, 'constructor', undefined);
    }
    return ts.createConstructSignature([], args, undefined);
}
function convertMemberField(idl) {
    var optional = !idl.required ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.createPropertySignature(undefined, ts.factory.createIdentifier(idl.name), optional, convertType(idl.idlType), undefined);
}
function convertMemberConst(idl) {
    return ts.createPropertySignature([ts.createModifier(ts.SyntaxKind.ReadonlyKeyword)], ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType), undefined);
}
function convertMemberAttribute(idl) {
    var modifiers = [];
    if (idl.special == 'static') {
        modifiers.push(ts.factory.createModifier(ts.SyntaxKind.StaticKeyword));
    }
    if (idl.readonly) {
        modifiers.push(ts.createModifier(ts.SyntaxKind.ReadonlyKeyword));
    }
    return ts.createPropertySignature(modifiers, ts.factory.createIdentifier(idl.name), undefined, convertType(idl.idlType), undefined);
}
function convertArgument(idl) {
    var optional = idl.optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined;
    return ts.factory.createParameterDeclaration([], [], undefined, idl.name, optional, convertType(idl.idlType));
}
function convertType(idl) {
    if (typeof idl.idlType === 'string') {
        var type = baseTypeConversionMap.get(idl.idlType) || idl.idlType;
        switch (type) {
            case 'number':
                return ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
            case 'string':
                return ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
            case 'void':
                return ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
            default:
                return ts.createTypeReferenceNode(type, []);
        }
    }
    if (idl.generic) {
        var type = baseTypeConversionMap.get(idl.generic) || idl.generic;
        return ts.createTypeReferenceNode(ts.factory.createIdentifier(type), idl.idlType.map(convertType));
    }
    if (idl.union) {
        return ts.createUnionTypeNode(idl.idlType.map(convertType));
    }
    console.log(newUnsupportedError('Unsupported IDL type', idl));
    return ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}
function convertEnum(idl) {
    return ts.factory.createEnumDeclaration([], [], ts.factory.createIdentifier(idl.name), idl.values.map(function (it) {
        var name = it.value.includes('::e') ? it.value.split('::e')[1] : it.value;
        return ts.factory.createEnumMember("'" + name + "'");
    }));
}
function convertCallback(idl) {
    return ts.factory.createTypeAliasDeclaration(undefined, undefined, ts.factory.createIdentifier(idl.name), undefined, ts.createFunctionTypeNode(undefined, idl.arguments.map(convertArgument), convertType(idl.idlType)));
}
function newUnsupportedError(message, idl) {
    return new Error("\n  " + message + "\n  " + JSON.stringify(idl, null, 2) + "\n\n  Please file an issue at https://github.com/giniedp/webidl2ts and provide the used idl file or example.\n");
}
