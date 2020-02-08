function __dynamicImportHelper(path) {
    const BareModuleRewriteSimple = { "snowpack": "snowpack", "umd": "umd", "unpkg": "unpkg", "pikacdn": "pikacdn" };
    const parsedRegExpCache = new Map();
    const config = { "after": true, "dynamicImportPathRewrite": { "type": "custom", "function": "x => Promise.reject(x)" } };
    function _(path) { return import(path); }
    const __ = __runtimeTransform(path, _);
    if (__ === null)
        return _(path);
    return __;
    function parseJS(...a) { return null; }
    function __runtimeTransform(path, dyn) {
        const result = moduleSpecifierTransform({ config, path });
        switch (result.type) {
            case "error": return null;
            case "noop": return null;
            case "rewrite": return dyn(result.nextPath);
            case "umd":
                if (config.globalObject === false)
                    return Promise.reject("When using runtime transform, globalObject must be \"globalThis\" or \"window\"");
                if (config.globalObject === "globalThis" || config.globalObject === undefined)
                    return Promise.resolve(globalThis[result.target]);
                if (config.globalObject === "window")
                    return Promise.resolve(window[result.target]);
                return Promise.reject("Unreachable transform case");
            default: return Promise.reject("Unreachable transform case");
        }
    }
    function isBrowserCompatibleModuleSpecifier(path) {
        return isHTTPModuleSpecifier(path) || isLocalModuleSpecifier(path);
    }
    function appendExtname(path, expectedExt) {
        if (path.endsWith(expectedExt))
            return path;
        return path + expectedExt;
    }
    function moduleSpecifierTransform(ctx, opt = ctx.config.bareModuleRewrite) {
        var _a, _b, _c, _d;
        if (opt === false)
            return { type: "noop" };
        const { path, config, ts } = ctx;
        if (isBrowserCompatibleModuleSpecifier(path)) {
            if (config.appendExtensionName === false)
                return { type: "noop" };
            if (config.appendExtensionNameForRemote !== true && isHTTPModuleSpecifier(path))
                return { type: "noop" };
            const nextPath = appendExtname(path, config.appendExtensionName === true ? ".js" : (_a = config.appendExtensionName) !== null && _a !== void 0 ? _a : ".js");
            return { type: "rewrite", nextPath: nextPath };
        }
        switch (opt) {
            case BareModuleRewriteSimple.snowpack:
            case BareModuleRewriteSimple.pikacdn:
            case BareModuleRewriteSimple.unpkg: {
                const table = {
                    [BareModuleRewriteSimple.pikacdn]: "https://cdn.pika.dev/%1", [BareModuleRewriteSimple.unpkg]: "https://unpkg.com/%1?module", [BareModuleRewriteSimple.snowpack]: `${(_b = config.webModulePath) !== null && _b !== void 0 ? _b : "/web_modules/"}%1.js`,
                };
                return { nextPath: table[opt].replace("%1", path), type: "rewrite" };
            }
            case BareModuleRewriteSimple.umd:
            case undefined: {
                const nextPath = __umdNameTransform(path);
                if (!nextPath) {
                    return {
                        type: "error", reason: "Transformer error: Can not transform this module to UMD, please specify it in the config. Module name: " + path,
                    };
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
                            if (literal) {
                                const next = eval(literal.text);
                                parsedRegExpCache.set(rule, next);
                            }
                        }
                    }
                    else if (rule.startsWith("/")) {
                        console.warn("RegExp rule is not supported in runtime due to the risk of eval");
                    }
                    const regexp = parsedRegExpCache.get(rule);
                    if (regexp && path.match(regexp)) {
                        if (typeof ruleValue === "string")
                            return moduleSpecifierTransform(ctx, ruleValue);
                        const nextPath = path.replace(regexp, ruleValue.target);
                        if (!nextPath)
                            return {
                                type: "error", reason: "Cannot transform this.",
                            };
                        return {
                            type: "umd", target: nextPath, globalObject: (_c = ruleValue.globalObject) !== null && _c !== void 0 ? _c : config.globalObject,
                        };
                    }
                    else if (rule === path) {
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
    }
    function isHTTPModuleSpecifier(path) {
        return path.startsWith("http://") || path.startsWith("https://");
    }
    function isLocalModuleSpecifier(path) {
        return path.startsWith(".") || path.startsWith("/");
    }
    function __umdNameTransform(path) {
        const reg = path.match(/[a-zA-Z0-9_]+/g);
        if (!reg)
            return null;
        const x = [...reg].join(" ");
        if (x.length)
            return x.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => index == 0 ? letter.toLowerCase() : letter.toUpperCase()).replace(/\s+/g, "");
        return null;
    }
}
const __customImportHelper_1 = x => Promise
    .reject(x);
function __dynamicImportTransformFailedHelper(reason, ...args) {
    console.warn(reason, ...args);
    return import(args[0], args[1]);
}
Promise.resolve(globalThis.a);
import("./a.js");
const x = '';
__customImportHelper_1(x, __dynamicImportHelper);
__dynamicImportTransformFailedHelper("This dynamic import has more than 1 arguments and don't know how to transform", x, 'y');
