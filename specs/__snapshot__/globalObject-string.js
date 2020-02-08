function __bindCheck(value, name, path, mappedName) {
    for (const i of name) {
        if (!Object.hasOwnProperty.call(value, i))
            throw new SyntaxError(`Uncaught SyntaxError: The requested module '${path}' (mapped as ${mappedName}) does not provide an export named '${i}'`);
    }
    return value;
}
function __dynImportTransform(path) {
    const BareModuleRewriteSimple = { "snowpack": "snowpack", "umd": "umd", "unpkg": "unpkg", "pikacdn": "pikacdn" };
    const parsedRegExpCache = new Map();
    const config = { "after": true, "globalObject": "global" };
    function dynamicImport(path) {
        return import(path);
    }
    const result = runtimeTransform(config, path, dynamicImport);
    if (result === null)
        return dynamicImport(path);
    return result;
    function parseJS(...a) {
        return null;
    }
    function runtimeTransform(config, path, dynamicImport) {
        const result = moduleSpecifierTransform({ config, path, queryWellknownUMD: () => undefined });
        const header = `ttypescript-browser-like-import-transformer: Runtime transform error:`;
        switch (result.type) {
            case "error":
                console.
                    // Static dynamic import
                    error(header, result.reason, `raw specifier:`, path);
                return null;
            case "rewrite":
                return dynamicImport(result.nextPath);
            case "umd":
                if (config.globalObject === "globalThis" || config.globalObject === undefined)
                    return Promise.resolve(globalThis[result.target]);
                if (config.globalObject === "window")
                    return Promise.resolve(window[result.target]);
                return Promise.reject(header + "Unreachable transform case");
            default: return Promise.reject(header + "Unreachable transform case");
        }
    }
    function moduleSpecifierTransform(ctx, opt = ctx.config.bareModuleRewrite) {
        var _a, _b, _c, _d;
        if (opt === false)
            return { type: "noop" };
        const { path, config, ts, queryWellknownUMD } = ctx;
        if (isBrowserCompatibleModuleSpecifier(path)) {
            if (path === ".")
                return { type: "noop" };
            if (config.appendExtensionName === false)
                return { type: "noop" };
            if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path))
                return { type: "noop" };
            const nextPath = appendExtensionName(path, config.appendExtensionName === true ? ".js" : (_a = config.appendExtensionName) !== null && _a !== void 0 ? _a : ".js");
            return { type: "rewrite", nextPath: nextPath };
        }
        switch (opt) {
            case BareModuleRewriteSimple.snowpack:
            case BareModuleRewriteSimple.pikacdn:
            case BareModuleRewriteSimple.unpkg: {
                const table = {
                    [BareModuleRewriteSimple.pikacdn]: "https://cdn.pika.dev/%1", [BareModuleRewriteSimple.unpkg]: "https://unpkg.com/%1@latest/?module", [BareModuleRewriteSimple.snowpack]: `${(_b = config.webModulePath) !== null && _b !== void 0 ? _b : "/web_modules/"}%1.js`,
                };
                return { nextPath: table[opt].replace("%1", path), type: "rewrite" };
            }
            case BareModuleRewriteSimple.umd:
            case undefined: {
                const nextPath = importPathToUMDName(path);
                if (!nextPath) {
                    const err = `The transformer doesn't know how to transform this module specifier. Please specify the transform rule in the config.`;
                    return { type: "error", reason: err };
                }
                return { type: "umd", target: nextPath, globalObject: config.globalObject };
            }
            default: {
                const rules = opt;
                for (const rule in rules) {
                    const ruleValue = rules[rule];
                    if (ts) {
                        if (!parsedRegExpCache.has(rule)) {
                            const literal = parseJS(ts, rule, ts.isRegularExpressionLiteral);
                            if (rule.startsWith("/") && literal === null) {
                                console.error("Might be an invalid regexp:", rule);
                            }
                            if (literal) {
                                try {
                                    const next = eval(literal.text);
                                    parsedRegExpCache.set(rule, next);
                                }
                                catch (e) {
                                    console.error("Might be invalid regexp:", literal.text);
                                    console.error(e);
                                }
                            }
                        }
                    }
                    else if (rule.startsWith("/")) {
                        console.warn("RegExp rule is not supported in runtime due to the risk of eval");
                    }
                    const regexp = parsedRegExpCache.get(rule);
                    if (regexp && path.match(regexp)) {
                        if (ruleValue === false)
                            return { type: "noop" };
                        if (typeof ruleValue === "string")
                            return moduleSpecifierTransform(ctx, ruleValue);
                        const nextPath = path.replace(regexp, ruleValue.target);
                        if (!nextPath)
                            return {
                                type: "error", reason: "The transform result is an empty string. Skipped.",
                            };
                        return {
                            type: "umd", target: nextPath, globalObject: (_c = ruleValue.globalObject) !== null && _c !== void 0 ? _c : config.globalObject,
                        };
                    }
                    else if (rule === path) {
                        if (ruleValue === false)
                            return { type: "noop" };
                        if (typeof ruleValue === "string")
                            return moduleSpecifierTransform(ctx, ruleValue);
                        return {
                            type: "umd", target: ruleValue.target, globalObject: (_d = ruleValue.globalObject) !== null && _d !== void 0 ? _d : config.globalObject,
                        };
                    }
                }
            }
        }
        return { type: "noop" };
        function isBrowserCompatibleModuleSpecifier(path) {
            return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path);
        }
        function isHTTPModuleSpecifier(path) {
            return path.startsWith("http://") || path.startsWith("https://");
        }
        function isLocalModuleSpecifier(path) {
            return path.startsWith(".") || path.startsWith("/");
        }
        function appendExtensionName(path, expectedExt) {
            if (path.endsWith(expectedExt))
                return path;
            return path + expectedExt;
        }
        function importPathToUMDName(path) {
            const predefined = queryWellknownUMD(path);
            if (predefined)
                return predefined;
            const reg = path.match(/[a-zA-Z0-9_]+/g);
            if (!reg)
                return null;
            const x = [...reg].join(" ");
            if (x.length)
                return x.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => index == 0 ? letter.toLowerCase() : letter.toUpperCase()).replace(/\s+/g, "");
            return null;
        }
    }
}
function __dynImport2Ary(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
const a = __bindCheck(global.a, ["default"], "a", "global.a").default;
const b = __bindCheck(global.b, ["default"], "b", "global.b").default;
const { c, d } = __bindCheck(global.b, ["c", "d"], "b", "global.b");
const e = global.c;
const { c_1, d_1 } = __bindCheck(global.b, ["c", "d"], "b", "global.b");
export { c_1 as c, d_1 as d };
const e_1 = global.c;
export { e_1 as e };
console.log('Should run after all imports', a, b, c, d, e, a1, b1, c1, d1, e1, a2, b2, c2, d2, e2);
"import \"d\" is eliminated because it expected to have no side effects.";
// relative import without ext name
import a1 from "./a.js";
import b1, { c1, d1 } from "./b.js";
import * as e1 from "/c.js";
import "./d.js";
// browser style import
import a2 from 'http://example.com/';
import b2, { c2, d2 } from 'https://example.com';
import * as e2 from 'http://example.com/';
import 'http://example.com/';
const x = 1;
export { x };
// relative import without ext name
export { c1, d1 } from "./b.js";
export * as e1 from "./c.js";
// browser style import
export { c2, d2 } from 'http://example.com/';
export * as e2 from 'http://example.com/';
// Static dynamic import
Promise.resolve(global.a);
import("./a.js");
import('https://example.com');
// dynamic dynamic import
const y = '';
__dynImportTransform(y);
// invalid dynamic import (invalid currently)
__dynImport2Ary("This dynamic import has more than 1 arguments and don't know how to transform", y, 'second argument');
